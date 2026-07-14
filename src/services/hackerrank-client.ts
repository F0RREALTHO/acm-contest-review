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

      console.log("================================");
      console.log("Endpoint:", url);
      console.log("REQUEST URL:", url);
      console.log("COOKIE HEADER:", cookieHeader);
      console.log("================================");

      const response = await fetch(url, {
        headers: {
          Cookie: cookieHeader,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      console.log("HTTP Status:", response.status);
      console.log("Content-Type:", response.headers.get("content-type"));

      const body = await response.text();
      console.log("RESPONSE PREVIEW:");
      console.log(body.substring(0, 500));

      if (body.trim().toLowerCase().startsWith("<!doctype html>") || body.trim().toLowerCase().startsWith("<html")) {
        console.log("Authentication failed.\nReceived HTML instead of JSON.");
        throw new Error("Authentication failed. Received HTML instead of JSON.");
      }

      if (response.status === 429) {
        throw new Error("HTTP 429 Rate Limited");
      }

      if (response.status >= 500 && retryCount < this.maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.log(`Server error ${response.status}. Retrying in ${waitTime}ms...`);
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
        console.log(`Network error. Retrying in ${waitTime}ms...`);
        await this.delay(waitTime);
        return this.fetchWithRetry(url, retryCount + 1);
      }
      throw error;
    }
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
    const allChallenges: HRChallengesResponse["models"] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const data = await this.getChallenges(slug, offset, limit);
      allChallenges.push(...data.models);
      if (allChallenges.length >= data.total || data.models.length < limit) {
        break;
      }
      offset += limit;
    }

    return allChallenges;
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
    const entries: any[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const data = await this.getLeaderboard(slug, offset, limit);
      if (!data.models || data.models.length === 0) {
        break;
      }
      entries.push(...data.models);
      if (entries.length >= data.total || data.models.length < limit) {
        break;
      }
      offset += limit;
    }

    return entries;
  }
}
