"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { formatDuration, type QuizMode, type QuizOutcome, type RunItem } from "@/lib/quiz-run";
import { OPTION_KEYS, type OptionKey } from "@/lib/types";

const KEY_TO_POSITION: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };

type OptionState = "idle" | "selected" | "correct" | "wrong" | "dimmed";

/**
 * One run through a list of questions.
 * practice: each answer is marked immediately and locked; move forward only.
 * exam: answers stay hidden and can be changed, questions can be flagged and revisited,
 *       an optional deadline auto-submits.
 * Mount with a fresh `key` per run.
 */
export function QuizSession({
  items,
  mode,
  startedAt,
  deadline,
  onFinish,
}: {
  items: RunItem[];
  mode: QuizMode;
  startedAt: number;
  deadline: number | null;
  onFinish: (outcome: QuizOutcome) => void;
}) {
  const isExam = mode === "exam";
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [flagged, setFlagged] = useState<ReadonlySet<string>>(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(startedAt);
  const cardRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);

  const current = items[index];
  const id = current.question.id;
  const chosen = answers[id];
  const locked = !isExam && Boolean(chosen);
  const isLast = index === items.length - 1;
  const answeredCount = Object.keys(answers).length;
  const correctCount = items.filter((item) => answers[item.question.id] === item.question.answer).length;
  const multiTopic = new Set(items.map((item) => item.topic.slug)).size > 1;
  const remainingSec = deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
  const elapsedSec = Math.max(0, Math.floor((now - startedAt) / 1000));

  function finish(timedOut = false) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({
      mode,
      items,
      answers,
      durationSec: Math.round(((timedOut && deadline !== null ? deadline : Date.now()) - startedAt) / 1000),
      timedOut,
    });
  }

  function goTo(i: number) {
    if (i < 0 || i >= items.length) return;
    setIndex(i);
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function choose(position: number) {
    if (locked || confirming) return;
    setAnswers((prev) => ({ ...prev, [id]: current.order[position] }));
  }

  function next() {
    if (confirming) return;
    if (!isExam && !chosen) return;
    if (isLast) {
      if (isExam) setConfirming(true);
      else finish();
    } else {
      goTo(index + 1);
    }
  }

  function toggleFlag() {
    setFlagged((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  }

  const onTick = useEffectEvent(() => {
    const t = Date.now();
    setNow(t);
    if (deadline !== null && t >= deadline) finish(true);
  });

  useEffect(() => {
    if (!isExam) return;
    const timer = window.setInterval(() => onTick(), 1000);
    return () => window.clearInterval(timer);
  }, [isExam]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof HTMLElement && e.target.closest("input, select, textarea")) return;
    const key = e.key.toLowerCase();
    const position = KEY_TO_POSITION[key];
    if (position !== undefined) choose(position);
    else if (key === "enter" || key === "arrowright") next();
    else if (isExam && key === "arrowleft") goTo(index - 1);
    else if (isExam && key === "f") toggleFlag();
    else if (key === "escape") setConfirming(false);
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Warn before leaving mid-exam; the run lives only in memory. beforeunload covers reloads and
  // closing the tab; in-app links navigate client-side, so catch those clicks too.
  useEffect(() => {
    if (!isExam) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (link && !window.confirm("Leave the exam? Your answers may not be kept.")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [isExam]);

  function optionState(key: OptionKey): OptionState {
    if (isExam) return key === chosen ? "selected" : "idle";
    if (!chosen) return "idle";
    if (key === current.question.answer) return "correct";
    return key === chosen ? "wrong" : "dimmed";
  }

  const unanswered = items.length - answeredCount;
  const lowTime = remainingSec !== null && remainingSec <= 60;

  return (
    <section className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-2 text-sm backdrop-blur">
        <span className="font-medium">
          Question {index + 1} <span className="text-muted">of {items.length}</span>
        </span>
        {isExam ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-muted tabular-nums sm:inline">
              {answeredCount}/{items.length} answered
            </span>
            <span
              className={`rounded-md px-2 py-0.5 font-mono tabular-nums ${lowTime ? "bg-wrong-soft text-wrong" : "bg-surface ring-1 ring-border"}`}
              aria-label={remainingSec !== null ? "Time remaining" : "Time elapsed"}
              role="timer"
            >
              {remainingSec !== null ? formatDuration(remainingSec) : formatDuration(elapsedSec)}
            </span>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg bg-accent px-3 py-1 font-medium text-surface hover:opacity-90"
            >
              Submit
            </button>
          </div>
        ) : (
          <span className="text-muted tabular-nums">
            {correctCount}/{answeredCount} correct
          </span>
        )}
      </div>

      {!isExam && <ProgressDots items={items} answers={answers} index={index} />}

      <div
        ref={cardRef}
        className="flex scroll-mt-16 flex-col gap-5 rounded-xl border border-border bg-surface p-5 sm:p-6"
      >
        {multiTopic && (
          <p className="font-mono text-xs text-muted">
            Topic {current.topic.id} · {current.topic.title}
          </p>
        )}
        <h2 className="text-lg leading-snug font-medium">{current.question.text}</h2>
        <ul className="flex flex-col gap-2">
          {current.order.map((key, position) => (
            <li key={key}>
              <OptionButton
                label={OPTION_KEYS[position]}
                text={current.question.options[key]}
                state={optionState(key)}
                disabled={locked}
                onClick={() => choose(position)}
              />
            </li>
          ))}
        </ul>

        {!isExam && chosen && (
          <p
            role="status"
            className={`rounded-lg px-4 py-3 text-sm ${
              chosen === current.question.answer ? "bg-correct-soft text-correct" : "bg-wrong-soft text-wrong"
            }`}
          >
            {chosen === current.question.answer ? (
              "Correct."
            ) : (
              <>
                Not quite. The answer is{" "}
                <strong>
                  {OPTION_KEYS[current.order.indexOf(current.question.answer)]}){" "}
                  {current.question.options[current.question.answer]}
                </strong>
                .
              </>
            )}
          </p>
        )}
      </div>

      {isExam ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-border hover:bg-surface disabled:opacity-40"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={toggleFlag}
            aria-pressed={flagged.has(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ring-1 ${
              flagged.has(id) ? "bg-flag-soft text-flag ring-flag" : "ring-border hover:bg-surface"
            }`}
          >
            {flagged.has(id) ? "⚑ Flagged" : "⚐ Flag"}
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:opacity-90"
          >
            {isLast ? "Finish" : "Next →"}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => finish()}
            className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            End quiz now
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!chosen}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-surface hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLast ? "See results" : "Next question →"}
          </button>
        </div>
      )}

      {isExam && (
        <nav aria-label="Question palette" className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-accent" /> Answered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm ring-2 ring-flag" /> Flagged
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm ring-1 ring-border" /> Not answered
            </span>
          </div>
          <ol className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 md:grid-cols-[repeat(15,minmax(0,1fr))]">
            {items.map((item, i) => {
              const answered = Boolean(answers[item.question.id]);
              const isFlagged = flagged.has(item.question.id);
              return (
                <li key={item.question.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === index ? "step" : undefined}
                    aria-label={`Question ${i + 1}${answered ? ", answered" : ""}${isFlagged ? ", flagged" : ""}`}
                    className={`h-8 w-full rounded-md text-xs font-medium tabular-nums ${
                      answered ? "bg-accent text-surface" : "bg-background"
                    } ${isFlagged ? "ring-2 ring-flag" : "ring-1 ring-border"} ${
                      i === index ? "outline-2 outline-offset-2 outline-foreground" : ""
                    }`}
                  >
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-muted">
            Keys: 1–4 or A–D to answer · ← → to move · F to flag
          </p>
        </nav>
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-20 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-title"
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="submit-title" className="text-lg font-semibold">
              Submit your answers?
            </h2>
            <ul className="mt-2 text-sm text-muted">
              <li>
                {answeredCount} of {items.length} answered
              </li>
              {unanswered > 0 && <li className="text-wrong">{unanswered} not answered (counted as wrong)</li>}
              {flagged.size > 0 && <li className="text-flag">{flagged.size} flagged for review</li>}
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirming(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-border hover:bg-background"
              >
                Keep going
              </button>
              <button
                type="button"
                onClick={() => finish()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:opacity-90"
              >
                Submit now
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function OptionButton({
  label,
  text,
  state,
  disabled,
  onClick,
}: {
  label: string;
  text: string;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
}) {
  const styles = {
    idle: "border-border hover:border-accent hover:bg-accent-soft",
    selected: "border-accent bg-accent-soft ring-1 ring-accent",
    correct: "border-correct bg-correct-soft ring-1 ring-correct",
    wrong: "border-wrong bg-wrong-soft ring-1 ring-wrong",
    dimmed: "border-border opacity-60",
  }[state];
  const badge = {
    idle: "bg-background text-muted",
    selected: "bg-accent text-surface",
    correct: "bg-correct text-surface",
    wrong: "bg-wrong text-surface",
    dimmed: "bg-background text-muted",
  }[state];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === "selected"}
      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition disabled:cursor-default sm:text-base ${styles}`}
    >
      <span className={`grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold ${badge}`}>
        {label}
      </span>
      <span className="pt-0.5">{text}</span>
    </button>
  );
}

function ProgressDots({
  items,
  answers,
  index,
}: {
  items: RunItem[];
  answers: Record<string, OptionKey>;
  index: number;
}) {
  return (
    <div className="flex gap-0.5" aria-hidden>
      {items.map((item, i) => {
        const a = answers[item.question.id];
        const color = !a ? "bg-border" : a === item.question.answer ? "bg-correct" : "bg-wrong";
        return (
          <span
            key={item.question.id}
            className={`h-1.5 flex-1 rounded-full ${color} ${i === index ? "ring-2 ring-accent ring-offset-1 ring-offset-background" : ""}`}
          />
        );
      })}
    </div>
  );
}
