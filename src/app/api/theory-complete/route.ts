import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  const { userId, lessonId } = await req.json();

  if (!userId || !lessonId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await prisma.userProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { theoryCompleted: true },
    create: { userId, lessonId, theoryCompleted: true, completed: false, score: 0 },
  });

  return NextResponse.json({ ok: true });
}
