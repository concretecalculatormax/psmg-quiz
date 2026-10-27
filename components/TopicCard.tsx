import Link from "next/link";

import { TopicProgressBadge } from "@/components/TopicProgressBadge";
import { topicMeta } from "@/lib/format";
import type { TopicSummary } from "@/lib/types";

export function TopicCard({ topic }: { topic: TopicSummary }) {
  return (
    <Link
      href={`/topics/${topic.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-accent hover:shadow-sm focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-xs text-muted">Topic {topic.id}</span>
        <TopicProgressBadge slug={topic.slug} />
      </div>
      <h3 className="font-semibold leading-snug group-hover:text-accent">{topic.title}</h3>
      <p className="mt-auto text-xs text-muted">
        {topicMeta(topic).join(" · ")} · {topic.questionCount} questions
      </p>
    </Link>
  );
}
