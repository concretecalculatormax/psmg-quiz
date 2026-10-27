"use client";

import Link from "next/link";

import { useProgress } from "@/lib/progress";

export function TopicProgressBadge({ slug }: { slug: string }) {
  const score = useProgress().topics[slug];
  if (!score) {
    return <span className="text-xs text-muted">Not started</span>;
  }
  const tone =
    score.bestPercent >= 80
      ? "bg-correct-soft text-correct"
      : score.bestPercent >= 50
        ? "bg-accent-soft text-accent"
        : "bg-wrong-soft text-wrong";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      Best {score.bestPercent}%
    </span>
  );
}

export function OverallProgress({ slugs, totalQuestions }: { slugs: string[]; totalQuestions: number }) {
  const progress = useProgress();
  const attempted = slugs.filter((s) => progress.topics[s]);
  const average = attempted.length
    ? Math.round(attempted.reduce((sum, s) => sum + progress.topics[s].bestPercent, 0) / attempted.length)
    : null;
  const toReview = Object.keys(progress.missed).length;

  const stats = [
    { label: "Topics", value: slugs.length },
    { label: "Questions", value: totalQuestions.toLocaleString("en-US") },
    { label: "Topics attempted", value: `${attempted.length}/${slugs.length}` },
    { label: "Average best score", value: average === null ? "—" : `${average}%` },
    { label: "Questions to review", value: toReview, href: toReview ? "/review" : undefined },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="relative rounded-lg border border-border bg-surface p-3">
          <dt className="text-xs text-muted">{s.label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">
            {s.href ? (
              <Link href={s.href} className="text-accent after:absolute after:inset-0 hover:underline">
                {s.value}
              </Link>
            ) : (
              s.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
