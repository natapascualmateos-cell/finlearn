/**
 * Simple spaced repetition based on SM-2 algorithm.
 * Determines when a lesson/concept should be reviewed.
 */

import type { Exercise } from "@/types";

export type WrongAnswerRecord = {
  exerciseId: string;
  timesWrong: number;
};

/**
 * Selects up to `count` exercises using spaced repetition priority:
 * 1. Previously wrong answers (most wrong first)
 * 2. Never-seen exercises
 * 3. Previously correct exercises (review)
 *
 * If the pool has fewer than `count` exercises, all are returned (shuffled).
 */
export function selectExercises(
  pool: Exercise[],
  wrongAnswers: WrongAnswerRecord[],
  count = 10
): Exercise[] {
  if (pool.length <= count) {
    return shuffleArray([...pool]);
  }

  const wrongMap = new Map(wrongAnswers.map((w) => [w.exerciseId, w.timesWrong]));
  const seenIds = new Set(wrongAnswers.map((w) => w.exerciseId));

  const wrongExercises = pool
    .filter((e) => wrongMap.has(e.id))
    .sort((a, b) => (wrongMap.get(b.id) ?? 0) - (wrongMap.get(a.id) ?? 0));

  const newExercises = shuffleArray(pool.filter((e) => !seenIds.has(e.id)));
  const reviewExercises = shuffleArray(
    pool.filter((e) => seenIds.has(e.id) && !wrongMap.has(e.id))
  );

  const selected: Exercise[] = [];
  for (const queue of [wrongExercises, newExercises, reviewExercises]) {
    for (const exercise of queue) {
      if (selected.length >= count) break;
      selected.push(exercise);
    }
    if (selected.length >= count) break;
  }

  return selected;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}


interface ReviewItem {
  lessonId: string;
  easeFactor: number;   // starts at 2.5
  interval: number;     // days until next review
  repetitions: number;
  nextReviewAt: Date;
}

/** Quality: 0 = total blackout, 5 = perfect recall */
export function calculateNextReview(
  item: ReviewItem,
  quality: number // 0-5
): ReviewItem {
  const q = Math.max(0, Math.min(5, quality));

  let { easeFactor, interval, repetitions } = item;

  if (q < 3) {
    // Failed recall — restart
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  }

  // Update ease factor (minimum 1.3)
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return {
    lessonId: item.lessonId,
    easeFactor,
    interval,
    repetitions,
    nextReviewAt,
  };
}

export function createNewReviewItem(lessonId: string): ReviewItem {
  return {
    lessonId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewAt: new Date(),
  };
}

/** Maps lesson score (0-100%) to SM-2 quality (0-5) */
export function scoreToQuality(scorePercent: number): number {
  if (scorePercent >= 95) return 5;
  if (scorePercent >= 80) return 4;
  if (scorePercent >= 60) return 3;
  if (scorePercent >= 40) return 2;
  if (scorePercent >= 20) return 1;
  return 0;
}
