import { prisma } from "@/lib/prisma";
import { statsCache } from "@/lib/cache";
import { LANGUAGE_DISPLAY_NAMES } from "@/lib/constants";
import type { GlobalAnalytics, DailyActivity, HeatmapEntry, LanguageCount, ProblemAttemptStats, ProblemSolverStats, ProblemFailureRate, WeeklyTrend } from "@/types/analytics";

export class AnalyticsService {
  async getGlobalAnalytics(week?: number): Promise<GlobalAnalytics> {
    const cacheKey = `global_analytics:${week || "all"}`;
    return statsCache.getOrCompute(cacheKey, async () => {
      const whereSubmission = week ? { problem: { week } } : {};

      const submissions = await prisma.submission.findMany({
        where: whereSubmission,
        include: {
          user: { select: { username: true } },
          problem: { select: { name: true, slug: true, week: true, id: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const problems = await prisma.problem.findMany({
        where: week ? { week } : {},
        orderBy: [{ week: "asc" }, { name: "asc" }],
      });

      // Avg attempts before AC per problem
      const avgAttemptsBeforeAC: ProblemAttemptStats[] = problems.map((problem) => {
        const problemSubs = submissions.filter((s) => s.problemId === problem.id);
        const solvers = new Map<string, number>();
        const userAttempts = new Map<string, number>();

        problemSubs.forEach((s) => {
          if (!solvers.has(s.userId)) {
            userAttempts.set(s.userId, (userAttempts.get(s.userId) || 0) + 1);
            if (s.status === "Accepted") {
              solvers.set(s.userId, userAttempts.get(s.userId)!);
            }
          }
        });

        const attempts = Array.from(solvers.values());
        const avg = attempts.length > 0
          ? attempts.reduce((a, b) => a + b, 0) / attempts.length
          : 0;

        return {
          problemName: problem.name,
          problemSlug: problem.slug,
          week: problem.week,
          avgAttempts: Math.round(avg * 10) / 10,
          medianAttempts: attempts.length > 0
            ? attempts.sort((a, b) => a - b)[Math.floor(attempts.length / 2)]
            : 0,
          maxAttempts: attempts.length > 0 ? Math.max(...attempts) : 0,
        };
      });

      // Language distribution
      const langMap = new Map<string, number>();
      submissions.forEach((s) => {
        langMap.set(s.language, (langMap.get(s.language) || 0) + 1);
      });
      const languageDistribution: LanguageCount[] = Array.from(langMap.entries())
        .map(([language, count]) => ({
          language,
          displayName: LANGUAGE_DISPLAY_NAMES[language] || language,
          count,
          percentage: submissions.length > 0 ? (count / submissions.length) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Submission heatmap
      const heatmapMap = new Map<string, number>();
      submissions.forEach((s) => {
        const d = new Date(s.createdAt);
        const key = `${d.getDay()}:${d.getHours()}`;
        heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
      });
      const submissionHeatmap: HeatmapEntry[] = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          submissionHeatmap.push({
            day,
            hour,
            count: heatmapMap.get(`${day}:${hour}`) || 0,
          });
        }
      }

      // Solver stats per problem
      const solverStats: ProblemSolverStats[] = problems.map((problem) => {
        const accepted = submissions
          .filter((s) => s.problemId === problem.id && s.status === "Accepted")
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        const uniqueSolvers = new Set(accepted.map((s) => s.userId));
        const first = accepted[0];
        const last = accepted[accepted.length - 1];

        const withTime = accepted.filter((s) => s.timeFromStart != null);
        const fastest = withTime.length > 0
          ? withTime.reduce((min, s) =>
              (s.timeFromStart || Infinity) < (min.timeFromStart || Infinity) ? s : min
            )
          : null;

        return {
          problemName: problem.name,
          problemSlug: problem.slug,
          week: problem.week,
          firstSolver: first?.user.username || null,
          firstSolveTime: first?.createdAt || null,
          lastSolver: last?.user.username || null,
          lastSolveTime: last?.createdAt || null,
          fastestSolveMs: fastest?.timeFromStart ? fastest.timeFromStart * 1000 : null,
          fastestSolver: fastest?.user.username || null,
          totalSolvers: uniqueSolvers.size,
        };
      });

      // Failure rates
      const failureRates: ProblemFailureRate[] = problems.map((problem) => {
        const problemSubs = submissions.filter((s) => s.problemId === problem.id);
        const failed = problemSubs.filter((s) => s.status !== "Accepted");
        return {
          problemName: problem.name,
          problemSlug: problem.slug,
          week: problem.week,
          totalAttempts: problemSubs.length,
          failedAttempts: failed.length,
          failureRate: problemSubs.length > 0
            ? (failed.length / problemSubs.length) * 100
            : 0,
        };
      }).sort((a, b) => b.failureRate - a.failureRate);

      // Daily activity
      const dailyMap = new Map<string, { submissions: number; accepted: number; users: Set<string> }>();
      submissions.forEach((s) => {
        const dateKey = new Date(s.createdAt).toISOString().split("T")[0];
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, { submissions: 0, accepted: 0, users: new Set() });
        }
        const entry = dailyMap.get(dateKey)!;
        entry.submissions++;
        entry.users.add(s.userId);
        if (s.status === "Accepted") entry.accepted++;
      });
      const dailyActivity: DailyActivity[] = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          submissions: data.submissions,
          accepted: data.accepted,
          participants: data.users.size,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Weekly trends
      const weekMap = new Map<number, { subs: number; acc: number; users: Set<string>; attemptsBefore: number; solvers: number }>();
      submissions.forEach((s) => {
        const w = s.problem.week;
        if (!weekMap.has(w)) {
          weekMap.set(w, { subs: 0, acc: 0, users: new Set(), attemptsBefore: 0, solvers: 0 });
        }
        const entry = weekMap.get(w)!;
        entry.subs++;
        entry.users.add(s.userId);
        if (s.status === "Accepted") entry.acc++;
      });
      const weeklyTrends: WeeklyTrend[] = Array.from(weekMap.entries())
        .map(([w, data]) => ({
          week: w,
          totalSubmissions: data.subs,
          totalAccepted: data.acc,
          totalParticipants: data.users.size,
          avgAttemptsBeforeAC: data.solvers > 0 ? data.attemptsBefore / data.solvers : 0,
        }))
        .sort((a, b) => a.week - b.week);

      return {
        avgAttemptsBeforeAC,
        languageDistribution,
        submissionHeatmap,
        solverStats,
        failureRates,
        dailyActivity,
        weeklyTrends,
      };
    });
  }
}

export const analyticsService = new AnalyticsService();
