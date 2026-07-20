import { prisma } from "@/lib/prisma";

export class LeaderboardService {
  async getLeaderboard(params: { contestSlug: string; search?: string }) {
    const contest = await prisma.contest.findUnique({
      where: { slug: params.contestSlug },
      select: { id: true, totalProblems: true, lastSync: true }
    });

    if (!contest) throw new Error("Contest not found");

    const where: any = {
      contestId: contest.id
    };

    if (params.search) {
      where.username = { contains: params.search };
    }

    const entries = await prisma.leaderboardEntry.findMany({
      where,
      orderBy: { officialRank: "asc" }
    });

    const usernames = entries.map(e => e.username);
    
    const users = await prisma.user.findMany({
      where: { username: { in: usernames } },
      select: { 
        id: true, 
        username: true,
        participantFlags: {
          where: { contestId: contest.id },
          take: 1
        }
      } as any
    });
    const usernameToUser = new Map(users.map((u: any) => [u.username, u]));
    const userIds: string[] = Array.from(usernameToUser.values()).map((u: any) => u.id);

    const submissions = await prisma.submission.findMany({
      where: {
        userId: { in: userIds },
        problem: { contestId: contest.id }
      },
      select: {
        userId: true,
        status: true,
        problemId: true,
        review: { select: { flagged: true } }
      }
    });

    const userStats = new Map<string, { solved: Set<string>; hasFlagged: boolean }>();
    for (const userId of userIds) {
      userStats.set(userId, { solved: new Set(), hasFlagged: false });
    }

    for (const sub of submissions) {
      const stats = userStats.get(sub.userId);
      if (stats) {
        if (sub.status === "Accepted") {
          stats.solved.add(sub.problemId);
        }
        if (sub.review?.flagged) {
          stats.hasFlagged = true;
        }
      }
    }

    const data = entries.map(entry => {
      const user = usernameToUser.get(entry.username);
      const userId = user?.id;
      const stats = userId ? userStats.get(userId) : null;
      const participantFlag = (user as any)?.participantFlags?.[0] || null;

      return {
        ...entry,
        problemsSolved: stats?.solved.size || 0,
        status: stats?.hasFlagged ? "FLAGGED" : "CLEAN",
        participantFlag
      };
    });

    // Recompute officialRank for unflagged users (maintaining original order)
    let currentRank = 1;
    for (const entry of data) {
      const isFlagged = entry.status === "FLAGGED" || !!entry.participantFlag;
      if (!isFlagged) {
        entry.officialRank = currentRank++;
      } else {
        entry.officialRank = 0;
      }
    }

    return {
      data,
      contestTotalProblems: contest.totalProblems,
      contestLastSync: contest.lastSync
    };
  }
}

export const leaderboardService = new LeaderboardService();
