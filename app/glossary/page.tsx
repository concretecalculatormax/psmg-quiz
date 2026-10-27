import type { Metadata } from "next";

import { GlossarySearch } from "@/components/GlossarySearch";
import { getGlossary } from "@/lib/quiz-data";

export const metadata: Metadata = {
  title: "Abbreviations",
  description: "Every abbreviation from the course material with its full form.",
};

export default function GlossaryPage() {
  const groups = getGlossary();
  const total = groups.reduce((sum, g) => sum + g.entries.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Abbreviations</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {total} abbreviations from the presentations, study tour reports and timetables, grouped by
          topic. † marks a standard full form the source used without spelling out.
        </p>
      </div>
      <GlossarySearch groups={groups} />
    </div>
  );
}
