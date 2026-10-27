"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { formatDuration, isCorrect, summarize, type QuizOutcome } from "@/lib/quiz-run";
import { OPTION_KEYS, type OptionKey } from "@/lib/types";

export function QuizResults({ outcome, actions }: { outcome: QuizOutcome; actions: ReactNode }) {
  const [showAll, setShowAll] = useState(false);
  const summary = summarize(outcome);
  const { items, answers, mode } = outcome;
  // Practice runs list only what was attempted; exams list blanks too.
  const reviewable = mode === "exam" ? items : items.filter((item) => answers[item.question.id]);
  const shown = showAll ? reviewable : reviewable.filter((item) => !isCorrect(item, answers));
  const multiTopic = summary.byTopic.length > 1;

  const verdict =
    summary.percent >= 80
      ? "Excellent — exam ready."
      : summary.percent >= 60
        ? "Good. Review the misses below."
        : "Keep going — retry the ones you missed.";

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">{mode === "exam" ? "Exam score" : "Your score"}</p>
        <p className="text-5xl font-semibold tabular-nums">{summary.percent}%</p>
        <p className="text-sm">
          {summary.correct} of {summary.scoredOutOf} correct
          {summary.unanswered > 0 && <span className="text-muted"> · {summary.unanswered} not answered</span>}
        </p>
        {mode === "exam" && (
          <p className="text-sm text-muted">
            Time taken {formatDuration(outcome.durationSec)}
            {outcome.timedOut && <span className="ml-2 rounded-full bg-wrong-soft px-2 py-0.5 text-wrong">Time ran out</span>}
          </p>
        )}
        <p className="text-sm text-muted">{verdict}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">{actions}</div>
      </div>

      {multiTopic && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">By topic</h2>
          <ul className="overflow-hidden rounded-xl border border-border bg-surface">
            {[...summary.byTopic]
              .sort((a, b) => a.correct / a.total - b.correct / b.total)
              .map((row) => {
                const pct = Math.round((row.correct / row.total) * 100);
                return (
                  <li key={row.topic.slug} className="flex items-center gap-3 border-t border-border px-4 py-2.5 text-sm first:border-t-0">
                    <Link href={`/topics/${row.topic.slug}`} className="min-w-0 flex-1 truncate hover:text-accent">
                      <span className="mr-2 font-mono text-xs text-muted">{row.topic.id}</span>
                      {row.topic.title}
                    </Link>
                    <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-border sm:block" aria-hidden>
                      <span
                        className={`block h-full ${pct >= 80 ? "bg-correct" : pct >= 50 ? "bg-accent" : "bg-wrong"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-14 text-right tabular-nums">
                      {row.correct}/{row.total}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {reviewable.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{showAll ? "All answers" : "Questions you missed"}</h2>
            <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm text-accent hover:underline">
              {showAll ? "Show only missed" : "Show all answers"}
            </button>
          </div>
          {shown.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">Nothing missed. Well done!</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {shown.map((item) => {
                const { question } = item;
                const mine = answers[question.id] as OptionKey | undefined;
                const ok = mine === question.answer;
                const letter = (key: OptionKey) => OPTION_KEYS[item.order.indexOf(key)];
                return (
                  <li key={question.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
                    {multiTopic && (
                      <p className="mb-1 font-mono text-xs text-muted">
                        Topic {item.topic.id} · {item.topic.title}
                      </p>
                    )}
                    <p className="font-medium">
                      <span className="mr-2 font-mono text-xs text-muted">Q{question.number}</span>
                      {question.text}
                    </p>
                    {mine ? (
                      <p className={`mt-2 ${ok ? "text-correct" : "text-wrong"}`}>
                        {ok ? "✓" : "✗"} Your answer: {letter(mine)}) {question.options[mine]}
                      </p>
                    ) : (
                      <p className="mt-2 text-muted">— Not answered</p>
                    )}
                    {!ok && (
                      <p className="mt-1 text-correct">
                        ✓ Correct: {letter(question.answer)}) {question.options[question.answer]}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
      {reviewable.length === 0 && <p className="text-center text-sm text-muted">No questions were answered.</p>}
    </section>
  );
}

export function ActionButton({
  onClick,
  primary,
  children,
}: {
  onClick: () => void;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:opacity-90"
          : "rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-border hover:bg-background"
      }
    >
      {children}
    </button>
  );
}

export function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-border hover:bg-background">
      {children}
    </Link>
  );
}
