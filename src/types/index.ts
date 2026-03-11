// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Enums
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export enum ExerciseType {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
  FILL_BLANK = "FILL_BLANK",
  MATCH_PAIRS = "MATCH_PAIRS",
  ORDER = "ORDER",
}

export enum LessonStatus {
  LOCKED = "locked",
  AVAILABLE = "available",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. Modelos planos (reflejan Prisma para el frontend)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  xp: number;
  streak: number;
  lives: number;
  level: number;
  lastActiveAt: string | null;
  createdAt: string;
};

export type World = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  order: number;
};

export type Unit = {
  id: string;
  worldId: string;
  title: string;
  order: number;
};

export type Lesson = {
  id: string;
  unitId: string;
  title: string;
  order: number;
  xpReward: number;
};

export type ExerciseOption = {
  id: string;
  exerciseId: string;
  text: string;
  isCorrect: boolean;
  order: number;
};

export type Exercise = {
  id: string;
  lessonId: string;
  type: `${ExerciseType}`;
  question: string;
  explanation: string;
  order: number;
  options: ExerciseOption[];
};

export type UserProgress = {
  id: string;
  userId: string;
  lessonId: string;
  completed: boolean;
  score: number;
  createdAt: string;
};

export type XPEvent = {
  id: string;
  userId: string;
  amount: number;
  source: "lesson_complete" | "perfect_lesson" | "streak_bonus" | "daily_goal";
  lessonId: string | null;
  createdAt: string;
};

// Backward compat alias used by lessonStore
export type Challenge = Exercise;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. Tipos de frontend
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Props comunes para todos los componentes de ejercicio */
export type ExerciseProps<TAnswer = string> = {
  exercise: Exercise;
  onAnswer: (answer: TAnswer) => void;
  isAnswered: boolean;
  selectedAnswer: TAnswer | null;
};

/** Estado de una leccion en progreso */
export type LessonState = {
  currentExerciseIndex: number;
  answers: Map<string, string>; // exerciseId → answerId
  mistakes: number;
  xpEarned: number;
  isComplete: boolean;
};

/** Estado global del juego (gamification) */
export type GameState = {
  hearts: number;
  xp: number;
  streak: number;
  level: number;
};

/** Datos de racha del usuario */
export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  isActiveToday: boolean;
};

/** Datos para animacion de XP ganado */
export type XPAnimation = {
  amount: number;
  source: XPEvent["source"];
  timestamp: number;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. Tipos compuestos (con relaciones pobladas)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type WorldWithUnits = World & {
  units: UnitWithLessons[];
};

export type UnitWithLessons = Unit & {
  lessons: (Lesson & {
    status: LessonStatus;
    progress: UserProgress | null;
  })[];
};

export type LessonWithExercises = Lesson & {
  exercises: Exercise[];
  theoryCards?: TheoryCard[];
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. Tipos para contenido JSON (content/worlds/*.json)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ExerciseContent = {
  id: string;
  type: `${ExerciseType}`;
  question: string;
  explanation?: string;
  order: number;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    order: number;
  }[];
};

export type TheoryCard = {
  id: string;
  title: string;
  content: string;
  order: number;
};

export type LessonContent = {
  id: string;
  title: string;
  order: number;
  xpReward: number;
  theoryCards?: TheoryCard[];
  exercises: ExerciseContent[];
};

export type UnitContent = {
  id: string;
  title: string;
  order: number;
  lessons: LessonContent[];
};

export type WorldContent = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  units: UnitContent[];
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Utility: helper to narrow Exercise by type
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ExerciseOfType<T extends ExerciseType> = Exercise & { type: T };

// Specific pair / step types for MATCH_PAIRS and ORDER
export type MatchPair = {
  id: string;
  left: string;
  right: string;
};

export type OrderStep = {
  id: string;
  text: string;
  correctPosition: number;
};
