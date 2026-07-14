import { prisma } from "@/lib/prisma";
import { statsCache } from "@/lib/cache";
import type { ReplayData } from "@/types/api";

export class ReplayService {
  /**
   * Get contest state at a given week — computed dynamically from historical timestamps.
   * No snapshots are stored.
   */
  async getReplayData(upToWeek: number): Promise<ReplayData> {
    const cacheKey = `replay:${upToWeek}`;
    return statsCache.getOrCompute(cacheKey, async () => {
      // Get all problems up to this week
      const problems = await prisma.problem.findMany({
        where: { week: { lte: upToWeek } },
        select: { id: true },
      });
      const problemIds = problems.map((p) => p.id);

      // Get all submissions for problems up to this week
      const submissions = await prisma.submission.findMany({
        where: {
          problemId: { in: problemIds },
        },
        include: {
          user: { select: { username: true, team: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      // Build leaderboard
      const userStats = new Map<string, {
        username: string;
        team: string | null;
        solvedProblems: Set<string>;
        totalAttempts: number;
        score: number;
        lastSubmission: Date | null;
      }>();

      submissions.forEach((sub) => {
        if (!userStats.has(sub.userId)) {
          userStats.set(sub.userId, {
            username: sub.user.username,
            team: sub.user.team,
            solvedProblems: new Set(),
            totalAttempts: 0,
            score: 0,
            lastSubmission: null,
          });
        }
        const stats = userStats.get(sub.userId)!;
        stats.totalAttempts++;
        stats.lastSubmission = sub.createdAt;
        if (sub.status === "Accepted") {
          stats.solvedProblems.add(sub.problemId);
          stats.score += sub.score;
        }
      });

      const leaderboard = Array.from(userStats.values())
        .map((stats) => ({
          username: stats.username,
          team: stats.team,
          solved: stats.solvedProblems.size,
          totalAttempts: stats.totalAttempts,
          score: stats.score,
          lastSubmission: stats.lastSubmission,
        }))
        .sort((a, b) => b.solved - a.solved || a.totalAttempts - b.totalAttempts);

      // Solved counts per problem
      const solvedCounts: Record<string, number> = {};
      for (const problem of problems) {
        const solvers = new Set(
          submissions
            .filter((s) => s.problemId === problem.id && s.status === "Accepted")
            .map((s) => s.userId)
        );
        solvedCounts[problem.id] = solvers.size;
      }

      const totalAccepted = submissions.filter((s) => s.status === "Accepted").length;

      return {
        week: upToWeek,
        leaderboard,
        solvedCounts,
        totalSubmissions: submissions.length,
        totalAccepted,
        participantCount: userStats.size,
      };
    });
  }

  async getAvailableWeeks(): Promise<number[]> {
    const weeks = await prisma.problem.findMany({
      select: { week: true },
      distinct: ["week"],
      orderBy: { week: "asc" },
    });
    return weeks.map((w) => w.week);
  }
}

export const replayService = new ReplayService();
