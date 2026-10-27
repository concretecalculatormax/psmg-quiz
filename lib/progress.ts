"use client";

import { useSyncExternalStore } from "react";

// Per-browser quiz progress, kept in localStorage until accounts arrive in Phase 3.

export interface TopicScore {
  attempts: number;
  bestPercent: number;
  lastPercent: number;
  lastAttemptAt: string;
}

export interface MissedQuestion {
  topicSlug: string;
  times: number;
  lastMissedAt: string;
}

export interface MockExamRecord {
  at: string;
  correct: number;
  total: number;
  durationSec: number;
  topicCount: number;
  timedOut: boolean;
}

export interface ProgressState {
  /** Scores from full runs of a topic (practice or exam). */
  topics: Record<string, TopicScore>;
  /** Review list: questions answered wrong and not yet answered right since. Keyed by question id. */
  missed: Record<string, MissedQuestion>;
  mockExams: MockExamRecord[];
}

export interface AnsweredQuestion {
  id: string;
  topicSlug: string;
  correct: boolean;
}

const STORAGE_KEY = "psmg-quiz:progress:v2";
const MOCK_HISTORY_LIMIT = 20;
const EMPTY: ProgressState = { topics: {}, missed: {}, mockExams: [] };
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedValue: ProgressState = EMPTY;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): ProgressState {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<ProgressState>) } : EMPTY;
    } catch {
      cachedValue = EMPTY;
    }
  }
  return cachedValue;
}

function getServerSnapshot(): ProgressState {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: ProgressState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota); progress just isn't saved.
  }
  listeners.forEach((l) => l());
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Question ids on the review list for one topic, in question order. */
export function missedIdsForTopic(state: ProgressState, slug: string): string[] {
  return Object.keys(state.missed)
    .filter((id) => state.missed[id].topicSlug === slug)
    .sort();
}

/** Wrong answers join the review list; right answers take a question off it. */
export function recordAnswers(answers: AnsweredQuestion[]): void {
  if (answers.length === 0) return;
  const state = getSnapshot();
  const missed = { ...state.missed };
  const now = new Date().toISOString();
  for (const a of answers) {
    if (a.correct) {
      delete missed[a.id];
    } else {
      missed[a.id] = { topicSlug: a.topicSlug, times: (missed[a.id]?.times ?? 0) + 1, lastMissedAt: now };
    }
  }
  write({ ...state, missed });
}

export function recordTopicScore(slug: string, correct: number, total: number): void {
  if (total === 0) return;
  const state = getSnapshot();
  const prev = state.topics[slug];
  const percent = Math.round((correct / total) * 100);
  write({
    ...state,
    topics: {
      ...state.topics,
      [slug]: {
        attempts: (prev?.attempts ?? 0) + 1,
        bestPercent: Math.max(prev?.bestPercent ?? 0, percent),
        lastPercent: percent,
        lastAttemptAt: new Date().toISOString(),
      },
    },
  });
}

export function recordMockExam(record: MockExamRecord): void {
  const state = getSnapshot();
  write({ ...state, mockExams: [record, ...state.mockExams].slice(0, MOCK_HISTORY_LIMIT) });
}

export function removeFromReview(ids: string[]): void {
  const state = getSnapshot();
  const missed = { ...state.missed };
  ids.forEach((id) => delete missed[id]);
  write({ ...state, missed });
}

export function resetTopic(slug: string): void {
  const state = getSnapshot();
  const topics = { ...state.topics };
  delete topics[slug];
  const missed = Object.fromEntries(Object.entries(state.missed).filter(([, m]) => m.topicSlug !== slug));
  write({ ...state, topics, missed });
}
