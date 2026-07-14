// API request/response types

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  week?: number;
  status?: string;
  userId?: string;
  problemId?: string;
  reviewed?: string;
  flagged?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SyncRequest {
  contestSlug: string;
  cookie: string;
  fullSync?: boolean;
}

export interface SyncResponse {
  syncId: string;
  status: "started" | "error";
  message?: string;
}

export interface ReviewUpdateRequest {
  submissionId: string;
  reviewed?: boolean;
  flagged?: boolean;
  reviewer?: string;
  notes?: string;
}

export interface SettingsUpdateRequest {
  contestSlug?: string;
  cookie?: string;
  syncInterval?: number;
}

export interface SearchRequest {
  query: string;
  type?: "all" | "participants" | "problems" | "submissions";
  limit?: number;
}

export interface SearchResults {
  participants: Array<{
    username: string;
    team: string | null;
    problemsSolved: number;
  }>;
  problems: Array<{
    name: string;
    slug: string;
    week: number;
  }>;
  submissions: Array<{
    submissionId: string;
    username: string;
    problemName: string;
    status: string;
    language: string;
    createdAt: Date;
  }>;
}

export interface ReplayRequest {
  week: number;
  contestId?: string;
}

export interface ReplayData {
  week: number;
  leaderboard: Array<{
    username: string;
    team: string | null;
    solved: number;
    totalAttempts: number;
    score: number;
    lastSubmission: Date | null;
  }>;
  solvedCounts: Record<string, number>;
  totalSubmissions: number;
  totalAccepted: number;
  participantCount: number;
}
