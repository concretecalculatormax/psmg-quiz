# PSMG MCQ Bank

Practice app for the 42nd PSMG Comprehensive Exam: 23 topics × 50 MCQs, built with Next.js (App
Router) and Tailwind CSS. Questions come from `42nd PSMG Comprehensive Exam — MCQ Bank.pdf`.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Updating the questions

The app reads `data/quiz-bank.json`, which is generated from the PDF:

```bash
pip install -r scripts/requirements.txt
npm run extract
```

`scripts/extract_pdf.py` parses topics, questions, answer keys and the abbreviation glossary, then
validates the result (topic count, 50 numbered questions per topic, 4 options each, an A–D answer
for every question, no broken ligatures) and refuses to write the file if anything is off. When a
new topic is added to the PDF, update `EXPECTED_TOPICS` in the script.

## Features

- **Topic quiz** in practice mode (instant feedback) or exam mode (answers hidden until submit,
  question palette, flagging, optional timer that auto-submits).
- **Mock exam**: 25–200 questions spread evenly across chosen topics, timed, with a per-topic
  score breakdown and recent history.
- **Review list**: every question answered wrong anywhere stays here until answered right in a
  later run or marked "Got it".
- **Abbreviations**: searchable glossary of all 500 abbreviations, filterable by topic.

## Layout

```
app/
  page.tsx                        topic list grouped by week, overall progress
  topics/[slug]/page.tsx          topic overview + abbreviations
  topics/[slug]/quiz/page.tsx     topic quiz (practice or exam)
  mock-exam/page.tsx              mixed timed exam across topics
  review/page.tsx                 questions answered wrong
  glossary/page.tsx               searchable abbreviations
  api/questions/route.ts          static JSON of all topics (used by mock exam and review)
components/
  QuizSession.tsx                 one run: practice/exam behaviour, timer, palette (client)
  QuizResults.tsx                 score, per-topic breakdown, answer review
  useQuizFlow.ts                  setup → running → results state
  TopicQuiz.tsx, MockExam.tsx, ReviewBoard.tsx, GlossarySearch.tsx, SiteNav.tsx, …
lib/
  quiz-data.ts                    server-only access to data/quiz-bank.json
  quiz-run.ts                     building runs, sampling across topics, scoring
  progress.ts                     per-browser progress in localStorage
  topic-client.ts                 client fetch of /api/questions (cached, with retry)
scripts/extract_pdf.py            PDF → JSON with validation
```

Every page and the per-topic JSON are prerendered at build time. Progress (scores, review list,
mock exam history) is stored in the browser's localStorage, so it doesn't sync between devices yet.
