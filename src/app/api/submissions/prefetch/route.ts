import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { downloadQueue } from "@/services/download-queue";

export async function POST(request: NextRequest) {
  try {
    const { username, contestSlug } = await request.json();

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find all submissions for this user (optionally scoped to a contest)
    // that don't have a DONE source code cache entry yet
    const submissions = await prisma.submission.findMany({
      where: {
        userId: user.id,
        ...(contestSlug
          ? { problem: { contest: { slug: contestSlug } } }
          : {}),
        OR: [
          { sourceCache: null },
          { sourceCache: { status: { not: "DONE" } } },
        ],
      },
      include: {
        problem: {
          select: {
            slug: true,
            contest: { select: { slug: true } },
          },
        },
      },
    });

    if (submissions.length === 0) {
      return NextResponse.json({ enqueued: 0, message: "All submissions already cached" });
    }

    // Enqueue each submission into the download queue at LOW priority
    // so they don't compete with individual HIGH priority on-demand requests
    let enqueued = 0;
    for (const sub of submissions) {
      downloadQueue.enqueue(
        sub.submissionId,
        sub.problem.contest.slug,
        sub.problem.slug,
        "LOW"
      );
      enqueued++;
    }

    return NextResponse.json({
      enqueued,
      total: submissions.length,
      message: `Enqueued ${enqueued} submissions for background download`,
    });
  } catch (error) {
    console.error("[Prefetch] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prefetch" },
      { status: 500 }
    );
  }
}
