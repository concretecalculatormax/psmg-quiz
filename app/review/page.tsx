import type { Metadata } from "next";

import { ReviewBoard } from "@/components/ReviewBoard";

export const metadata: Metadata = {
  title: "Review",
  description: "Every question you've answered wrong, until you get it right.",
};

export default function ReviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Review list</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Every question you&apos;ve answered wrong in a quiz or mock exam. Answer it right in a practice
          run, or mark it &ldquo;Got it&rdquo;, and it leaves the list.
        </p>
      </div>
      <ReviewBoard />
    </div>
  );
}
