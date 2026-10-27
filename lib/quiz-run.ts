import type { AnsweredQuestion } from "@/lib/progress";
import { shuffle } from "@/lib/shuffle";
import { OPTION_KEYS, type OptionKey, type Question, type Topic } from "@/lib/types";

export type QuizMode = "practice" | "exam";

export type TopicRef = Pick<Topic, "id" | "slug" | "title">;

export interface QuizEntry {
  question: Question;
  topic: TopicRef;
}

export interface RunItem extends QuizEntry {
  /** Original option keys in the order they are shown; shown as A–D by position. */
  order: OptionKey[];
}

export interface RunOptions {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export interface QuizOutcome {
  mode: QuizMode;
  items: RunItem[];
  answers: Record<string, OptionKey>;
  durationSec: number;
  timedOut: boolean;
}

export interface TopicBreakdown {
  topic: TopicRef;
  correct: number;
  total: number;
}

/** Seconds per question offered for timed exams; 0 means untimed. */
export const SECONDS_PER_QUESTION_OPTIONS = [0, 30, 60, 90] as const;

export function buildRun(entries: QuizEntry[], options: RunOptions): RunItem[] {
  const ordered = options.shuffleQuestions ? shuffle(entries) : entries;
  return ordered.map((entry) => ({
    ...entry,
    order: options.shuffleOptions ? shuffle(OPTION_KEYS) : [...OPTION_KEYS],
  }));
}

/** Picks `count` questions spread as evenly as possible across the given topics. */
export function sampleAcrossTopics(pools: QuizEntry[][], count: number): QuizEntry[] {
  const queues = shuffle(pools.filter((p) => p.length > 0).map((p) => shuffle(p)));
  const picked: QuizEntry[] = [];
  while (picked.length < count && queues.some((q) => q.length > 0)) {
    for (const queue of queues) {
      const next = queue.pop();
      if (next) picked.push(next);
      if (picked.length === count) break;
    }
  }
  return picked;
}

export function isCorrect(item: RunItem, answers: Record<string, OptionKey>): boolean {
  return answers[item.question.id] === item.question.answer;
}

export function summarize(outcome: QuizOutcome) {
  const { items, answers } = outcome;
  const answered = items.filter((item) => answers[item.question.id]);
  const correct = answered.filter((item) => isCorrect(item, answers)).length;
  // Practice runs score only what was answered; exams count blanks as wrong.
  const scoredOutOf = outcome.mode === "exam" ? items.length : answered.length;

  const byTopic = new Map<string, TopicBreakdown>();
  for (const item of items) {
    const row = byTopic.get(item.topic.slug) ?? { topic: item.topic, correct: 0, total: 0 };
    row.total += 1;
    if (isCorrect(item, answers)) row.correct += 1;
    byTopic.set(item.topic.slug, row);
  }

  return {
    correct,
    answered: answered.length,
    unanswered: items.length - answered.length,
    scoredOutOf,
    percent: scoredOutOf ? Math.round((correct / scoredOutOf) * 100) : 0,
    byTopic: [...byTopic.values()],
  };
}

export function answeredQuestions(outcome: QuizOutcome): AnsweredQuestion[] {
  return outcome.items
    .filter((item) => outcome.answers[item.question.id])
    .map((item) => ({
      id: item.question.id,
      topicSlug: item.topic.slug,
      correct: isCorrect(item, outcome.answers),
    }));
}

export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return h ? `${h}:${mm}:${String(s).padStart(2, "0")}` : `${mm}:${String(s).padStart(2, "0")}`;
}

export function describeTimeLimit(secondsPerQuestion: number, questionCount: number): string {
  if (!secondsPerQuestion) return "No time limit";
  const totalMin = Math.round((secondsPerQuestion * questionCount) / 60);
  const per = secondsPerQuestion < 60 ? `${secondsPerQuestion} s` : `${secondsPerQuestion / 60} min`;
  return `${per} per question (${totalMin} min total)`;
}
