import { prisma } from "@/lib/prisma";
import { generatePaginationParams } from "@/lib/utils";
import { statsCache } from "@/lib/cache";
import { countProblemsSolved } from "@/lib/computed-queries";
import type { ParticipantWithStats, ParticipantProfile, ParticipantWeek, ParticipantProblem, SubmissionAttempt } from "@/types/database";
import type { ParticipantAnalytics, StatusBreakdown, WeeklyProgress } from "@/types/analytics";

export class ParticipantService {
  async getParticipants(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    week?: number;
    team?: string;
    contestSlug?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const { skip, take } = generatePaginationParams(page, limit);

    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { username: { contains: params.search } },
        { team: { contains: params.search } },
      ];
    }
    if (params.team) where.team = params.team;
    
    if (params.contestSlug) {
      where.submissions = {
        some: { problem: { contest: { slug: params.contestSlug } } },
      };
    }

    const [users, total, contestInfo] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          submissions: {
            select: {
              status: true,
              problemId: true,
              createdAt: true,
              isLatestAccepted: true,
              review: { select: { flagged: true, reviewed: true } },
            },
            ...(params.week || params.contestSlug
              ? { 
                  where: { 
                    problem: { 
                      ...(params.week ? { week: params.week } : {}),
                      ...(params.contestSlug ? { contest: { slug: params.contestSlug } } : {}),
                    } 
                  } 
                }
              : {}),
          },
        },
        skip,
        take,
        orderBy: params.sortBy === "username"
          ? { username: params.sortOrder || "asc" }
          : { createdAt: params.sortOrder || "desc" },
      }),
      prisma.user.count({ where }),
      params.contestSlug ? prisma.contest.findUnique({ where: { slug: params.contestSlug }, select: { totalProblems: true } }) : Promise.resolve(null)
    ]);

    const data: ParticipantWithStats[] = users.map((user) => {
      const submissions = user.submissions;
      const solvedProblems = new Set(
        submissions.filter((s) => s.status === "Accepted").map((s) => s.problemId)
      );

      return {
        id: user.id,
        username: user.username,
        team: user.team,
        totalAttempts: submissions.length,
        acceptedCount: submissions.filter((s) => s.status === "Accepted").length,
        wrongAnswerCount: submissions.filter((s) => s.status === "Wrong Answer").length,
        tleCount: submissions.filter((s) => s.status === "Time Limit Exceeded").length,
        runtimeErrorCount: submissions.filter((s) => s.status === "Runtime Error").length,
        compilationErrorCount: submissions.filter((s) => s.status === "Compilation Error").length,
        latestActivity: submissions.length > 0
          ? submissions.reduce((latest, s) =>
              s.createdAt > latest ? s.createdAt : latest,
              submissions[0].createdAt
            )
          : null,
        reviewedCount: 0,
        flaggedCount: submissions.filter((s: any) => s.review?.flagged).length,
        reviewedStatus: (submissions.filter((s: any) => s.review?.flagged).length > 0) ? "flagged" : 
          (submissions.filter((s: any) => s.isLatestAccepted).length > 0 && 
           submissions.filter((s: any) => s.isLatestAccepted).every((s: any) => s.review?.reviewed) ? "reviewed" : "pending"),
        problemsSolved: solvedProblems.size,
      };
    });

    // Default sorting
    data.sort((a, b) => {
      return a.totalAttempts - b.totalAttempts;
    });



    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + data.length < total,
      contestTotalProblems: (contestInfo as any)?.totalProblems ?? 0,
    };
  }

  async getParticipantProfile(username: string, contestSlug?: string): Promise<ParticipantProfile | null> {
    // Fetch user, contest, and leaderboard entry in parallel
    const contestFilter = contestSlug ? { contest: { slug: contestSlug } } : {};

    const [user, contest] = await Promise.all([
      prisma.user.findUnique({ where: { username } }),
      contestSlug
        ? prisma.contest.findUnique({ where: { slug: contestSlug }, select: { id: true, name: true } })
        : Promise.resolve(null),
    ]);

    // Check leaderboard + maybe create user
    const leaderboardEntry = contest
      ? await prisma.leaderboardEntry.findUnique({
          where: { contestId_username: { contestId: contest.id, username } },
        })
      : null;

    let resolvedUser = user;
    if (!resolvedUser && leaderboardEntry) {
      resolvedUser = await prisma.user.create({ data: { username } });
    }
    if (!resolvedUser) return null;

    // Fetch problems + submissions in parallel (the two heaviest queries)
    const [problems, submissions] = await Promise.all([
      prisma.problem.findMany({
        where: contestSlug ? { contest: { slug: contestSlug } } : undefined,
        orderBy: [{ week: "asc" }, { name: "asc" }],
      }),
      prisma.submission.findMany({
        where: {
          userId: resolvedUser.id,
          ...(contestSlug ? { problem: { contest: { slug: contestSlug } } } : {}),
        },
        include: {
          problem: { select: { name: true, slug: true, week: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Compute totalSolved from the submissions we already have
    const solvedProblemIds = new Set(
      submissions.filter((s) => s.status === "Accepted").map((s) => s.problemId)
    );
    const totalSolved = solvedProblemIds.size;
    const totalProblems = problems.length;

    // Group by week
    const weekMap = new Map<number, ParticipantProblem[]>();

    for (const problem of problems) {
      if (!weekMap.has(problem.week)) {
        weekMap.set(problem.week, []);
      }

      const problemSubmissions = submissions
        .filter((s) => s.problemId === problem.id)
        .map((s): SubmissionAttempt => ({
          submissionId: s.submissionId,
          status: s.status,
          language: s.language,
          score: s.score,
          createdAt: s.createdAt,
          timeFromStart: s.timeFromStart,
        }));

      const acceptedSubmissions = problemSubmissions.filter(
        (s) => s.status === "Accepted"
      );

      weekMap.get(problem.week)!.push({
        id: problem.id,
        name: problem.name,
        slug: problem.slug,
        week: problem.week,
        solved: acceptedSubmissions.length > 0,
        attempts: problemSubmissions,
        latestAccepted:
          acceptedSubmissions.length > 0
            ? acceptedSubmissions[acceptedSubmissions.length - 1]
            : null,
      });
    }

    const weeks: ParticipantWeek[] = Array.from(weekMap.entries()).map(
      ([week, probs]) => ({ week, problems: probs })
    );

    // Compute stats from in-memory data (no extra queries)
    const statusCounts = {
      accepted: submissions.filter((s) => s.status === "Accepted").length,
      wrongAnswer: submissions.filter((s) => s.status === "Wrong Answer").length,
      runtimeError: submissions.filter((s) => s.status === "Runtime Error").length,
      compilationError: submissions.filter((s) => s.status === "Compilation Error").length,
      tle: submissions.filter((s) => s.status === "Time Limit Exceeded").length,
    };

    // Languages used
    const langCounts = new Map<string, number>();
    submissions.forEach((s) => {
      langCounts.set(s.language, (langCounts.get(s.language) || 0) + 1);
    });

    const languagesUsed = Array.from(langCounts.entries())
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    // Avg attempts before AC
    let totalAttemptsBeforeAC = 0;
    let solvedCount = 0;
    for (const week of weeks) {
      for (const problem of week.problems) {
        if (problem.solved && problem.latestAccepted) {
          const attemptsBeforeAC = problem.attempts.filter(
            (a) => a.createdAt <= problem.latestAccepted!.createdAt
          ).length;
          totalAttemptsBeforeAC += attemptsBeforeAC;
          solvedCount++;
        }
      }
    }

    return {
      id: resolvedUser.id,
      username: resolvedUser.username,
      team: resolvedUser.team,
      contestName: contest?.name || null,
      totalSolved,
      totalProblems,
      weeks,
      stats: {
        totalAccepted: statusCounts.accepted,
        totalWrongAnswer: statusCounts.wrongAnswer,
        totalRuntimeError: statusCounts.runtimeError,
        totalCompilationError: statusCounts.compilationError,
        totalTLE: statusCounts.tle,
        avgAttemptsBeforeAC: solvedCount > 0 ? totalAttemptsBeforeAC / solvedCount : 0,
        acceptanceRate: submissions.length > 0
          ? (statusCounts.accepted / submissions.length) * 100
          : 0,
        firstSubmission: submissions.length > 0 ? submissions[0].createdAt : null,
        lastSubmission: submissions.length > 0
          ? submissions[submissions.length - 1].createdAt
          : null,
        languagesUsed,
      },
      leaderboard: leaderboardEntry ? {
        hrRank: leaderboardEntry.hrRank,
        officialRank: leaderboardEntry.officialRank,
        score: leaderboardEntry.score,
        timeTaken: leaderboardEntry.timeTaken
      } : null,
    };
  }

  async getParticipantAnalytics(username: string): Promise<ParticipantAnalytics | null> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) return null;

    const cacheKey = `participant_analytics:${username}`;
    return statsCache.getOrCompute(cacheKey, async () => {
      const submissions = await prisma.submission.findMany({
        where: { userId: user.id },
        include: {
          problem: { select: { week: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const statusBreakdown: StatusBreakdown = {
        accepted: 0,
        wrongAnswer: 0,
        tle: 0,
        runtimeError: 0,
        compilationError: 0,
        other: 0,
        total: submissions.length,
      };

      submissions.forEach((s) => {
        switch (s.status) {
          case "Accepted": statusBreakdown.accepted++; break;
          case "Wrong Answer": statusBreakdown.wrongAnswer++; break;
          case "Time Limit Exceeded": statusBreakdown.tle++; break;
          case "Runtime Error": statusBreakdown.runtimeError++; break;
          case "Compilation Error": statusBreakdown.compilationError++; break;
          default: statusBreakdown.other++; break;
        }
      });

      // Language distribution
      const langMap = new Map<string, number>();
      submissions.forEach((s) => {
        langMap.set(s.language, (langMap.get(s.language) || 0) + 1);
      });
      const languagesUsed = Array.from(langMap.entries())
        .map(([language, count]) => ({
          language,
          displayName: language,
          count,
          percentage: (count / submissions.length) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      // Heatmap
      const heatmap: { day: number; hour: number; count: number }[] = [];
      const heatmapMap = new Map<string, number>();
      submissions.forEach((s) => {
        const d = new Date(s.createdAt);
        const key = `${d.getDay()}:${d.getHours()}`;
        heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
      });
      heatmapMap.forEach((count, key) => {
        const [day, hour] = key.split(":").map(Number);
        heatmap.push({ day, hour, count });
      });

      // Daily activity
      const dailyMap = new Map<string, { submissions: number; accepted: number }>();
      submissions.forEach((s) => {
        const dateKey = new Date(s.createdAt).toISOString().split("T")[0];
        const entry = dailyMap.get(dateKey) || { submissions: 0, accepted: 0 };
        entry.submissions++;
        if (s.status === "Accepted") entry.accepted++;
        dailyMap.set(dateKey, entry);
      });
      const dailyActivity = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          submissions: data.submissions,
          accepted: data.accepted,
          participants: 1,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Weekly progress
      const weekMap = new Map<number, { solved: Set<string>; total: number; attempts: number }>();
      const problems = await prisma.problem.findMany({ select: { id: true, week: true } });
      const problemWeeks = new Map(problems.map((p) => [p.id, p.week]));
      const weekProblemCounts = new Map<number, number>();
      problems.forEach((p) => {
        weekProblemCounts.set(p.week, (weekProblemCounts.get(p.week) || 0) + 1);
      });

      submissions.forEach((s) => {
        const week = problemWeeks.get(s.problemId) || 1;
        if (!weekMap.has(week)) {
          weekMap.set(week, { solved: new Set(), total: weekProblemCounts.get(week) || 0, attempts: 0 });
        }
        const entry = weekMap.get(week)!;
        entry.attempts++;
        if (s.status === "Accepted") entry.solved.add(s.problemId);
      });

      const weeklyProgress: WeeklyProgress[] = Array.from(weekMap.entries())
        .map(([week, data]) => ({
          week,
          solved: data.solved.size,
          total: data.total,
          attempts: data.attempts,
        }))
        .sort((a, b) => a.week - b.week);

      // Avg attempts before AC
      const solvedProblems = new Set<string>();
      let totalAttemptsBeforeAC = 0;
      const problemAttempts = new Map<string, number>();

      submissions.forEach((s) => {
        if (!solvedProblems.has(s.problemId)) {
          problemAttempts.set(s.problemId, (problemAttempts.get(s.problemId) || 0) + 1);
          if (s.status === "Accepted") {
            solvedProblems.add(s.problemId);
            totalAttemptsBeforeAC += problemAttempts.get(s.problemId)!;
          }
        }
      });

      const avgAttemptsBeforeAC = solvedProblems.size > 0
        ? totalAttemptsBeforeAC / solvedProblems.size
        : 0;

      return {
        username: user.username,
        statusBreakdown,
        avgAttemptsBeforeAC,
        acceptanceRate: submissions.length > 0
          ? (statusBreakdown.accepted / submissions.length) * 100
          : 0,
        firstSubmission: submissions.length > 0 ? submissions[0].createdAt : null,
        lastSubmission: submissions.length > 0 ? submissions[submissions.length - 1].createdAt : null,
        languagesUsed,
        heatmap,
        dailyActivity,
        weeklyProgress,
      };
    });
  }
}

export const participantService = new ParticipantService();
