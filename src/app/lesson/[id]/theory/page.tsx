"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import world1 from "@/content/worlds/world-1.json";
import world2 from "@/content/worlds/world-2.json";
import type { WorldContent, TheoryCard } from "@/types";
import { getSupabase } from "@/lib/supabase";

const worlds = [world1, world2] as unknown as WorldContent[];

function findLessonWithTheory(id: string) {
  for (const world of worlds) {
    for (const unit of world.units) {
      const lesson = unit.lessons.find((l) => l.id === id);
      if (lesson) return lesson;
    }
  }
  return null;
}

export default function TheoryPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const lesson = useMemo(() => findLessonWithTheory(lessonId), [lessonId]);
  const cards = (lesson?.theoryCards ?? []) as TheoryCard[];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [markingComplete, setMarkingComplete] = useState(false);

  const currentCard = cards[currentIndex];
  const isLast = currentIndex === cards.length - 1;
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  const goNext = () => {
    setDirection(1);
    setCurrentIndex((i) => Math.min(i + 1, cards.length - 1));
  };

  const goPrev = () => {
    setDirection(-1);
    setCurrentIndex((i) => Math.max(i - 1, 0));
  };

  const handleFinish = async () => {
    setMarkingComplete(true);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (session?.user?.id) {
        await fetch("/api/theory-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: session.user.id, lessonId }),
        });
      }
    } catch {
      // continue even if API fails
    }
    router.push(`/lesson/${lessonId}`);
  };

  if (!lesson) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Leccion no encontrada</p>
      </div>
    );
  }

  if (cards.length === 0) {
    router.push(`/lesson/${lessonId}`);
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-4 px-4">
          <button
            onClick={() => router.push("/learn")}
            className="flex items-center gap-1 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-600 truncate">{lesson.title}</span>
          </div>
          <span className="text-sm font-bold text-blue-600">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full bg-blue-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Card area */}
      <div className="flex flex-1 flex-col items-center justify-start px-4 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            {currentCard && (
              <motion.div
                key={currentCard.id}
                custom={direction}
                initial={{ opacity: 0, x: direction * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 60 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border-2 border-blue-100 bg-white p-6 shadow-sm sm:p-8"
              >
                <h2 className="mb-4 text-xl font-extrabold text-gray-800">
                  {currentCard.title}
                </h2>
                <div className="prose prose-gray max-w-none">
                  {currentCard.content.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="mb-4 text-sm leading-relaxed text-gray-700 sm:text-base">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </Button>

            {/* Dot indicators */}
            <div className="flex gap-1.5">
              {cards.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > currentIndex ? 1 : -1);
                    setCurrentIndex(i);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    i === currentIndex
                      ? "w-6 bg-blue-500"
                      : i < currentIndex
                      ? "w-2 bg-blue-300"
                      : "w-2 bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {isLast ? (
              <Button
                onClick={handleFinish}
                disabled={markingComplete}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
              >
                <CheckCircle className="h-4 w-4" />
                {markingComplete ? "..." : "Empezar test"}
              </Button>
            ) : (
              <Button onClick={goNext} className="flex items-center gap-2">
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
