import { prisma } from "@/lib/prisma";
import { statsCache } from "@/lib/cache";
import { HackerRankClient } from "@/services/hackerrank-client";
import { syncEvents, SyncProgressEvent, SyncPhase } from "@/types/sync";
import { HRSubmission } from "@/types/hackerrank";

interface SyncOptions {
  contestSlug: string;
  cookie: string;
  fullSync?: boolean;
}

interface SyncResult {
  submissionsAdded: number;
  participantsAdded: number;
  acceptedAdded: number;
  duration: number;
  syncStatus: "success" | "error";
  errorMessage?: string;
}

export class SyncEngine {
  private client: HackerRankClient;
  private contestSlug: string;
  private startTime: number = 0;
  private isRunning = false;
  private currentProgress: SyncProgressEvent | null = null;

  constructor(options: SyncOptions) {
    this.client = new HackerRankClient({
      cookie: options.cookie,
      delayMs: 200,
    });
    this.contestSlug = options.contestSlug;
  }

  private emitProgress(
    phase: SyncPhase,
    message: string,
    current: number,
    total: number | null
  ) {
    const elapsed = Date.now() - this.startTime;
    let estimatedRemaining: number | null = null;

    if (total && current > 0) {
      estimatedRemaining = (elapsed / current) * (total - current);
    }

    const event: SyncProgressEvent = {
      phase,
      message,
      current,
      total,
      elapsedMs: elapsed,
      estimatedRemainingMs: estimatedRemaining,
    };

    this.currentProgress = event;
    syncEvents.emit(event);
  }

  public getProgress(): SyncProgressEvent | null {
    return this.currentProgress;
  }

  async run(fullSync = false): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error("Sync is already running");
    }

    this.isRunning = true;
    this.startTime = Date.now();

    let syncLogId: string | undefined;

    console.log("Starting sync");
    console.log("Contest:", this.contestSlug);

    try {
      // PHASE 1: Fetch contest metadata
      this.emitProgress("fetching_contest", "Fetching contest information...", 0, null);
      const contestData = await this.client.getContest(this.contestSlug);
      console.log("Contest fetched");

      const contestInfo = contestData.model;

      const contest = await prisma.contest.upsert({
        where: { slug: this.contestSlug },
        update: {
          name: contestInfo.name,
          description: contestInfo.description || null,
          startTime: contestInfo.epoch_starttime ? new Date(contestInfo.epoch_starttime * 1000) : null,
          endTime: contestInfo.epoch_endtime ? new Date(contestInfo.epoch_endtime * 1000) : null,
          totalProblems: contestInfo.challenges_count,
        },
        create: {
          name: contestInfo.name,
          slug: this.contestSlug,
          description: contestInfo.description || null,
          startTime: contestInfo.epoch_starttime ? new Date(contestInfo.epoch_starttime * 1000) : null,
          endTime: contestInfo.epoch_endtime ? new Date(contestInfo.epoch_endtime * 1000) : null,
          totalProblems: contestInfo.challenges_count,
        },
      });

      // Create SyncLog entry
      const syncLog = await prisma.syncLog.create({
        data: {
          contestId: contest.id,
          syncStatus: "in_progress",
        },
      });
      syncLogId = syncLog.id;

      // PHASE 2: Fetch all challenges
      this.emitProgress("fetching_problems", "Fetching problems...", 0, null);
      const challenges = await this.client.getAllChallenges(this.contestSlug);
      console.log("Problems fetched");
      console.log("Problems:", challenges.length);
      console.log("Saving problems...");

      for (let i = 0; i < challenges.length; i++) {
        const challenge = challenges[i];
        await prisma.problem.upsert({
          where: {
            slug_contestId: {
              slug: challenge.slug,
              contestId: contest.id,
            },
          },
          update: {
            name: challenge.name,
            maxScore: challenge.max_score,
          },
          create: {
            name: challenge.name,
            slug: challenge.slug,
            contestId: contest.id,
            maxScore: challenge.max_score,
            week: Math.ceil((i + 1) / challenges.length * (Math.max(1, Math.ceil(challenges.length / 4)))), // Distribute across weeks
          },
        });
      }

      this.emitProgress("fetching_problems", `Fetched ${challenges.length} problems`, challenges.length, challenges.length);

      // Get the last known submission ID & timestamp for incremental sync
      const lastSync = fullSync
        ? null
        : await prisma.syncLog.findFirst({
            where: { contestId: contest.id, syncStatus: "success" },
            orderBy: { createdAt: "desc" },
            select: { newestSubmissionId: true, newestSubmissionTime: true },
          });

      const knownNewestId = lastSync?.newestSubmissionId;
      const knownNewestTime = lastSync?.newestSubmissionTime;

      // PHASE 3: Download submissions (newest to oldest)
      this.emitProgress("downloading_submissions", "Downloading submissions...", 0, null);

      const newSubmissions: HRSubmission[] = [];
      let offset = 0;
      const limit = 100;
      let stopPagination = false;
      let totalSubmissions: number | null = null;

      while (!stopPagination) {
        const page = await this.client.getSubmissions(this.contestSlug, offset, limit);
        if (totalSubmissions === null) totalSubmissions = page.total;

        for (const submission of page.models) {
          const subId = String(submission.id);
          const subTime = new Date((submission.created_at as any as number) * 1000);

          if (knownNewestId && subId === knownNewestId && knownNewestTime && subTime.getTime() <= knownNewestTime.getTime()) {
            stopPagination = true;
            break;
          }

          newSubmissions.push(submission);
        }

        this.emitProgress(
          "downloading_submissions",
          `Downloaded ${newSubmissions.length} new submissions...`,
          newSubmissions.length,
          knownNewestId ? null : totalSubmissions
        );

        if (page.models.length < limit || stopPagination) {
          break;
        }

        offset += limit;
      }

      console.log("Submissions fetched");
      console.log("Submissions:", newSubmissions.length);

      if (newSubmissions.length === 0) {
        // Nothing new — update sync log and return
        await prisma.$transaction([
          prisma.syncLog.update({
            where: { id: syncLogId },
            data: {
              lastSuccessfulSync: new Date(),
              newestSubmissionId: knownNewestId,
              newestSubmissionTime: knownNewestTime,
              submissionsAdded: 0,
              participantsAdded: 0,
              acceptedAdded: 0,
              duration: Date.now() - this.startTime,
              syncStatus: "success",
            },
          }),
          prisma.contest.update({
            where: { id: contest.id },
            data: { lastSync: new Date() }
          })
        ]);

        const result: SyncResult = {
          submissionsAdded: 0,
          participantsAdded: 0,
          acceptedAdded: 0,
          duration: Date.now() - this.startTime,
          syncStatus: "success",
        };

        this.emitProgress("complete", "Already up to date!", 0, 0);
        return result;
      }

      // PHASE 4: Fetch source code and save to database
      let participantsAdded = 0;
      let acceptedAdded = 0;
      const problemMap = new Map<string, string>();
      const problems = await prisma.problem.findMany({
        where: { contestId: contest.id },
        select: { id: true, slug: true },
      });
      problems.forEach((p) => problemMap.set(p.slug, p.id));

      console.log("Saving submissions...");
      const latestAcceptedMap = new Set<string>();

      for (let i = 0; i < newSubmissions.length; i++) {
        const sub = newSubmissions[i];

        this.emitProgress(
          "saving_to_database",
          `Saving submission metadata (${i + 1}/${newSubmissions.length})...`,
          i + 1,
          newSubmissions.length
        );
        const username = sub.hacker_username || sub.hacker || `user_${sub.hacker_id}`;
        const existingUser = await prisma.user.findUnique({
          where: { username },
          select: { id: true },
        });

        let userId: string;
        if (existingUser) {
          userId = existingUser.id;
        } else {
          const newUser = await prisma.user.create({
            data: { username },
          });
          userId = newUser.id;
          participantsAdded++;
        }

        // Resolve problem ID
        const challengeSlug = sub.challenge?.slug || sub.challenge_slug || "";
        let problemId = problemMap.get(challengeSlug);

        if (!problemId) {
          // Create problem if it doesn't exist (edge case)
          const newProblem = await prisma.problem.create({
            data: {
              name: sub.challenge?.name || challengeSlug,
              slug: challengeSlug,
              contestId: contest.id,
              week: 1,
            },
          });
          problemId = newProblem.id;
          problemMap.set(challengeSlug, problemId);
        }

        // O(n) mapping of latest accepted
        let isLatestAccepted = false;
        if (sub.status === "Accepted") {
          const key = `${userId}_${problemId}`;
          if (!latestAcceptedMap.has(key)) {
            latestAcceptedMap.add(key);
            isLatestAccepted = true;
            
            // Unmark previous latest accepted for this user/problem in the database
            await prisma.submission.updateMany({
              where: { userId, problemId, isLatestAccepted: true },
              data: { isLatestAccepted: false }
            });
          }
        }

        const createdAtDate = new Date((sub.created_at as any as number) * 1000);

        await prisma.submission.upsert({
          where: { submissionId: String(sub.id) },
          update: {
            isLatestAccepted
          },
          create: {
            submissionId: String(sub.id),
            userId,
            problemId,
            language: sub.language || "unknown",
            status: sub.status || "Unknown",
            statusCode: sub.status_code,
            score: sub.score || 0,
            createdAt: createdAtDate,
            timeFromStart: sub.time_from_start || null,
            duringContest: sub.in_contest_bounds ?? true,
            testcaseMessages: sub.testcase_message
              ? JSON.stringify(sub.testcase_message)
              : null,
            isLatestAccepted,
            viewUrl: `/submissions/${sub.id}`,
          },
        });

        if (sub.status === "Accepted") {
          acceptedAdded++;
        }
      }

      // PHASE 5: Fetch Official Leaderboard
      this.emitProgress("fetching_leaderboard", "Fetching official leaderboard...", 0, null);

      const officialLeaderboard = await this.client.getAllLeaderboardEntries(this.contestSlug);

      console.log(`Fetched ${officialLeaderboard.length} official leaderboard entries.`);
      this.emitProgress("saving_to_database", "Saving official leaderboard...", 0, officialLeaderboard.length);

      // Delete existing leaderboard entries for this contest
      await prisma.leaderboardEntry.deleteMany({
        where: { contestId: contest.id }
      });

      // Insert new entries
      for (let i = 0; i < officialLeaderboard.length; i++) {
        const entry = officialLeaderboard[i];
        
        await prisma.leaderboardEntry.create({
          data: {
            contestId: contest.id,
            username: entry.hacker,
            hrRank: entry.rank,
            officialRank: entry.index + 1,
            score: entry.score,
            timeTaken: entry.time_taken,
            avatar: entry.avatar || null,
            country: entry.country || null,
          }
        });
      }

      // PHASE 6: Update SyncLog
      const newestId = String(newSubmissions[0].id);
      const newestTime = new Date((newSubmissions[0].created_at as any as number) * 1000);
      const duration = Date.now() - this.startTime;

      await prisma.$transaction([
        prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            lastSuccessfulSync: new Date(),
            newestSubmissionId: newestId,
            newestSubmissionTime: newestTime,
            submissionsAdded: newSubmissions.length,
            participantsAdded,
            acceptedAdded,
            duration,
            syncStatus: "success",
          },
        }),
        prisma.contest.update({
          where: { id: contest.id },
          data: { lastSync: new Date() }
        })
      ]);

      // Invalidate stats cache
      statsCache.invalidateAll();

      const result: SyncResult = {
        submissionsAdded: newSubmissions.length,
        participantsAdded,
        acceptedAdded,
        duration,
        syncStatus: "success",
      };

      this.emitProgress("complete", "Sync complete!", newSubmissions.length, newSubmissions.length);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const duration = Date.now() - this.startTime;

      if (syncLogId) {
        await prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            duration,
            syncStatus: "error",
            errorMessage,
          },
        });
      }

      this.emitProgress("error", errorMessage, 0, null);

      console.error("SYNC FAILED");
      console.error(error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
}

// Singleton to prevent concurrent syncs
let activeSyncEngine: SyncEngine | null = null;

export function startSync(options: SyncOptions): Promise<SyncResult> {
  if (activeSyncEngine) {
    throw new Error("A sync is already in progress");
  }

  activeSyncEngine = new SyncEngine(options);
  return activeSyncEngine.run(options.fullSync).finally(() => {
    activeSyncEngine = null;
  });
}

export function isSyncRunning(): boolean {
  return activeSyncEngine !== null;
}

export function getSyncState(): SyncProgressEvent | null {
  return activeSyncEngine?.getProgress() || null;
}
