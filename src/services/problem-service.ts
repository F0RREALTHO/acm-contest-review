import { prisma } from "@/lib/prisma";
import { statsCache } from "@/lib/cache";
import { generatePaginationParams } from "@/lib/utils";
import type { ProblemWithStats } from "@/types/database";
import type { ProblemAnalytics } from "@/types/analytics";

export class ProblemService {
  async getProblems(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    week?: number;
    contestId?: string;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const { skip, take } = generatePaginationParams(page, limit);

    const where: Record<string, unknown> = {};
    if (params.week) where.week = params.week;
    if (params.contestId) where.contestId = params.contestId;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { slug: { contains: params.search } },
      ];
    }

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        include: {
          submissions: {
            select: {
              status: true,
              userId: true,
              createdAt: true,
              timeFromStart: true,
            },
          },
        },
        orderBy: [{ week: "asc" }, { name: "asc" }],
        skip,
        take,
      }),
      prisma.problem.count({ where }),
    ]);

    const data: ProblemWithStats[] = problems.map((problem) => {
      const subs = problem.submissions;
      const accepted = subs.filter((s) => s.status === "Accepted");
      const uniqueSolvers = new Set(accepted.map((s) => s.userId)).size;
      const totalAttempts = subs.length;
      const failureCount = totalAttempts - accepted.length;
      const successRate = totalAttempts > 0 ? (accepted.length / totalAttempts) * 100 : 0;

      // First and last solver
      const sortedAccepted = [...accepted].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );

      return {
        id: problem.id,
        name: problem.name,
        slug: problem.slug,
        week: problem.week,
        contestId: problem.contestId,
        maxScore: problem.maxScore,
        totalAttempts,
        acceptedCount: accepted.length,
        uniqueSolvers,
        failureCount,
        successRate,
        firstSolver: sortedAccepted[0]?.userId || null,
        lastSolver: sortedAccepted[sortedAccepted.length - 1]?.userId || null,
        firstSolveTime: sortedAccepted[0]?.createdAt || null,
        fastestSolveTime: sortedAccepted.length > 0
          ? Math.min(...sortedAccepted.map((s) => s.timeFromStart || Infinity))
          : null,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + data.length < total,
    };
  }

  async getProblemBySlug(slug: string) {
    return prisma.problem.findFirst({
      where: { slug },
      include: {
        contest: { select: { name: true, slug: true } },
      },
    });
  }

  async getProblemAnalytics(slug: string): Promise<ProblemAnalytics | null> {
    const problem = await prisma.problem.findFirst({
      where: { slug },
    });

    if (!problem) return null;

    const cacheKey = `problem_analytics:${slug}`;
    return statsCache.getOrCompute(cacheKey, async () => {
      const submissions = await prisma.submission.findMany({
        where: { problemId: problem.id },
        include: {
          user: { select: { username: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const accepted = submissions.filter((s) => s.status === "Accepted");
      const totalAttempts = submissions.length;
      const failureCount = totalAttempts - accepted.length;

      // First solver
      const firstAccepted = accepted[0];
      const firstSolver = firstAccepted
        ? { username: firstAccepted.user.username, time: firstAccepted.createdAt }
        : null;

      // Last solver
      const lastAccepted = accepted[accepted.length - 1];
      const lastSolver = lastAccepted
        ? { username: lastAccepted.user.username, time: lastAccepted.createdAt }
        : null;

      // Fastest solve
      const withTime = accepted.filter((s) => s.timeFromStart != null);
      const fastest = withTime.length > 0
        ? withTime.reduce((min, s) =>
            (s.timeFromStart || Infinity) < (min.timeFromStart || Infinity) ? s : min
          )
        : null;
      const fastestSolve = fastest
        ? { username: fastest.user.username, timeMs: fastest.timeFromStart! * 1000 }
        : null;

      // Solve timeline
      const solvedUsers = new Set<string>();
      const solveTimeline = accepted
        .filter((s) => {
          if (solvedUsers.has(s.userId)) return false;
          solvedUsers.add(s.userId);
          return true;
        })
        .map((s) => {
          const userAttempts = submissions.filter(
            (sub) => sub.userId === s.userId && sub.createdAt <= s.createdAt
          ).length;
          return {
            username: s.user.username,
            time: s.createdAt,
            attempts: userAttempts,
          };
        });

      // Avg attempts before AC
      let totalAttemptsBeforeAC = 0;
      const userFirstAC = new Map<string, Date>();
      accepted.forEach((s) => {
        if (!userFirstAC.has(s.userId)) userFirstAC.set(s.userId, s.createdAt);
      });
      userFirstAC.forEach((acTime, userId) => {
        const attempts = submissions.filter(
          (s) => s.userId === userId && s.createdAt <= acTime
        ).length;
        totalAttemptsBeforeAC += attempts;
      });
      const avgAttemptsBeforeAC = userFirstAC.size > 0
        ? totalAttemptsBeforeAC / userFirstAC.size
        : 0;

      // Language distribution
      const langMap = new Map<string, number>();
      submissions.forEach((s) => {
        langMap.set(s.language, (langMap.get(s.language) || 0) + 1);
      });
      const languageDistribution = Array.from(langMap.entries())
        .map(([language, count]) => ({
          language,
          displayName: language,
          count,
          percentage: (count / totalAttempts) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      // Status distribution
      const statusMap = new Map<string, number>();
      submissions.forEach((s) => {
        statusMap.set(s.status, (statusMap.get(s.status) || 0) + 1);
      });
      const statusDistribution = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      return {
        problemName: problem.name,
        problemSlug: problem.slug,
        week: problem.week,
        totalAttempts,
        acceptedCount: accepted.length,
        failureCount,
        successPercentage: totalAttempts > 0 ? (accepted.length / totalAttempts) * 100 : 0,
        avgAttemptsBeforeAC,
        firstSolver,
        lastSolver,
        fastestSolve,
        solveTimeline,
        languageDistribution,
        statusDistribution,
      };
    });
  }

  async getWeeks() {
    const weeks = await prisma.problem.findMany({
      select: { week: true },
      distinct: ["week"],
      orderBy: { week: "asc" },
    });
    return weeks.map((w) => w.week);
  }
}

export const problemService = new ProblemService();
