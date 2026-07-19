import { prisma } from "@/lib/prisma";

export class LeaderboardService {
  async getLeaderboard(params: { contestSlug: string; search?: string }) {
    const contest = await prisma.contest.findUnique({
      where: { slug: params.contestSlug },
      select: { id: true, totalProblems: true }
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

    // Sort to push flagged participants to the bottom, otherwise keep existing order (which is by officialRank)
    data.sort((a, b) => {
      const aFlagged = a.status === "FLAGGED" || !!a.participantFlag;
      const bFlagged = b.status === "FLAGGED" || !!b.participantFlag;
      
      if (aFlagged && !bFlagged) return 1;
      if (!aFlagged && bFlagged) return -1;
      return 0; // If both are flagged or both are clean, retain original relative order
    });

    // Recompute officialRank for unflagged users
    let currentRank = 1;
    for (const entry of data) {
      const isFlagged = entry.status === "FLAGGED" || !!entry.participantFlag;
      if (!isFlagged) {
        entry.officialRank = currentRank++;
      } else {
        // We can either set it to null or keep it as their original hrRank/officialRank, but visually setting it to a generic value or max value might be better if we want them out of rank.
        // Let's just null it out or set it to a very large number for UI purposes? 
        // Actually the component just displays formatRank(p.officialRank), so let's set it to -1 to represent 'unranked' or we can just leave it.
        // Let's set it to 0 so formatRank can handle it, or we just leave it as is if the UI already shows it as flagged.
        // Wait, the prompt says "so clean users get sequential rank 1, 2, 3..". 
        // We'll set flagged users' official rank to 0 to indicate they are unranked.
        entry.officialRank = 0;
      }
    }

    return {
      data,
      contestTotalProblems: contest.totalProblems
    };
  }
}

export const leaderboardService = new LeaderboardService();
