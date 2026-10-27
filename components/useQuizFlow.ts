"use client";

import { useState } from "react";

import { buildRun, type QuizEntry, type QuizMode, type QuizOutcome, type RunItem } from "@/lib/quiz-run";

export interface QuizConfig {
  mode: QuizMode;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  /** Exam only; 0 = untimed. */
  secondsPerQuestion: number;
}

export interface ActiveRun {
  key: number;
  items: RunItem[];
  mode: QuizMode;
  startedAt: number;
  deadline: number | null;
}

type FlowState =
  | { phase: "setup" }
  | { phase: "running"; run: ActiveRun }
  | { phase: "results"; outcome: QuizOutcome };

/** setup → running → results, shared by topic quizzes, mock exams and review sessions. */
export function useQuizFlow(onComplete: (outcome: QuizOutcome) => void) {
  const [state, setState] = useState<FlowState>({ phase: "setup" });

  function start(entries: QuizEntry[], config: QuizConfig) {
    const items = buildRun(entries, config);
    const startedAt = Date.now();
    const timed = config.mode === "exam" && config.secondsPerQuestion > 0;
    setState({
      phase: "running",
      run: {
        key: startedAt,
        items,
        mode: config.mode,
        startedAt,
        deadline: timed ? startedAt + config.secondsPerQuestion * items.length * 1000 : null,
      },
    });
    window.scrollTo({ top: 0 });
  }

  function finish(outcome: QuizOutcome) {
    onComplete(outcome);
    setState({ phase: "results", outcome });
    window.scrollTo({ top: 0 });
  }

  function reset() {
    setState({ phase: "setup" });
    window.scrollTo({ top: 0 });
  }

  return { state, start, finish, reset };
}
