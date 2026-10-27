import "server-only";

import rawBank from "@/data/quiz-bank.json";
import type { GlossaryGroup, QuizBank, Topic, TopicSummary } from "@/lib/types";

const bank = rawBank as QuizBank;

export function getBankInfo() {
  return { title: bank.title, pendingTopics: bank.pendingTopics };
}

export function getTopics(): TopicSummary[] {
  return bank.topics.map(({ questions, ...topic }) => ({
    ...topic,
    questionCount: questions.length,
  }));
}

export function getAllTopics(): Topic[] {
  return bank.topics;
}

export function getTopic(slug: string): Topic | undefined {
  return bank.topics.find((t) => t.slug === slug);
}

export function getGlossary(): GlossaryGroup[] {
  return bank.glossary;
}

export function getTopicGlossary(topicId: number): GlossaryGroup | undefined {
  return bank.glossary.find((g) => g.topicId === topicId);
}

export function getTotalQuestions(): number {
  return bank.topics.reduce((sum, t) => sum + t.questions.length, 0);
}
