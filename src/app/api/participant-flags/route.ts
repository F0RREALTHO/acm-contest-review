import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { username, contestSlug, reason, notes } = data;

    if (!username || !contestSlug || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    const contest = await prisma.contest.findUnique({ where: { slug: contestSlug } });

    if (!user || !contest) {
      return NextResponse.json({ error: "User or Contest not found" }, { status: 404 });
    }

    const flag = await prisma.participantFlag.upsert({
      where: {
        userId_contestId: {
          userId: user.id,
          contestId: contest.id,
        },
      },
      update: {
        reason,
        notes,
        flaggedBy: "Moderator", // Later can come from session
      },
      create: {
        userId: user.id,
        contestId: contest.id,
        username: user.username,
        reason,
        notes,
        flaggedBy: "Moderator",
      },
    });

    return NextResponse.json({ success: true, data: flag });
  } catch (error) {
    console.error("Error saving participant flag:", error);
    return NextResponse.json(
      { error: "Failed to save participant flag" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const contestSlug = searchParams.get("contestSlug");

    if (!username || !contestSlug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    const contest = await prisma.contest.findUnique({ where: { slug: contestSlug } });

    if (user && contest) {
      await prisma.participantFlag.deleteMany({
        where: {
          userId: user.id,
          contestId: contest.id,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting participant flag:", error);
    return NextResponse.json(
      { error: "Failed to delete participant flag" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contestSlug = searchParams.get("contestSlug");

    const where: any = {};
    if (contestSlug) {
      where.contest = { slug: contestSlug };
    }

    const flags = await prisma.participantFlag.findMany({
      where,
      include: {
        contest: { select: { slug: true, name: true } },
        user: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // To provide stats we'll fetch leaderboard entries
    const enhancedFlags = await Promise.all(flags.map(async (flag) => {
      const entry = await prisma.leaderboardEntry.findUnique({
        where: {
          contestId_username: {
            contestId: flag.contestId,
            username: flag.username,
          }
        }
      });
      
      const solvedDistinct = await prisma.submission.findMany({
        where: {
          userId: flag.userId,
          problem: { contestId: flag.contestId },
          status: "Accepted"
        },
        distinct: ['problemId'],
        select: { submissionId: true }
      });

      return {
        ...flag,
        leaderboard: entry,
        problemsSolved: solvedDistinct.length,
      };
    }));

    return NextResponse.json({ data: enhancedFlags });
  } catch (error) {
    console.error("Error fetching participant flags:", error);
    return NextResponse.json(
      { error: "Failed to fetch participant flags" },
      { status: 500 }
    );
  }
}
