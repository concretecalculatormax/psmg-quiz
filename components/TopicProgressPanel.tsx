"use client";

import Link from "next/link";

import { missedIdsForTopic, resetTopic, useProgress } from "@/lib/progress";

export function TopicProgressPanel({ slug, questionCount }: { slug: string; questionCount: number }) {
  const progress = useProgress();
  const score = progress.topics[slug];
  const reviewCount = missedIdsForTopic(progress, slug).length;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">{questionCount} questions · practice or timed exam</p>
        {score ? (
          <p className="text-sm">
            Best <strong>{score.bestPercent}%</strong> · last {score.lastPercent}% · {score.attempts} attempt
            {score.attempts === 1 ? "" : "s"}
          </p>
        ) : (
          <p className="text-sm">You haven&apos;t done a full run of this topic yet.</p>
        )}
        {reviewCount > 0 && (
          <Link href={`/review#${slug}`} className="text-sm text-accent hover:underline">
            {reviewCount} question{reviewCount === 1 ? "" : "s"} on your review list →
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/topics/${slug}/quiz`}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:opacity-90"
        >
          {score ? "Take it again" : "Start quiz"}
        </Link>
        {(score || reviewCount > 0) && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear your score and review list for this topic?")) resetTopic(slug);
            }}
            className="rounded-lg px-4 py-2 text-sm text-muted ring-1 ring-border hover:text-wrong"
          >
            Reset progress
          </button>
        )}
      </div>
    </section>
  );
}
