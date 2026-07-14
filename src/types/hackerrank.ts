// HackerRank API response types (internal/undocumented endpoints)

export interface HRContestResponse {
  model: {
    id: number;
    name: string;
    slug: string;
    description?: string;
    started: boolean;
    ended: boolean;
    epoch_starttime?: number;
    epoch_endtime?: number;
    challenges_count: number;
  };
}

export interface HRChallenge {
  id: number;
  name: string;
  slug: string;
  max_score: number;
  difficulty?: string;
  category?: string;
}

export interface HRChallengesResponse {
  models: HRChallenge[];
  total: number;
}

export interface HRSubmission {
  id: number;
  hacker_id: number;
  hacker_username?: string;
  hacker: string;
  challenge_id: number;
  challenge_slug?: string;
  challenge: {
    name: string;
    slug: string;
  };
  contest_id: number;
  status: string;
  status_code: number;
  kind: string;
  language: string;
  score: number;
  created_at: string;
  time_from_start?: number;
  in_contest_bounds?: boolean;
  testcase_message?: string[];
}

export interface HRSubmissionsResponse {
  models: HRSubmission[];
  total: number;
}

export interface HRSubmissionDetail extends HRSubmission {
  code: string;
  compilemessage?: string;
  testcase_message?: string[];
}

export interface HRSubmissionDetailResponse {
  model: HRSubmissionDetail;
}

export interface HRLeaderboardEntry {
  rank: number;
  hacker: string;
  score: number;
  time_taken: number;
  challenges: Record<string, {
    score: number;
    time_taken: number;
  }>;
}

export interface HRLeaderboardResponse {
  models: HRLeaderboardEntry[];
  total: number;
}
