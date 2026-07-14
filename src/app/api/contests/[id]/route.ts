import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, slug, description, icon, enabled } = body;

    const contest = await prisma.contest.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(enabled !== undefined && { enabled }),
      },
    });

    return NextResponse.json(contest);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update contest" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete related entities (this requires cascading deletes or doing it manually)
    // Since we didn't specify onDelete: Cascade in prisma for everything, let's just 
    // delete the contest (SQLite will fail if relations exist unless we delete them)
    
    // Manual cascading deletion to be safe:
    const problems = await prisma.problem.findMany({ where: { contestId: id }, select: { id: true } });
    const problemIds = problems.map(p => p.id);
    
    // Reviews
    await prisma.review.deleteMany({
      where: { submission: { problemId: { in: problemIds } } }
    });
    
    // Submissions
    await prisma.submission.deleteMany({
      where: { problemId: { in: problemIds } }
    });
    
    // SyncLogs
    await prisma.syncLog.deleteMany({
      where: { contestId: id }
    });

    // Problems
    await prisma.problem.deleteMany({
      where: { contestId: id }
    });

    // Finally Contest
    await prisma.contest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete contest" },
      { status: 500 }
    );
  }
}
