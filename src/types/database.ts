// Database-related TypeScript types (beyond Prisma's auto-generated types)

export interface ParticipantWithStats {
  id: string;
  username: string;
  team: string | null;
  problemsSolved: number;
  totalAttempts: number;
  acceptedCount: number;
  wrongAnswerCount: number;
  tleCount: number;
  runtimeErrorCount: number;
  compilationErrorCount: number;
  latestActivity: Date | null;
  reviewedCount: number;
  flaggedCount: number;
  reviewedStatus: "reviewed" | "flagged" | "pending";
}

export interface ProblemWithStats {
  id: string;
  name: string;
  slug: string;
  week: number;
  contestId: string;
  maxScore: number | null;
  totalAttempts: number;
  acceptedCount: number;
  uniqueSolvers: number;
  failureCount: number;
  successRate: number;
  firstSolver: string | null;
  lastSolver: string | null;
  firstSolveTime: Date | null;
  fastestSolveTime: number | null;
}

export interface SubmissionWithRelations {
  submissionId: string;
  userId: string;
  problemId: string;
  language: string;
  status: string;
  statusCode: number | null;
  score: number;
  createdAt: Date;
  insertTime: Date;
  timeFromStart: number | null;
  duringContest: boolean;
  testcaseMessages: string | null;
  sourceCode: string | null;
  viewUrl: string | null;
  user: {
    username: string;
    team: string | null;
  };
  problem: {
    name: string;
    slug: string;
    week: number;
  };
  review: {
    id: string;
    reviewed: boolean;
    reviewer: string | null;
    flagged: boolean;
    notes: string | null;
    reviewedAt: Date | null;
  } | null;
}

export interface LatestAcceptedSubmission {
  submissionId: string;
  userId: string;
  username: string;
  problemId: string;
  problemName: string;
  problemSlug: string;
  week: number;
  language: string;
  score: number;
  createdAt: Date;
  sourceCode: string | null;
  reviewed: boolean;
  flagged: boolean;
  reviewer: string | null;
  notes: string | null;
}

export interface ParticipantProfile {
  id: string;
  username: string;
  team: string | null;
  totalSolved: number;
  totalProblems: number;
  weeks: ParticipantWeek[];
  stats: ParticipantStats;
}

export interface ParticipantWeek {
  week: number;
  problems: ParticipantProblem[];
}

export interface ParticipantProblem {
  id: string;
  name: string;
  slug: string;
  week: number;
  solved: boolean;
  attempts: SubmissionAttempt[];
  latestAccepted: SubmissionAttempt | null;
}

export interface SubmissionAttempt {
  submissionId: string;
  status: string;
  language: string;
  score: number;
  createdAt: Date;
  timeFromStart: number | null;
}

export interface ParticipantStats {
  totalAccepted: number;
  totalWrongAnswer: number;
  totalRuntimeError: number;
  totalCompilationError: number;
  totalTLE: number;
  avgAttemptsBeforeAC: number;
  acceptanceRate: number;
  firstSubmission: Date | null;
  lastSubmission: Date | null;
  languagesUsed: { language: string; count: number }[];
}

export interface DashboardStats {
  totalParticipants: number;
  totalProblems: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  pendingReviews: number;
  flaggedSolutions: number;
  latestSync: Date | null;
  contestName: string | null;
}

export interface ReviewDashboardStats {
  pendingReviews: number;
  reviewedToday: number;
  flaggedSolutions: number;
  totalToReview: number;
  reviewProgress: number;
}
