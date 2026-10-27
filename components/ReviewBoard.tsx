"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { ActionButton, QuizResults } from "@/components/QuizResults";
import { QuizSession } from "@/components/QuizSession";
import { useQuizFlow, type QuizConfig } from "@/components/useQuizFlow";
import { recordAnswers, removeFromReview, useProgress } from "@/lib/progress";
import { answeredQuestions, isCorrect, type QuizEntry } from "@/lib/quiz-run";
import { fetchTopics } from "@/lib/topic-client";
import type { Topic } from "@/lib/types";

const PRACTICE: QuizConfig = { mode: "practice", shuffleQuestions: true, shuffleOptions: true, secondsPerQuestion: 0 };

const noopSubscribe = () => () => {};

/** False during server render and hydration, so we don't flash an empty review list. */
function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function ReviewBoard() {
  const isClient = useIsClient();
  const { missed } = useProgress();
  const [loaded, setLoaded] = useState<Record<string, Topic>>({});
  const [error, setError] = useState<string | null>(null);
  const flow = useQuizFlow((outcome) => recordAnswers(answeredQuestions(outcome)));

  const slugs = [...new Set(Object.values(missed).map((m) => m.topicSlug))].sort();
  const slugKey = slugs.join(",");

  useEffect(() => {
    const needed = slugKey ? slugKey.split(",") : [];
    if (needed.length === 0) return;
    let cancelled = false;
    fetchTopics(needed)
      .then((topics) => {
        if (cancelled) return;
        setLoaded(Object.fromEntries(topics.map((t) => [t.slug, t])));
        setError(null);
      })
      .catch((err: unknown) => {
        console.error("Loading review questions failed", err);
        if (!cancelled) setError("Couldn't load the questions. Check your connection and reload.");
      });
    return () => {
      cancelled = true;
    };
  }, [slugKey]);

  // The list renders after the fetch, so honour /review#<topic-slug> once it's there.
  const ready = slugs.every((s) => loaded[s]);
  useEffect(() => {
    if (ready && window.location.hash) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
    }
  }, [ready]);

  if (flow.state.phase === "running") {
    const { key, ...run } = flow.state.run;
    return <QuizSession key={key} {...run} onFinish={flow.finish} />;
  }

  if (flow.state.phase === "results") {
    const { outcome } = flow.state;
    const stillMissed = outcome.items.filter((item) => !isCorrect(item, outcome.answers));
    return (
      <QuizResults
        outcome={outcome}
        actions={
          <>
            {stillMissed.length > 0 && (
              <ActionButton primary onClick={() => flow.start(stillMissed, PRACTICE)}>
                Practise the {stillMissed.length} missed again
              </ActionButton>
            )}
            <ActionButton onClick={flow.reset}>Back to review list</ActionButton>
          </>
        }
      />
    );
  }

  if (!isClient) {
    return <p className="text-sm text-muted">Loading your review list…</p>;
  }

  if (slugs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
        <p className="font-medium">Nothing to review</p>
        <p className="max-w-md text-sm text-muted">
          Questions you answer wrong in any quiz or mock exam show up here until you get them right.
        </p>
        <Link href="/" className="text-sm text-accent hover:underline">
          Pick a topic →
        </Link>
      </div>
    );
  }

  if (error) return <p className="text-sm text-wrong">{error}</p>;
  if (!ready) return <p className="text-sm text-muted">Loading questions…</p>;

  const groups = slugs
    .map((slug) => {
      const topic = loaded[slug];
      const ref = { id: topic.id, slug: topic.slug, title: topic.title };
      const entries: QuizEntry[] = topic.questions
        .filter((q) => missed[q.id])
        .map((question) => ({ question, topic: ref }));
      return { topic, entries };
    })
    .filter((g) => g.entries.length > 0)
    .sort((a, b) => a.topic.id - b.topic.id);
  const allEntries = groups.flatMap((g) => g.entries);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          <strong className="text-lg tabular-nums">{allEntries.length}</strong> question
          {allEntries.length === 1 ? "" : "s"} across {groups.length} topic{groups.length === 1 ? "" : "s"}
        </p>
        <ActionButton primary onClick={() => flow.start(allEntries, PRACTICE)}>
          Practise all {allEntries.length}
        </ActionButton>
      </div>

      {groups.map(({ topic, entries }) => (
        <section key={topic.slug} id={topic.slug} className="flex scroll-mt-4 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              <Link href={`/topics/${topic.slug}`} className="hover:text-accent">
                <span className="mr-2 font-mono text-xs text-muted">Topic {topic.id}</span>
                {topic.title}
              </Link>
            </h2>
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => flow.start(entries, PRACTICE)}
                className="rounded-lg px-3 py-1.5 font-medium text-accent ring-1 ring-accent hover:bg-accent-soft"
              >
                Practise these {entries.length}
              </button>
            </div>
          </div>
          <ol className="flex flex-col gap-2">
            {entries.map(({ question }) => (
              <li key={question.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">
                    <span className="mr-2 font-mono text-xs text-muted">Q{question.number}</span>
                    {question.text}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFromReview([question.id])}
                    className="shrink-0 rounded-md px-2 py-1 text-xs text-muted ring-1 ring-border hover:text-correct hover:ring-correct"
                    title="Remove from review list"
                  >
                    Got it ✓
                  </button>
                </div>
                <details className="mt-2 group">
                  <summary className="cursor-pointer text-xs text-accent select-none">Show answer</summary>
                  <p className="mt-2 text-correct">
                    {question.answer}) {question.options[question.answer]}
                  </p>
                </details>
                <p className="mt-2 text-xs text-muted">
                  Missed {missed[question.id].times}×
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
