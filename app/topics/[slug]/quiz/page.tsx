import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TopicQuiz } from "@/components/TopicQuiz";
import { getTopic, getTopics } from "@/lib/quiz-data";

export function generateStaticParams() {
  return getTopics().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/topics/[slug]/quiz">): Promise<Metadata> {
  const topic = getTopic((await params).slug);
  return topic ? { title: `Quiz: ${topic.title}` } : {};
}

export default async function TopicQuizPage({ params }: PageProps<"/topics/[slug]/quiz">) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/topics/${topic.slug}`} className="text-sm text-muted hover:text-accent">
        ← Topic {topic.id}: {topic.title}
      </Link>
      <TopicQuiz topic={topic} />
    </div>
  );
}
