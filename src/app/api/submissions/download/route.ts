import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HackerRankClient } from "@/services/hackerrank-client";

export async function POST(request: NextRequest) {
  try {
    const { submissionId } = await request.json();

    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    // Check if already downloaded
    const existing = await prisma.sourceCodeCache.findUnique({
      where: { submissionId },
    });
    if (existing?.status === "DONE" && existing.sourceCode) {
      return NextResponse.json({ status: "DONE", sourceCode: existing.sourceCode });
    }

    // Get submission info for the API call
    const submission = await prisma.submission.findUnique({
      where: { submissionId },
      include: { problem: { include: { contest: true } } },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const cookie = process.env.HR_SESSION_COOKIE;
    if (!cookie) {
      return NextResponse.json({ error: "HR_SESSION_COOKIE not configured" }, { status: 500 });
    }

    // Mark as downloading
    await prisma.sourceCodeCache.upsert({
      where: { submissionId },
      update: { status: "DOWNLOADING", lastAttempt: new Date() },
      create: { submissionId, status: "DOWNLOADING", lastAttempt: new Date() },
    });

    // Fetch directly (no queue, no polling needed)
    const client = new HackerRankClient({ cookie, delayMs: 0 });
    const detail = await client.getSubmissionDetail(
      submission.problem.contest.slug,
      submission.problem.slug,
      Number(submissionId)
    );

    const sourceCode = detail.model?.code || null;

    await prisma.sourceCodeCache.update({
      where: { submissionId },
      data: {
        sourceCode,
        status: sourceCode ? "DONE" : "FAILED",
        downloadedAt: new Date(),
        downloadAttempts: { increment: 1 },
      },
    });

    return NextResponse.json({ status: sourceCode ? "DONE" : "FAILED", sourceCode });
  } catch (error: any) {
    const isRateLimited = error.message?.includes("429");

    if (isRateLimited) {
      // Update status so the UI knows
      const body = await request.clone().json().catch(() => ({}));
      if (body.submissionId) {
        await prisma.sourceCodeCache.upsert({
          where: { submissionId: body.submissionId },
          update: { status: "RATE_LIMITED", downloadAttempts: { increment: 1 } },
          create: { submissionId: body.submissionId, status: "RATE_LIMITED" },
        }).catch(() => {});
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download", status: isRateLimited ? "RATE_LIMITED" : "FAILED" },
      { status: isRateLimited ? 429 : 500 }
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

    const cache = await prisma.sourceCodeCache.findUnique({
      where: { submissionId },
    });
    return NextResponse.json(cache || { status: "UNKNOWN" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get download status" },
      { status: 500 }
    );
  }
}

