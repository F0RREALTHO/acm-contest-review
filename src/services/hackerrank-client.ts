import {
  HRContestResponse,
  HRChallengesResponse,
  HRSubmissionsResponse,
  HRSubmissionDetailResponse,
} from "@/types/hackerrank";
import { HACKERRANK_BASE_URL } from "@/lib/constants";

interface HackerRankClientOptions {
  cookie: string;
  delayMs?: number;
  maxRetries?: number;
}

export class HackerRankClient {
  private cookie: string;
  private delayMs: number;
  private maxRetries: number;
  private baseUrl: string;

  constructor(options: HackerRankClientOptions) {
    this.cookie = options.cookie;
    this.delayMs = options.delayMs ?? 1000;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseUrl = HACKERRANK_BASE_URL;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(
    url: string,
    retryCount = 0
  ): Promise<Response> {
    try {
      await this.delay(this.delayMs);

      const cookieHeader = this.cookie.includes("=")
        ? this.cookie
        : `_hrank_session=${this.cookie}`;

      const response = await fetch(url, {
        headers: {
          Cookie: cookieHeader,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const body = await response.text();

      if (body.trim().toLowerCase().startsWith("<!doctype html>") || body.trim().toLowerCase().startsWith("<html")) {
        throw new Error("Authentication failed. Received HTML instead of JSON.");
      }

      if (response.status === 429) {
        throw new Error("HTTP 429 Rate Limited");
      }

      if (response.status >= 500 && retryCount < this.maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.log(`[HR] Server error ${response.status}, retrying in ${waitTime}ms...`);
        await this.delay(waitTime);
        return this.fetchWithRetry(url, retryCount + 1);
      }

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} for ${url}`
        );
      }

      return new Response(body, {
        status: response.status,
        headers: response.headers,
      });
    } catch (error) {
      if (retryCount < this.maxRetries && error instanceof TypeError) {
        // Network error — retry
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.log(`[HR] Network error, retrying in ${waitTime}ms...`);
        await this.delay(waitTime);
        return this.fetchWithRetry(url, retryCount + 1);
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Generic parallel page fetcher
  // Fetches paginated API results with up to `concurrency` pages in flight.
  // `fetchPage` should return { models: T[], total: number }.
  // ---------------------------------------------------------------------------
  private async fetchAllPages<T>(
    fetchPage: (offset: number, limit: number) => Promise<{ models: T[]; total: number }>,
    limit: number = 100,
    concurrency: number = 5
  ): Promise<T[]> {
    // First page is always fetched alone so we know the total
    const firstPage = await fetchPage(0, limit);
    const allItems: T[] = [...firstPage.models];
    const total = firstPage.total;

    if (allItems.length >= total || firstPage.models.length < limit) {
      return allItems;
    }

    // Build remaining offsets
    const offsets: number[] = [];
    for (let offset = limit; offset < total; offset += limit) {
      offsets.push(offset);
    }

    // Fetch remaining pages in parallel batches
    for (let i = 0; i < offsets.length; i += concurrency) {
      const batch = offsets.slice(i, i + concurrency);
      const pages = await Promise.all(
        batch.map((offset) => fetchPage(offset, limit))
      );
      for (const page of pages) {
        allItems.push(...page.models);
      }
    }

    return allItems;
  }

  async getContest(slug: string): Promise<HRContestResponse> {
    const url = `${this.baseUrl}/rest/contests/${slug}`;
    const response = await this.fetchWithRetry(url);
    return response.json();
  }

  async getChallenges(
    slug: string,
    offset = 0,
    limit = 100
  ): Promise<HRChallengesResponse> {
    const url = `${this.baseUrl}/rest/contests/${slug}/challenges?offset=${offset}&limit=${limit}`;
    const response = await this.fetchWithRetry(url);
    return response.json();
  }

  async getAllChallenges(slug: string): Promise<HRChallengesResponse["models"]> {
    return this.fetchAllPages(
      (offset, limit) => this.getChallenges(slug, offset, limit),
      100,
      5
    );
  }

  async getSubmissions(
    slug: string,
    offset = 0,
    limit = 100
  ): Promise<HRSubmissionsResponse> {
    const url = `${this.baseUrl}/rest/contests/${slug}/judge_submissions?offset=${offset}&limit=${limit}`;
    const response = await this.fetchWithRetry(url);
    return response.json();
  }

  /**
   * Fetch ALL submissions in parallel (full sync mode).
   * Uses the generic parallel page fetcher — up to `concurrency` pages in flight.
   */
  async getAllSubmissionsParallel(
    slug: string,
    concurrency: number = 5,
    onProgress?: (fetched: number, total: number) => void
  ): Promise<{ models: HRSubmissionsResponse["models"]; total: number }> {
    // First page alone to discover total
    const firstPage = await this.getSubmissions(slug, 0, 100);
    const total = firstPage.total;
    const allModels = [...firstPage.models];

    if (onProgress) onProgress(allModels.length, total);

    if (allModels.length >= total || firstPage.models.length < 100) {
      return { models: allModels, total };
    }

    // Build remaining offsets
    const offsets: number[] = [];
    for (let offset = 100; offset < total; offset += 100) {
      offsets.push(offset);
    }

    // Fetch in parallel batches
    for (let i = 0; i < offsets.length; i += concurrency) {
      const batch = offsets.slice(i, i + concurrency);
      const pages = await Promise.all(
        batch.map((offset) => this.getSubmissions(slug, offset, 100))
      );
      for (const page of pages) {
        allModels.push(...page.models);
      }
      if (onProgress) onProgress(allModels.length, total);
    }

    return { models: allModels, total };
  }

  async getSubmissionDetail(
    contestSlug: string,
    challengeSlug: string,
    submissionId: number
  ): Promise<HRSubmissionDetailResponse> {
    const url = `${this.baseUrl}/rest/contests/${contestSlug}/challenges/${challengeSlug}/submissions/${submissionId}`;
    const response = await this.fetchWithRetry(url);
    return response.json();
  }

  async getLeaderboard(
    slug: string,
    offset = 0,
    limit = 100
  ): Promise<any> {
    const url = `${this.baseUrl}/rest/contests/${slug}/leaderboard?offset=${offset}&limit=${limit}&include_practice=true`;
    const response = await this.fetchWithRetry(url);
    return response.json();
  }

  async getAllLeaderboardEntries(slug: string): Promise<any[]> {
    return this.fetchAllPages(
      (offset, limit) => this.getLeaderboard(slug, offset, limit),
      100,
      5
    );
  }
}
