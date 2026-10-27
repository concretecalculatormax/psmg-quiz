// Shapes of data/quiz-bank.json, produced by scripts/extract_pdf.py.

export const OPTION_KEYS = ["A", "B", "C", "D"] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

export interface Question {
  id: string; // "t01-q13"
  number: number;
  text: string;
  options: Record<OptionKey, string>;
  answer: OptionKey;
}

export interface Topic {
  id: number;
  slug: string;
  title: string;
  category: "session" | "study-tour";
  week: number | null;
  group: string | null; // study tour group, e.g. "II"
  presenter: string | null;
  date: string | null; // ISO yyyy-mm-dd
  summary: string;
  questions: Question[];
}

export type TopicSummary = Omit<Topic, "questions"> & { questionCount: number };

export interface GlossaryEntry {
  abbr: string;
  full: string | null;
  inferred: boolean; // full form not spelled out in the source
  note: string | null;
}

export interface GlossaryGroup {
  title: string;
  topicId: number | null;
  entries: GlossaryEntry[];
}

export interface QuizBank {
  title: string;
  source: string;
  pendingTopics: string[];
  topics: Topic[];
  glossary: GlossaryGroup[];
}
