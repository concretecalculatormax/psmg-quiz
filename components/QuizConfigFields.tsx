"use client";

import type { QuizConfig } from "@/components/useQuizFlow";
import { describeTimeLimit, SECONDS_PER_QUESTION_OPTIONS, type QuizMode } from "@/lib/quiz-run";

const MODES: { value: QuizMode; title: string; description: string }[] = [
  { value: "practice", title: "Practice", description: "See if you're right after every question." },
  { value: "exam", title: "Exam", description: "Answers revealed at the end. Optional timer." },
];

const SHUFFLE_FIELDS = [
  ["shuffleQuestions", "Shuffle question order"],
  ["shuffleOptions", "Shuffle answer choices"],
] as const;

export function QuizConfigFields({
  config,
  onChange,
  questionCount,
  showModes = true,
  showQuestionShuffle = true,
}: {
  config: QuizConfig;
  onChange: (config: QuizConfig) => void;
  questionCount: number;
  showModes?: boolean;
  showQuestionShuffle?: boolean;
}) {
  const set = <K extends keyof QuizConfig>(key: K, value: QuizConfig[K]) => onChange({ ...config, [key]: value });

  return (
    <div className="flex flex-col gap-5">
      {showModes && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Mode</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODES.map((m) => (
              <label
                key={m.value}
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                  config.mode === m.value ? "border-accent bg-accent-soft" : "border-border hover:border-accent"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m.value}
                  checked={config.mode === m.value}
                  onChange={() => set("mode", m.value)}
                  className="mt-0.5 accent-accent"
                />
                <span>
                  <span className="font-medium">{m.title}</span>
                  <span className="block text-muted">{m.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {config.mode === "exam" && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Time limit</span>
          <select
            value={config.secondsPerQuestion}
            onChange={(e) => set("secondsPerQuestion", Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 sm:w-80"
          >
            {SECONDS_PER_QUESTION_OPTIONS.map((sec) => (
              <option key={sec} value={sec}>
                {describeTimeLimit(sec, questionCount)}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Order</legend>
        {SHUFFLE_FIELDS.filter(([key]) => showQuestionShuffle || key !== "shuffleQuestions").map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={config[key]}
              onChange={(e) => set(key, e.target.checked)}
              className="size-4 accent-accent"
            />
            {label}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
