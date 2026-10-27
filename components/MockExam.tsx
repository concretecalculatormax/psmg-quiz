"use client";

import { useState } from "react";

import { QuizConfigFields } from "@/components/QuizConfigFields";
import { ActionButton, ActionLink, QuizResults } from "@/components/QuizResults";
import { QuizSession } from "@/components/QuizSession";
import { useQuizFlow, type QuizConfig } from "@/components/useQuizFlow";
import { formatDate } from "@/lib/format";
import { recordAnswers, recordMockExam, useProgress } from "@/lib/progress";
import {
  answeredQuestions,
  formatDuration,
  isCorrect,
  sampleAcrossTopics,
  summarize,
  type QuizOutcome,
} from "@/lib/quiz-run";
import { fetchTopics } from "@/lib/topic-client";
import type { TopicSummary } from "@/lib/types";

const QUESTION_COUNTS = [25, 50, 100, 200] as const;

type MockTopic = Pick<TopicSummary, "id" | "slug" | "title" | "category" | "questionCount">;

export function MockExam({ topics }: { topics: MockTopic[] }) {
  const { mockExams } = useProgress();
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(topics.map((t) => t.slug)));
  const [count, setCount] = useState<number>(50);
  const [config, setConfig] = useState<QuizConfig>({
    mode: "exam",
    shuffleQuestions: true,
    shuffleOptions: false,
    secondsPerQuestion: 60,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flow = useQuizFlow((outcome: QuizOutcome) => {
    recordAnswers(answeredQuestions(outcome));
    const summary = summarize(outcome);
    recordMockExam({
      at: new Date().toISOString(),
      correct: summary.correct,
      total: outcome.items.length,
      durationSec: outcome.durationSec,
      topicCount: summary.byTopic.length,
      timedOut: outcome.timedOut,
    });
  });

  const available = topics.filter((t) => selected.has(t.slug)).reduce((sum, t) => sum + t.questionCount, 0);
  const questionCount = Math.min(count, available);

  function selectWhere(predicate: (t: MockTopic) => boolean) {
    setSelected(new Set(topics.filter(predicate).map((t) => t.slug)));
  }

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function start() {
    setLoading(true);
    setError(null);
    let loaded;
    try {
      loaded = await fetchTopics(topics.filter((t) => selected.has(t.slug)).map((t) => t.slug));
    } catch (err) {
      console.error("Loading mock exam questions failed", err);
      setError("Couldn't load the questions. Check your connection and try again.");
      return;
    } finally {
      setLoading(false);
    }
    const pools = loaded.map((topic) =>
      topic.questions.map((question) => ({ question, topic: { id: topic.id, slug: topic.slug, title: topic.title } })),
    );
    // Sampling is round-robin by topic, so always shuffle the final order.
    flow.start(sampleAcrossTopics(pools, questionCount), { ...config, shuffleQuestions: true });
  }

  if (flow.state.phase === "running") {
    const { key, ...run } = flow.state.run;
    return <QuizSession key={key} {...run} onFinish={flow.finish} />;
  }

  if (flow.state.phase === "results") {
    const { outcome } = flow.state;
    const missed = outcome.items.filter((item) => !isCorrect(item, outcome.answers));
    return (
      <QuizResults
        outcome={outcome}
        actions={
          <>
            {missed.length > 0 && (
              <ActionButton primary onClick={() => flow.start(missed, { ...config, mode: "practice" })}>
                Practise the {missed.length} missed
              </ActionButton>
            )}
            <ActionButton onClick={flow.reset}>New mock exam</ActionButton>
            <ActionLink href="/review">Review list</ActionLink>
          </>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Number of questions</legend>
          <div className="flex flex-wrap gap-2">
            {QUESTION_COUNTS.map((n) => (
              <label
                key={n}
                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium tabular-nums ring-1 ${
                  count === n ? "bg-accent-soft text-accent ring-accent" : "ring-border hover:ring-accent"
                }`}
              >
                <input
                  type="radio"
                  name="count"
                  value={n}
                  checked={count === n}
                  onChange={() => setCount(n)}
                  className="sr-only"
                />
                {n}
              </label>
            ))}
          </div>
          {questionCount < count && (
            <p className="mt-2 text-xs text-muted">Only {available} questions in the selected topics.</p>
          )}
        </fieldset>

        <QuizConfigFields
          config={config}
          onChange={setConfig}
          questionCount={questionCount}
          showModes={false}
          showQuestionShuffle={false}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Topics <span className="font-normal text-muted">({selected.size} of {topics.length})</span>
          </legend>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {(
              [
                ["All", () => true],
                ["Sessions", (t: MockTopic) => t.category === "session"],
                ["Study tours", (t: MockTopic) => t.category === "study-tour"],
                ["None", () => false],
              ] as const
            ).map(([label, predicate]) => (
              <button
                key={label}
                type="button"
                onClick={() => selectWhere(predicate)}
                className="rounded-full px-3 py-1 ring-1 ring-border hover:ring-accent"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {topics.map((t) => (
              <label key={t.slug} className="flex items-start gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-background">
                <input
                  type="checkbox"
                  checked={selected.has(t.slug)}
                  onChange={() => toggle(t.slug)}
                  className="mt-0.5 size-4 shrink-0 accent-accent"
                />
                <span>
                  <span className="mr-1.5 font-mono text-xs text-muted">{t.id}</span>
                  {t.title}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={start}
            disabled={loading || questionCount === 0}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-surface hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Loading questions…" : `Start ${questionCount}-question exam`}
          </button>
          {error && <p className="text-sm text-wrong">{error}</p>}
        </div>
      </section>

      {mockExams.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Recent mock exams</h2>
          <ul className="overflow-hidden rounded-xl border border-border bg-surface text-sm">
            {mockExams.slice(0, 5).map((m) => {
              const pct = Math.round((m.correct / m.total) * 100);
              return (
                <li key={m.at} className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 first:border-t-0">
                  <span className="text-muted">{formatDate(m.at.slice(0, 10))}</span>
                  <span className="text-muted">
                    {m.total} questions · {m.topicCount} topics · {formatDuration(m.durationSec)}
                    {m.timedOut && " · timed out"}
                  </span>
                  <span className="font-semibold tabular-nums">{pct}%</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
