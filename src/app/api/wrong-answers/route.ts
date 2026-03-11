import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  const { userId, exerciseId, lessonId } = await req.json();

  if (!userId || !exerciseId || !lessonId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await prisma.userWrongAnswer.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    update: {
      timesWrong: { increment: 1 },
      lastSeenAt: new Date(),
    },
    create: { userId, exerciseId, lessonId, timesWrong: 1 },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const lessonId = searchParams.get("lessonId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const where = lessonId ? { userId, lessonId } : { userId };

  const wrongAnswers = await prisma.userWrongAnswer.findMany({
    where,
    select: { exerciseId: true, timesWrong: true, lessonId: true },
    orderBy: { timesWrong: "desc" },
  });

  return NextResponse.json(wrongAnswers);
}
