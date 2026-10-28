"""Extract the PSMG MCQ bank PDF into data/quiz-bank.json.

Usage:
    python scripts/extract_pdf.py [PDF] [--out data/quiz-bank.json]

The PDF uses fonts consistently, so parsing keys off span styles rather than
plain-text layout:
    bold 12pt      "Topic N · Title"            topic heading
    italic         "Week N · ..." / "Group-X"   topic meta (first span after heading)
    bold-italic    "Qn. ..."                    question stem (may wrap)
    bold-italic    "A)" .. "D)"                 option labels, two per line
    italic         option text (wraps onto the next line under the last option)
    bold 11pt      "Answer Key — Topic N ..."   followed by "n → X" cells
    bold 12pt      "Abbreviations & Full Forms" start of the glossary appendix

Topics written by hand for presentations that are not in the PDF live in
data/extra-topics.json. They are appended after the PDF topics, their glossary
groups after the PDF glossary, and each one's "coversPending" entry is removed
from the pending list.

The script validates everything it extracts and exits non-zero on any problem,
so a bad parse never silently reaches the app.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PDF = ROOT / "42nd PSMG Comprehensive Exam — MCQ Bank.pdf"
DEFAULT_OUT = ROOT / "data" / "quiz-bank.json"
EXTRA_TOPICS = ROOT / "data" / "extra-topics.json"

EXPECTED_TOPICS = 23  # in the PDF; extra topics are counted on top
QUESTIONS_PER_TOPIC = 50
OPTION_KEYS = ("A", "B", "C", "D")

# The PDF's fonts map common ligatures to odd code points.
LIGATURES = {
    "Ɵ": "ti",  # Ɵ
    "Ʃ": "tt",  # Ʃ
    "Ō": "ft",  # Ō
    "ﬀ": "ff",
    "ﬁ": "fi",
    "ﬂ": "fl",
    "ﬃ": "ffi",
    "ﬄ": "ffl",
}
LIGATURE_RE = re.compile("|".join(map(re.escape, LIGATURES)))

BOLD = 16
ITALIC = 2

TOPIC_RE = re.compile(r"^Topic (\d+) · (.+)$")
QUESTION_RE = re.compile(r"^Q(\d+)\.\s*(.*)$", re.S)
OPTION_LABEL_RE = re.compile(r"^([A-D])\)$")
ANSWER_KEY_RE = re.compile(r"^Answer Key — Topic (\d+)")
ANSWER_CELL_RE = re.compile(r"(\d+)\s*→\s*([A-D])\b")
DATE_RE = re.compile(r"^(\d{2})\.(\d{2})\.(\d{4})$")


@dataclass
class Span:
    text: str
    size: float
    flags: int

    @property
    def bold(self) -> bool:
        return bool(self.flags & BOLD)

    @property
    def italic(self) -> bool:
        return bool(self.flags & ITALIC)


@dataclass
class Line:
    page: int
    block: int
    x: float
    y: float
    spans: list[Span]

    @property
    def text(self) -> str:
        return "".join(s.text for s in self.spans)


def fix_text(text: str) -> str:
    return LIGATURE_RE.sub(lambda m: LIGATURES[m.group(0)], text)


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def read_lines(pdf_path: Path) -> list[Line]:
    lines: list[Line] = []
    with pymupdf.open(pdf_path) as doc:
        for page_no, page in enumerate(doc, start=1):
            for block_no, block in enumerate(page.get_text("dict")["blocks"]):
                for raw in block.get("lines", []):
                    spans = [
                        Span(fix_text(s["text"]), round(s["size"], 1), s["flags"])
                        for s in raw["spans"]
                    ]
                    if any(s.text.strip() for s in spans):
                        x, y = raw["bbox"][:2]
                        lines.append(Line(page_no, block_no, x, y, spans))
    return lines


def is_heading(line: Line, size: float) -> bool:
    first = line.spans[0]
    return first.bold and not first.italic and abs(first.size - size) < 0.5


def slugify(text: str) -> str:
    text = text.lower().replace("&", "and")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def parse_meta(label: str, title: str) -> dict:
    """Split "Week 2 · Prof. X · 17.09.2026" or "Group-II · 20.10.2026"."""
    parts = [clean(p) for p in label.split("·")]
    meta: dict = {"week": None, "group": None, "presenter": None, "date": None}
    rest: list[str] = []
    for part in parts:
        if m := re.fullmatch(r"Week (\d+)", part):
            meta["week"] = int(m.group(1))
        elif m := re.fullmatch(r"Group-([IVX]+)", part):
            meta["group"] = m.group(1)
        elif m := DATE_RE.match(part):
            d, mo, y = map(int, m.groups())
            meta["date"] = date(y, mo, d).isoformat()
        else:
            rest.append(part)
    meta["presenter"] = " · ".join(rest) or None
    meta["category"] = "study-tour" if title.startswith("Study Tour") else "session"
    return meta


def parse_pending_topics(lines: list[Line]) -> list[str]:
    start = next(i for i, l in enumerate(lines) if l.text.startswith("Topics still awaiting"))
    buf = []
    for line in lines[start:]:
        if TOPIC_RE.match(clean(line.text)):
            break
        buf.append(line.text)
    text = clean(" ".join(buf))
    # Lines break mid-word at hyphens ("PC- 1/Tender"), so rejoin those.
    text = re.sub(r"- (?=\w)", "-", text)
    text = text.split("):", 1)[1]
    text = text.removesuffix(".").replace(
        "Group I and VI study tour reports", "Group I study tour report, Group VI study tour report"
    )
    return [clean(t) for t in text.split(",") if clean(t)]


def parse_mcq_section(lines: list[Line]) -> list[dict]:
    topics: list[dict] = []
    topic: dict | None = None
    question: dict | None = None
    state = "intro"  # intro | meta | stem | options | key
    last_option: str | None = None
    meta_label = ""
    meta_desc: list[str] = []

    def finish_meta() -> None:
        assert topic is not None
        topic.update(parse_meta(meta_label, topic["title"]))
        topic["summary"] = clean(" ".join(meta_desc)).removeprefix("— ").strip()

    for line in lines:
        text = clean(line.text)
        if is_heading(line, 12.2) and (m := TOPIC_RE.match(text)):
            topic = {
                "id": int(m.group(1)),
                "title": m.group(2),
                "questions": [],
                "answerKey": {},
            }
            topics.append(topic)
            state, question, meta_label, meta_desc = "meta", None, "", []
            continue
        if topic is None:
            continue
        if is_heading(line, 11.3) and ANSWER_KEY_RE.match(text):
            state = "key"
            continue

        first = line.spans[0]
        if state == "key":
            for n, letter in ANSWER_CELL_RE.findall(text):
                if n in topic["answerKey"]:
                    raise ValueError(f"Topic {topic['id']}: duplicate answer for Q{n}")
                topic["answerKey"][n] = letter
            continue

        if first.bold and first.italic and (m := QUESTION_RE.match(text)):
            if state == "meta":
                finish_meta()
            question = {"number": int(m.group(1)), "text": m.group(2), "options": {}}
            topic["questions"].append(question)
            state, last_option = "stem", None
            continue

        if state == "meta":
            if not meta_label and first.italic:
                meta_label = first.text
                meta_desc.append("".join(s.text for s in line.spans[1:]))
            else:
                meta_desc.append(line.text)
            continue

        if question is None:
            raise ValueError(f"Unexpected line before any question (page {line.page}): {text!r}")

        has_label = any(s.bold and OPTION_LABEL_RE.match(s.text.strip()) for s in line.spans)
        if state == "stem" and not has_label:
            question["text"] += " " + line.text
            continue

        state = "options"
        # Spans within a line already carry their own spacing (and a repaired
        # ligature sits in its own span), so only separate wrapped lines.
        sep = " "
        for span in line.spans:
            label = OPTION_LABEL_RE.match(span.text.strip()) if span.bold else None
            if label:
                last_option = label.group(1)
                if last_option in question["options"]:
                    raise ValueError(
                        f"Topic {topic['id']} Q{question['number']}: option {last_option} repeated"
                    )
                question["options"][last_option] = ""
            elif last_option is None:
                raise ValueError(
                    f"Topic {topic['id']} Q{question['number']}: text before first option: {text!r}"
                )
            else:
                question["options"][last_option] += sep + span.text
                sep = ""

    for t in topics:
        for q in t["questions"]:
            q["text"] = clean(q["text"])
            q["options"] = {k: clean(v) for k, v in q["options"].items()}
    return topics


def parse_glossary(lines: list[Line], topic_ids: set[int]) -> list[dict]:
    groups: list[dict] = []
    group: dict | None = None
    rows: dict[tuple[int, int], dict] = {}

    for line in lines:
        text = clean(line.text)
        if is_heading(line, 11.3):
            # A heading that wraps ("... (Group" / "II)") continues the previous one.
            if group is not None and not group["entries"] and not text.startswith(("Topic ", "Titles")):
                group["title"] = clean(group["title"] + " " + text)
                continue
            m = TOPIC_RE.match(text)
            group = {
                "title": m.group(2) if m else text,
                "topicId": int(m.group(1)) if m else None,
                "entries": [],
            }
            groups.append(group)
            rows = {}
            continue
        if group is None:
            continue
        if text in ("Abbreviation", "Full Form"):
            continue
        key = (line.page, line.block)
        col = "abbr" if line.x < 200 else "full"
        row = rows.get(key)
        if row is None:
            if col == "full" and group["entries"]:
                # A row split across a page break continues on the next page
                # with only its full-form text.
                row = rows[key] = group["entries"][-1]
            else:
                row = rows[key] = {"abbr": "", "full": ""}
                group["entries"].append(row)
        row[col] = clean(row[col] + " " + line.text)

    for g in groups:
        entries = []
        for row in g["entries"]:
            full = row["full"]
            entries.append(
                {
                    "abbr": row["abbr"],
                    "full": None if full.startswith("Not expanded in source") else full.rstrip("† ").strip(),
                    # † marks a standard full form the source itself did not spell out.
                    "inferred": "†" in full,
                    "note": full if full.startswith("Not expanded in source") else None,
                }
            )
        g["entries"] = entries
        if g["topicId"] is not None and g["topicId"] not in topic_ids:
            raise ValueError(f"Glossary group for unknown topic {g['topicId']}")
    return groups


def build_topics(raw_topics: list[dict]) -> list[dict]:
    topics = []
    for t in raw_topics:
        questions = []
        for q in t["questions"]:
            questions.append(
                {
                    "id": f"t{t['id']:02d}-q{q['number']:02d}",
                    "number": q["number"],
                    "text": q["text"],
                    "options": q["options"],
                    "answer": t["answerKey"].get(str(q["number"])),
                }
            )
        topics.append(
            {
                "id": t["id"],
                "slug": f"{t['id']:02d}-{slugify(t['title'])}",
                "title": t["title"],
                "category": t["category"],
                "week": t["week"],
                "group": t["group"],
                "presenter": t["presenter"],
                "date": t["date"],
                "summary": t["summary"],
                "questions": questions,
                "_answerKeySize": len(t["answerKey"]),
            }
        )
    return topics


def merge_extra(path: Path, topics: list[dict], glossary: list[dict], pending: list[str]) -> list[str]:
    """Append the hand-written topics in `path`; returns the remaining pending topics."""
    extra = json.loads(path.read_text(encoding="utf-8"))["topics"]
    covered = set()
    for t in extra:
        questions = [
            {
                "id": f"t{t['id']:02d}-q{q['number']:02d}",
                "number": q["number"],
                "text": q["text"],
                "options": q["options"],
                "answer": q["answer"],
            }
            for q in t["questions"]
        ]
        topics.append(
            {
                "id": t["id"],
                "slug": f"{t['id']:02d}-{slugify(t['title'])}",
                "title": t["title"],
                "category": t["category"],
                "week": t["week"],
                "group": t["group"],
                "presenter": t["presenter"],
                "date": t["date"],
                "summary": t["summary"],
                "questions": questions,
                "_answerKeySize": len(questions),
            }
        )
        glossary.append({"title": t["glossaryTitle"], "topicId": t["id"], "entries": t["glossary"]})
        if t.get("coversPending"):
            if t["coversPending"] not in pending:
                raise ValueError(f"Extra topic {t['id']}: {t['coversPending']!r} is not a pending topic")
            covered.add(t["coversPending"])
    return [p for p in pending if p not in covered]


def validate(topics: list[dict], glossary: list[dict], expected_count: int) -> list[str]:
    errors: list[str] = []
    ids = [t["id"] for t in topics]
    if ids != list(range(1, expected_count + 1)):
        errors.append(f"Expected topics 1..{expected_count}, got {ids}")
    slugs = [t["slug"] for t in topics]
    if len(set(slugs)) != len(slugs):
        errors.append("Duplicate topic slugs")

    bad_chars = re.compile(r"[�ƟƩŌﬀ-ﬆ]")
    stray_label = re.compile(r"(^|\s)[A-D]\)\s")

    for t in topics:
        where = f"Topic {t['id']}"
        if not t["summary"]:
            errors.append(f"{where}: missing summary")
        if t["week"] is None and t["group"] is None:
            errors.append(f"{where}: no week or group")
        if t.pop("_answerKeySize") != QUESTIONS_PER_TOPIC:
            errors.append(f"{where}: answer key does not have {QUESTIONS_PER_TOPIC} entries")
        numbers = [q["number"] for q in t["questions"]]
        if numbers != list(range(1, QUESTIONS_PER_TOPIC + 1)):
            errors.append(f"{where}: question numbers are {numbers}")
        for q in t["questions"]:
            qwhere = f"{where} Q{q['number']}"
            if not q["text"]:
                errors.append(f"{qwhere}: empty question text")
            if tuple(q["options"]) != OPTION_KEYS:
                errors.append(f"{qwhere}: options {list(q['options'])}")
            for k, v in q["options"].items():
                if not v:
                    errors.append(f"{qwhere}: option {k} is empty")
                if stray_label.search(v):
                    errors.append(f"{qwhere}: option {k} looks like it swallowed another option: {v!r}")
            if len(set(q["options"].values())) != len(q["options"]):
                errors.append(f"{qwhere}: duplicate option text")
            if q["answer"] not in OPTION_KEYS:
                errors.append(f"{qwhere}: answer is {q['answer']!r}")
            blob = q["text"] + " ".join(q["options"].values())
            if bad_chars.search(blob):
                errors.append(f"{qwhere}: unfixed ligature or replacement character")

    covered = {g["topicId"] for g in glossary if g["topicId"] is not None}
    missing = set(ids) - covered
    if missing:
        errors.append(f"Glossary has no section for topics {sorted(missing)}")
    for g in glossary:
        for e in g["entries"]:
            if not e["abbr"]:
                errors.append(f"Glossary '{g['title']}': entry without abbreviation: {e}")
            if e["full"] is None and e["note"] is None:
                errors.append(f"Glossary '{g['title']}': entry {e['abbr']!r} has no full form")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("pdf", nargs="?", type=Path, default=DEFAULT_PDF)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--extra", type=Path, default=EXTRA_TOPICS)
    args = parser.parse_args()

    lines = read_lines(args.pdf)
    title_line = clean(lines[0].text)
    split = next(i for i, l in enumerate(lines) if clean(l.text) == "Abbreviations & Full Forms")

    raw_topics = parse_mcq_section(lines[:split])
    topics = build_topics(raw_topics)
    glossary = parse_glossary(lines[split:], {t["id"] for t in topics})
    if len(topics) != EXPECTED_TOPICS:
        print(f"Validation failed: expected {EXPECTED_TOPICS} topics in the PDF, got {len(topics)}", file=sys.stderr)
        return 1
    pending = merge_extra(args.extra, topics, glossary, parse_pending_topics(lines[:split]))

    errors = validate(topics, glossary, len(topics))
    if errors:
        print(f"Validation failed with {len(errors)} problem(s):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    bank = {
        "title": title_line,
        "source": args.pdf.name,
        "pendingTopics": pending,
        "topics": topics,
        "glossary": glossary,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    total = sum(len(t["questions"]) for t in topics)
    entries = sum(len(g["entries"]) for g in glossary)
    print(f"OK: {len(topics)} topics, {total} questions, {len(glossary)} glossary groups "
          f"({entries} entries), {len(bank['pendingTopics'])} pending topics -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
