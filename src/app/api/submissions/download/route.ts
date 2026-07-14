import { NextRequest, NextResponse } from "next/server";
import { downloadQueue, DownloadPriority } from "@/services/download-queue";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { submissionId, priority } = await request.json();

    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    const pLevel: DownloadPriority = priority || "LOW";

    const submission = await prisma.submission.findUnique({
      where: { submissionId },
      include: { problem: { include: { contest: true } } }
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const contestSlug = submission.problem.contest.slug;
    const challengeSlug = submission.problem.slug;

    // Enqueue
    downloadQueue.enqueue(submissionId, contestSlug, challengeSlug, pLevel);

    return NextResponse.json({ success: true, message: "Enqueued" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to enqueue download" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get("submissionId");
    
    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    const status = await downloadQueue.getStatus(submissionId);
    return NextResponse.json(status || { status: "UNKNOWN" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get download status" },
      { status: 500 }
    );
  }
}
