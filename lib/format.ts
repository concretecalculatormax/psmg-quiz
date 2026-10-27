import type { TopicSummary } from "@/lib/types";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(`${iso}T00:00:00Z`));
}

/** "Week 2", "Group II study tour", plus presenter/date when known. */
export function topicMeta(topic: Pick<TopicSummary, "week" | "group" | "presenter" | "date">): string[] {
  const parts: string[] = [];
  if (topic.week !== null) parts.push(`Week ${topic.week}`);
  if (topic.group !== null) parts.push(`Group ${topic.group}`);
  if (topic.presenter) parts.push(topic.presenter);
  if (topic.date) parts.push(formatDate(topic.date));
  return parts;
}
