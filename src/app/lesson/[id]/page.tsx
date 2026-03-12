"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLessonStore } from "@/stores/lessonStore";
import { useGameStore } from "@/stores/gameStore";
import { LessonHeader } from "@/components/lesson/LessonHeader";
import { LessonFooter } from "@/components/lesson/LessonFooter";
import { LessonComplete } from "@/components/lesson/LessonComplete";
import { LessonFailed } from "@/components/lesson/LessonFailed";
import { MultipleChoice } from "@/components/exercises/MultipleChoice";
import { TrueFalse } from "@/components/exercises/TrueFalse";
import { FillBlank } from "@/components/exercises/FillBlank";
import { MatchPairs } from "@/components/exercises/MatchPairs";
import { OrderSteps } from "@/components/exercises/OrderSteps";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { playClick } from "@/lib/sounds";
import world1 from "@/content/worlds/world-1.json";
import world2 from "@/content/worlds/world-2.json";
import type { WorldContent, LessonWithExercises, Exercise } from "@/types";
import { selectExercises, type WrongAnswerRecord } from "@/utils/spaced-repetition";
import { getSupabase } from "@/lib/supabase";

const worlds = [world1, world2] as unknown as WorldContent[];

function findLesson(id: string): LessonWithExercises | null {
  for (const world of worlds) {
    for (const unit of world.units) {
      const lesson = unit.lessons.find((l) => l.id === id);
      if (lesson) {
        return {
          ...lesson,
          unitId: unit.id,
          exercises: lesson.exercises.map((ex) => ({
            ...ex,
            lessonId: lesson.id,
            explanation: ex.explanation ?? "",
            options: ex.options.map((opt) => ({ ...opt, exerciseId: ex.id })),
          })),
        };
      }
    }
  }
  return null;
}

function ExerciseRenderer({
  exercise,
  onAnswer,
  isAnswered,
  showExplanation,
}: {
  exercise: Exercise;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  isAnswered: boolean;
  showExplanation: boolean;
}) {
  const props = { exercise, onAnswer, isAnswered, showExplanation };

  switch (exercise.type) {
    case "MULTIPLE_CHOICE":
      return <MultipleChoice {...props} />;
    case "TRUE_FALSE":
      return <TrueFalse {...props} />;
    case "FILL_BLANK":
      return <FillBlank {...props} />;
    case "MATCH_PAIRS":
      return <MatchPairs {...props} />;
    case "ORDER":
      return <OrderSteps {...props} />;
    default:
      return <p className="text-gray-500">Tipo de ejercicio no soportado</p>;
  }
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;
  const rawLesson = useMemo(() => findLesson(lessonId), [lessonId]);

  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const {
    currentExerciseIndex,
    mistakes,
    xpEarned,
    isComplete,
    heartsLeft,
    showExplanation,
    lastAnswerCorrect,
    startLesson,
    submitAnswer,
    nextExercise,
    resetLesson,
    getCurrentExercise,
    currentLesson,
  } = useLessonStore();

  const { addXP, checkAndUpdateStreak } = useGameStore();
  const [showExitModal, setShowExitModal] = useState(false);

  // Load user + wrong answers for spaced repetition
  useEffect(() => {
    async function init() {
      const { data: { session } } = await getSupabase().auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);

      let wrongs: WrongAnswerRecord[] = [];
      if (uid && rawLesson) {
        try {
          const res = await fetch(`/api/wrong-answers?userId=${uid}&lessonId=${rawLesson.id}`);
          if (res.ok) wrongs = await res.json();
        } catch {
          // ignore
        }
      }
      if (rawLesson) {
        const pool = rawLesson.exercises;
        const chosen = selectExercises(pool, wrongs, 10);

        const lessonToStart: LessonWithExercises = { ...rawLesson, exercises: chosen };
        startLesson(lessonToStart);
      }
      setReady(true);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Award XP on successful completion
  useEffect(() => {
    if (!isComplete || heartsLeft <= 0 || xpEarned <= 0) return;

    addXP(xpEarned, "lesson_complete");
    checkAndUpdateStreak();

    // Persist to DB
    if (userId && rawLesson) {
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          lessonId: rawLesson.id,
          xpEarned,
          mistakes,
        }),
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  const exercise = getCurrentExercise();
  const totalExercises = currentLesson?.exercises.length ?? 0;
  const progress =
    totalExercises > 0
      ? ((currentExerciseIndex + (showExplanation ? 1 : 0)) / totalExercises) * 100
      : 0;

  const handleAnswer = useCallback(
    (answer: string, isCorrect: boolean) => {
      submitAnswer(answer, isCorrect);

      // Track wrong answers for spaced repetition
      if (!isCorrect && userId && exercise) {
        fetch("/api/wrong-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            exerciseId: exercise.id,
            lessonId: lessonId,
          }),
        }).catch(() => {});
      }
    },
    [submitAnswer, userId, exercise, lessonId]
  );

  const handleContinue = useCallback(() => {
    playClick();
    nextExercise();
  }, [nextExercise]);

  const handleRetry = useCallback(() => {
    resetLesson();
  }, [resetLesson]);

  if (!ready || !rawLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-6xl">📚</p>
          <p className="mt-4 text-lg font-medium text-gray-500">
            {!rawLesson && ready ? "Leccion no encontrada" : "Cargando..."}
          </p>
          {!rawLesson && ready && (
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => router.push("/learn")}
            >
              Volver al mapa
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Completed successfully
  if (isComplete && heartsLeft > 0) {
    return (
      <LessonComplete
        xpEarned={xpEarned}
        mistakes={mistakes}
        totalExercises={totalExercises}
      />
    );
  }

  // Failed — no hearts left
  if (isComplete && heartsLeft <= 0) {
    return (
      <LessonFailed
        mistakes={mistakes}
        totalExercises={totalExercises}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <LessonHeader
        progress={progress}
        hearts={heartsLeft}
        onExit={() => setShowExitModal(true)}
      />

      {/* Exercise area */}
      <div className="flex flex-1 flex-col pt-14 pb-20">
        <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-8">
          <AnimatePresence mode="wait">
            {exercise && (
              <motion.div
                key={exercise.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
              >
                <ExerciseRenderer
                  exercise={exercise}
                  onAnswer={handleAnswer}
                  isAnswered={showExplanation}
                  showExplanation={showExplanation}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <LessonFooter
        showContinue={showExplanation}
        wasCorrect={lastAnswerCorrect}
        onContinue={handleContinue}
      />

      {/* Exit confirmation modal */}
      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Salir de la leccion?"
      >
        <p className="text-gray-600">
          Perderas todo el progreso de esta leccion.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setShowExitModal(false)}
          >
            Seguir
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => router.push("/learn")}
          >
            Salir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
