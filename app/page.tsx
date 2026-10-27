import Link from "next/link";

import { TopicCard } from "@/components/TopicCard";
import { OverallProgress } from "@/components/TopicProgressBadge";
import { getBankInfo, getTopics, getTotalQuestions } from "@/lib/quiz-data";
import type { TopicSummary } from "@/lib/types";

function groupByWeek(topics: TopicSummary[]) {
  const weeks = new Map<number, TopicSummary[]>();
  for (const topic of topics) {
    if (topic.week === null) continue;
    weeks.set(topic.week, [...(weeks.get(topic.week) ?? []), topic]);
  }
  return [...weeks.entries()].sort(([a], [b]) => a - b);
}

export default function Home() {
  const topics = getTopics();
  const { pendingTopics } = getBankInfo();
  const sessions = topics.filter((t) => t.category === "session");
  const studyTours = topics.filter((t) => t.category === "study-tour");

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          42nd PSMG Comprehensive Exam
        </h1>
        <p className="max-w-2xl text-muted">
          50 MCQs for each presentation and study tour report so far. Pick a topic, answer each
          question and see straight away whether you were right. Wrong answers are saved so you can
          retry just those.
        </p>
        <OverallProgress slugs={topics.map((t) => t.slug)} totalQuestions={getTotalQuestions()} />
        <div className="flex flex-wrap gap-2">
          <Link
            href="/mock-exam"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:opacity-90"
          >
            Take a mock exam
          </Link>
          <Link href="/glossary" className="rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-border hover:bg-surface">
            Look up an abbreviation
          </Link>
        </div>
      </section>

      {groupByWeek(sessions).map(([week, weekTopics]) => (
        <section key={week} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Week {week}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {weekTopics.map((topic) => (
              <TopicCard key={topic.slug} topic={topic} />
            ))}
          </div>
        </section>
      ))}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Study tours</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {studyTours.map((topic) => (
            <TopicCard key={topic.slug} topic={topic} />
          ))}
        </div>
      </section>

      <details className="rounded-xl border border-dashed border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          {pendingTopics.length} topics still awaiting material
        </summary>
        <ul className="mt-3 flex flex-wrap gap-2">
          {pendingTopics.map((t) => (
            <li key={t} className="rounded-full bg-surface px-3 py-1 text-xs text-muted ring-1 ring-border">
              {t}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
