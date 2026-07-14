import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * COMPUTED QUERIES
 * 
 * This module contains all derived/computed queries.
 * The database stores ONLY raw, immutable submissions.
 * "Latest Accepted" and all aggregates are computed dynamically here.
 */

/**
 * Get the latest accepted submission for each (user, problem) pair.
 * This is the core query used by review queue, participant profiles, and problem pages.
 */
export async function getLatestAcceptedSubmissions(filters?: {
  userId?: string;
  problemId?: string;
  week?: number;
  reviewed?: boolean;
  flagged?: boolean;
  contestId?: string;
}) {
  const where: Prisma.SubmissionWhereInput = {
    isLatestAccepted: true,
  };

  if (filters?.userId) where.userId = filters.userId;
  if (filters?.problemId) where.problemId = filters.problemId;
  if (filters?.week) where.problem = { week: filters.week };
  if (filters?.contestId) where.problem = { ...where.problem as Prisma.ProblemWhereInput, contestId: filters.contestId };
  if (filters?.reviewed !== undefined) where.review = filters.reviewed ? { reviewed: true } : { OR: [{ reviewed: false }, { id: undefined }] };
  if (filters?.flagged !== undefined) where.review = { ...where.review as any, flagged: filters.flagged };

  return prisma.submission.findMany({
    where,
    include: {
      user: { select: { username: true, team: true } },
      problem: { select: { name: true, slug: true, week: true } },
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get the latest accepted submission for a specific user and problem.
 */
export async function getLatestAccepted(userId: string, problemId: string) {
  return prisma.submission.findFirst({
    where: {
      userId,
      problemId,
      isLatestAccepted: true,
    },
    include: {
      user: { select: { username: true, team: true } },
      problem: { select: { name: true, slug: true, week: true } },
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Count problems solved by a user (has at least one Accepted submission).
 */
export async function countProblemsSolved(userId: string, week?: number) {
  const where: Prisma.SubmissionWhereInput = {
    userId,
    status: "Accepted",
  };
  if (week) where.problem = { week };

  const result = await prisma.submission.findMany({
    where,
    select: { problemId: true },
    distinct: ["problemId"],
  });

  return result.length;
}

/**
 * Get average attempts before AC for a specific problem.
 */
export async function getAvgAttemptsBeforeAC(problemId: string) {
  // Get all users who eventually solved this problem
  const solvers = await prisma.submission.findMany({
    where: { problemId, status: "Accepted" },
    select: { userId: true },
    distinct: ["userId"],
  });

  if (solvers.length === 0) return 0;

  let totalAttempts = 0;

  for (const { userId } of solvers) {
    // Count submissions before first AC
    const firstAC = await prisma.submission.findFirst({
      where: { userId, problemId, status: "Accepted" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    if (firstAC) {
      const attempts = await prisma.submission.count({
        where: {
          userId,
          problemId,
          createdAt: { lte: firstAC.createdAt },
        },
      });
      totalAttempts += attempts;
    }
  }

  return totalAttempts / solvers.length;
}

/**
 * Compute dashboard statistics.
 */
export async function computeDashboardStats(week?: number) {
  const weekFilter = week ? { problem: { week } } : {};
  const submissionWhere = week ? { problem: { week } } as Prisma.SubmissionWhereInput : {};

  const [
    totalParticipants,
    totalProblems,
    totalSubmissions,
    acceptedSubmissions,
    latestSync,
    contest,
  ] = await Promise.all([
    prisma.user.count(),
    week ? prisma.problem.count({ where: { week } }) : prisma.problem.count(),
    prisma.submission.count({ where: submissionWhere }),
    prisma.submission.count({ where: { ...submissionWhere, status: "Accepted" } }),
    prisma.syncLog.findFirst({
      where: { syncStatus: "success" },
      orderBy: { createdAt: "desc" },
      select: { lastSuccessfulSync: true },
    }),
    prisma.contest.findFirst({ select: { name: true } }),
  ]);

  // Compute pending reviews (latest accepted without review)
  const latestAccepted = await getLatestAcceptedSubmissions({ week });
  const pendingReviews = latestAccepted.filter((s) => !s.review?.reviewed).length;
  const flaggedSolutions = latestAccepted.filter((s) => s.review?.flagged).length;

  return {
    totalParticipants,
    totalProblems,
    totalSubmissions,
    acceptedSubmissions,
    pendingReviews,
    flaggedSolutions,
    latestSync: latestSync?.lastSuccessfulSync || null,
    contestName: contest?.name || null,
  };
}
