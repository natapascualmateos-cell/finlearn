import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  const { userId, lessonId, xpEarned, mistakes } = await req.json();

  if (!userId || !lessonId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const xp = typeof xpEarned === "number" ? xpEarned : 0;

  // Get existing progress to track best score and attempts
  const existing = await prisma.userProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  const correctCount = Math.max(0, 10 - (mistakes ?? 0));
  const newBest = Math.max(existing?.bestScore ?? 0, correctCount);

  const progress = await prisma.userProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      completed: true,
      score: correctCount,
      bestScore: newBest,
      timesAttempted: { increment: 1 },
    },
    create: {
      userId,
      lessonId,
      completed: true,
      score: correctCount,
      bestScore: correctCount,
      timesAttempted: 1,
    },
  });

  // Update user XP — xpEarned is already the correct amount from lessonStore
  if (xp > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: xp },
        level: undefined, // recalculated by client
      },
    });
  }

  return NextResponse.json(progress);
}

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const progress = await prisma.userProgress.findMany({
    where: { userId },
    select: { lessonId: true, completed: true, score: true, bestScore: true, timesAttempted: true, theoryCompleted: true },
  });

  return NextResponse.json(progress);
}
