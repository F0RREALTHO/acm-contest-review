// Analytics computation types

export interface GlobalAnalytics {
  avgAttemptsBeforeAC: ProblemAttemptStats[];
  languageDistribution: LanguageCount[];
  submissionHeatmap: HeatmapEntry[];
  solverStats: ProblemSolverStats[];
  failureRates: ProblemFailureRate[];
  dailyActivity: DailyActivity[];
  weeklyTrends: WeeklyTrend[];
}

export interface ProblemAttemptStats {
  problemName: string;
  problemSlug: string;
  week: number;
  avgAttempts: number;
  medianAttempts: number;
  maxAttempts: number;
}

export interface LanguageCount {
  language: string;
  displayName: string;
  count: number;
  percentage: number;
}

export interface HeatmapEntry {
  day: number;   // 0-6 (Sun-Sat)
  hour: number;  // 0-23
  count: number;
}

export interface ProblemSolverStats {
  problemName: string;
  problemSlug: string;
  week: number;
  firstSolver: string | null;
  firstSolveTime: Date | null;
  lastSolver: string | null;
  lastSolveTime: Date | null;
  fastestSolveMs: number | null;
  fastestSolver: string | null;
  totalSolvers: number;
}

export interface ProblemFailureRate {
  problemName: string;
  problemSlug: string;
  week: number;
  totalAttempts: number;
  failedAttempts: number;
  failureRate: number;
}

export interface DailyActivity {
  date: string;
  submissions: number;
  accepted: number;
  participants: number;
}

export interface WeeklyTrend {
  week: number;
  totalSubmissions: number;
  totalAccepted: number;
  totalParticipants: number;
  avgAttemptsBeforeAC: number;
}

export interface ParticipantAnalytics {
  username: string;
  statusBreakdown: StatusBreakdown;
  avgAttemptsBeforeAC: number;
  acceptanceRate: number;
  firstSubmission: Date | null;
  lastSubmission: Date | null;
  languagesUsed: LanguageCount[];
  heatmap: HeatmapEntry[];
  dailyActivity: DailyActivity[];
  weeklyProgress: WeeklyProgress[];
}

export interface StatusBreakdown {
  accepted: number;
  wrongAnswer: number;
  tle: number;
  runtimeError: number;
  compilationError: number;
  other: number;
  total: number;
}

export interface WeeklyProgress {
  week: number;
  solved: number;
  total: number;
  attempts: number;
}

export interface ProblemAnalytics {
  problemName: string;
  problemSlug: string;
  week: number;
  totalAttempts: number;
  acceptedCount: number;
  failureCount: number;
  successPercentage: number;
  avgAttemptsBeforeAC: number;
  firstSolver: { username: string; time: Date } | null;
  lastSolver: { username: string; time: Date } | null;
  fastestSolve: { username: string; timeMs: number } | null;
  solveTimeline: Array<{ username: string; time: Date; attempts: number }>;
  languageDistribution: LanguageCount[];
  statusDistribution: { status: string; count: number }[];
}
