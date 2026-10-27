"use client";

import { useState } from "react";

import { QuizConfigFields } from "@/components/QuizConfigFields";
import { ActionButton, ActionLink, QuizResults } from "@/components/QuizResults";
import { QuizSession } from "@/components/QuizSession";
import { useQuizFlow, type QuizConfig } from "@/components/useQuizFlow";
import { missedIdsForTopic, recordAnswers, recordTopicScore, useProgress } from "@/lib/progress";
import { answeredQuestions, isCorrect, summarize, type QuizEntry, type QuizOutcome } from "@/lib/quiz-run";
import type { Topic } from "@/lib/types";

export function TopicQuiz({ topic }: { topic: Topic }) {
  const ref = { id: topic.id, slug: topic.slug, title: topic.title };
  const allEntries: QuizEntry[] = topic.questions.map((question) => ({ question, topic: ref }));

  const progress = useProgress();
  const missedIds = new Set(missedIdsForTopic(progress, topic.slug));
  const reviewEntries = allEntries.filter((e) => missedIds.has(e.question.id));

  const [config, setConfig] = useState<QuizConfig>({
    mode: "practice",
    shuffleQuestions: false,
    shuffleOptions: false,
    secondsPerQuestion: 60,
  });

  const flow = useQuizFlow((outcome: QuizOutcome) => {
    recordAnswers(answeredQuestions(outcome));
    // Only a run through the whole topic counts towards its score.
    if (outcome.items.length === topic.questions.length) {
      const { correct, scoredOutOf } = summarize(outcome);
      recordTopicScore(topic.slug, correct, scoredOutOf);
    }
  });

  if (flow.state.phase === "running") {
    const { key, ...run } = flow.state.run;
    return <QuizSession key={key} {...run} onFinish={flow.finish} />;
  }

  if (flow.state.phase === "results") {
    const { outcome } = flow.state;
    const missed = outcome.items.filter((item) => !isCorrect(item, outcome.answers));
    return (
      <QuizResults
        outcome={outcome}
        actions={
          <>
            {missed.length > 0 && (
              <ActionButton primary onClick={() => flow.start(missed, { ...config, mode: "practice" })}>
                Practise the {missed.length} missed
              </ActionButton>
            )}
            <ActionButton onClick={flow.reset}>Start over</ActionButton>
            <ActionLink href={`/topics/${topic.slug}`}>Back to topic</ActionLink>
          </>
        }
      />
    );
  }

  return (
    <section className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold">{topic.title}</h1>
        <p className="mt-1 text-sm text-muted">{topic.questions.length} questions</p>
      </div>
      <QuizConfigFields config={config} onChange={setConfig} questionCount={topic.questions.length} />
      <div className="flex flex-wrap gap-2">
        <ActionButton primary onClick={() => flow.start(allEntries, config)}>
          Start all {topic.questions.length} questions
        </ActionButton>
        {reviewEntries.length > 0 && (
          <ActionButton onClick={() => flow.start(reviewEntries, config)}>
            Only the {reviewEntries.length} on my review list
          </ActionButton>
        )}
      </div>
    </section>
  );
}
