import type { Metadata } from "next";

import { MockExam } from "@/components/MockExam";
import { getTopics } from "@/lib/quiz-data";

export const metadata: Metadata = {
  title: "Mock exam",
  description: "A timed exam with questions drawn from across the course topics.",
};

export default function MockExamPage() {
  const topics = getTopics().map(({ id, slug, title, category, questionCount }) => ({
    id,
    slug,
    title,
    category,
    questionCount,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mock exam</h1>
        <p className="mt-2 max-w-2xl text-muted">
          A timed exam with questions spread evenly across the topics you choose. Answers are revealed
          when you submit, with a score for each topic.
        </p>
      </div>
      <MockExam topics={topics} />
    </div>
  );
}
