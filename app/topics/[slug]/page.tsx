import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TopicProgressPanel } from "@/components/TopicProgressPanel";
import { topicMeta } from "@/lib/format";
import { getTopic, getTopicGlossary, getTopics } from "@/lib/quiz-data";

export function generateStaticParams() {
  return getTopics().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/topics/[slug]">): Promise<Metadata> {
  const topic = getTopic((await params).slug);
  return topic ? { title: topic.title, description: topic.summary } : {};
}

export default async function TopicPage({ params }: PageProps<"/topics/[slug]">) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();
  const glossary = getTopicGlossary(topic.id);

  return (
    <div className="flex flex-col gap-8">
      <Link href="/" className="text-sm text-muted hover:text-accent">
        ← All topics
      </Link>

      <section className="flex flex-col gap-3">
        <p className="font-mono text-xs text-muted">
          Topic {topic.id} · {topicMeta(topic).join(" · ")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{topic.title}</h1>
        <p className="max-w-3xl text-muted">{topic.summary}</p>
      </section>

      <TopicProgressPanel slug={topic.slug} questionCount={topic.questions.length} />

      {glossary && glossary.entries.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Abbreviations in this topic</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-background text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Abbreviation</th>
                  <th className="px-4 py-2 font-medium">Full form</th>
                </tr>
              </thead>
              <tbody>
                {glossary.entries.map((e) => (
                  <tr key={e.abbr} className="border-t border-border align-top">
                    <td className="px-4 py-2 font-medium whitespace-nowrap">{e.abbr}</td>
                    <td className="px-4 py-2">
                      {e.full ?? <span className="text-muted italic">{e.note}</span>}
                      {e.inferred && (
                        <span className="ml-1 text-muted" title="Standard full form; not spelled out in the source">
                          †
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">† Standard official full form; the source used the abbreviation without spelling it out.</p>
        </section>
      )}
    </div>
  );
}
