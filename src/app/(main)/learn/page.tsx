"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, BookOpen } from "lucide-react";
import { useGameStore } from "@/stores/gameStore";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { LessonNode } from "@/components/gamification/LessonNode";
import { PathConnector } from "@/components/gamification/PathConnector";
import { WorldSelector } from "@/components/gamification/WorldSelector";
import { LessonStatus } from "@/types";
import world1 from "@/content/worlds/world-1.json";
import world2 from "@/content/worlds/world-2.json";
import type { WorldContent } from "@/types";
import { getSupabase } from "@/lib/supabase";

const worlds = [world1, world2] as unknown as WorldContent[];

const decoIcons = ["🪙", "💰", "📊", "📈", "💡", "🏦", "💳", "📉"];
const zigzagOffsets = [-35, 0, 35, 0];

function getZigzagOffset(index: number): number {
  return zigzagOffsets[index % zigzagOffsets.length];
}

type ProgressMap = Map<string, { status: LessonStatus; score: number; theoryCompleted: boolean }>;

function buildProgressMap(
  progressData: Array<{ lessonId: string; completed: boolean; score: number; theoryCompleted: boolean }>,
  worldIndex: number
): ProgressMap {
  const statuses: ProgressMap = new Map();

  // Flatten all lessons for the world
  const allLessons: string[] = [];
  worlds[worldIndex]?.units.forEach((u) =>
    u.lessons.forEach((l) => allLessons.push(l.id))
  );

  // Build a set of completed lesson IDs
  const completedIds = new Set(
    progressData.filter((p) => p.completed).map((p) => p.lessonId)
  );
  const progressById = new Map(progressData.map((p) => [p.lessonId, p]));

  allLessons.forEach((id, i) => {
    const p = progressById.get(id);
    let status: LessonStatus;

    if (p?.completed) {
      status = LessonStatus.COMPLETED;
    } else if (i === 0 || completedIds.has(allLessons[i - 1])) {
      status = LessonStatus.AVAILABLE;
    } else {
      status = LessonStatus.LOCKED;
    }

    statuses.set(id, {
      status,
      score: p?.score ?? 0,
      theoryCompleted: p?.theoryCompleted ?? false,
    });
  });

  return statuses;
}

export default function LearnPage() {
  const router = useRouter();
  const { xp, streak, streakData } = useGameStore();
  const [activeWorldId, setActiveWorldId] = useState(worlds[0].id);
  const [progressData, setProgressData] = useState<Array<{ lessonId: string; completed: boolean; score: number; theoryCompleted: boolean }>>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const activeWorldIndex = worlds.findIndex((w) => w.id === activeWorldId);
  const activeWorld = worlds[activeWorldIndex];

  // Load real progress from DB
  useEffect(() => {
    async function loadProgress() {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session?.user?.id) return;
      setUserId(session.user.id);

      try {
        const res = await fetch(`/api/progress?userId=${session.user.id}`);
        if (res.ok) {
          const data = await res.json();
          setProgressData(data);
        }
      } catch {
        // use empty progress
      }
    }
    loadProgress();
  }, []);

  const lessonStatuses = useMemo(
    () => buildProgressMap(progressData, activeWorldIndex),
    [progressData, activeWorldIndex]
  );

  const worldTabs = worlds.map((w) => ({
    id: w.id,
    title: w.title,
    icon: w.icon,
    color: w.color,
    isLocked: false, // unlock all worlds
  }));

  const handleLessonClick = (lessonId: string) => {
    const statusData = lessonStatuses.get(lessonId);
    if (!statusData || statusData.status === LessonStatus.LOCKED) return;

    // If theory not completed yet, go to theory first
    if (!statusData.theoryCompleted) {
      router.push(`/lesson/${lessonId}/theory`);
    } else {
      router.push(`/lesson/${lessonId}`);
    }
  };

  let globalLessonIndex = 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                <Sparkles className="h-4 w-4" />
                <span>{xp} XP</span>
              </div>
              <StreakBadge
                days={streak}
                isActiveToday={streakData.isActiveToday}
              />
            </div>
            {userId && (
              <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                <BookOpen className="h-3 w-3" />
                Progreso guardado
              </div>
            )}
          </div>

          <WorldSelector
            worlds={worldTabs}
            activeWorldId={activeWorldId}
            onSelect={setActiveWorldId}
          />
        </div>
      </div>

      {/* World header */}
      <div className="mx-auto max-w-2xl px-4 pt-6 pb-2">
        <motion.div
          key={activeWorld.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <span className="text-4xl">{activeWorld.icon}</span>
          <div>
            <h1 className="font-display text-xl font-extrabold text-gray-800">
              {activeWorld.title}
            </h1>
            <p className="text-sm text-gray-500">{activeWorld.description}</p>
          </div>
        </motion.div>
      </div>

      {/* Map */}
      <div className="mx-auto max-w-2xl px-4 pb-24">
        {activeWorld.units.map((unit, unitIndex) => (
          <motion.section
            key={unit.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: unitIndex * 0.1 }}
            className="mt-8"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="shrink-0 rounded-full bg-gray-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                Unidad {unit.order + 1} &middot; {unit.title}
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="flex flex-col items-center">
              {unit.lessons.map((lesson, lessonIndex) => {
                const currentGlobalIndex = globalLessonIndex++;
                const offset = getZigzagOffset(currentGlobalIndex);
                const statusData = lessonStatuses.get(lesson.id);
                const status = statusData?.status ?? LessonStatus.LOCKED;
                const theoryCompleted = statusData?.theoryCompleted ?? false;

                const isFirst = lessonIndex === 0 && unitIndex === 0;
                let prevStatus = LessonStatus.LOCKED;
                if (!isFirst) {
                  if (lessonIndex > 0) {
                    const prevId = unit.lessons[lessonIndex - 1].id;
                    prevStatus = lessonStatuses.get(prevId)?.status ?? LessonStatus.LOCKED;
                  } else {
                    const prevUnit = activeWorld.units[unitIndex - 1];
                    if (prevUnit) {
                      const prevId = prevUnit.lessons[prevUnit.lessons.length - 1].id;
                      prevStatus = lessonStatuses.get(prevId)?.status ?? LessonStatus.LOCKED;
                    }
                  }
                }

                const showDeco = currentGlobalIndex > 0 && currentGlobalIndex % 3 === 0;
                const decoIcon = decoIcons[currentGlobalIndex % decoIcons.length];

                return (
                  <div key={lesson.id} className="flex w-full flex-col items-center">
                    {!isFirst && (
                      <PathConnector
                        fromStatus={prevStatus}
                        toStatus={status}
                      />
                    )}

                    {showDeco && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mb-2 text-2xl"
                      >
                        {decoIcon}
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: currentGlobalIndex * 0.06 }}
                      style={{ transform: `translateX(${offset}px)` }}
                      className="relative"
                    >
                      {/* Theory badge */}
                      {status !== LessonStatus.LOCKED && !theoryCompleted && (
                        <div className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white shadow">
                          📖
                        </div>
                      )}
                      <LessonNode
                        title={lesson.title}
                        status={status}
                        index={currentGlobalIndex}
                        onClick={() => handleLessonClick(lesson.id)}
                      />
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        ))}

        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="flex h-10 items-center justify-center">
            <div className="h-full border-l-[3px] border-dashed border-gray-300" />
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
            🏁
          </div>
          <p className="text-xs font-medium text-gray-400">Mas contenido pronto</p>
        </div>
      </div>
    </div>
  );
}
