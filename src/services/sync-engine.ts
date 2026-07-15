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
      delayMs: 50,
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

    console.log(`[Sync] Starting sync for ${this.contestSlug}`);

    try {
      // PHASE 1: Fetch contest metadata
      this.emitProgress("fetching_contest", "Fetching contest information...", 0, null);
      const contestData = await this.client.getContest(this.contestSlug);

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
      console.log(`[Sync] ${challenges.length} problems fetched`);

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

      // PHASE 3: Download submissions
      this.emitProgress("downloading_submissions", "Downloading submissions...", 0, null);

      let newSubmissions: HRSubmission[];

      if (!knownNewestId) {
        // Full sync — use parallel fetcher (much faster)
        const result = await this.client.getAllSubmissionsParallel(
          this.contestSlug,
          5,
          (fetched, total) => {
            this.emitProgress(
              "downloading_submissions",
              `Downloaded ${fetched}/${total} submissions...`,
              fetched,
              total
            );
          }
        );
        newSubmissions = result.models;
      } else {
        // Incremental sync — sequential, stop when we hit a known submission
        newSubmissions = [];
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

            if (subId === knownNewestId && knownNewestTime && subTime.getTime() <= knownNewestTime.getTime()) {
              stopPagination = true;
              break;
            }

            newSubmissions.push(submission);
          }

          this.emitProgress(
            "downloading_submissions",
            `Downloaded ${newSubmissions.length} new submissions...`,
            newSubmissions.length,
            null
          );

          if (page.models.length < limit || stopPagination) {
            break;
          }

          offset += limit;
        }
      }

      console.log(`[Sync] ${newSubmissions.length} submissions fetched`);

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

      console.log(`[Sync] Saving ${newSubmissions.length} submissions...`);
      const latestAcceptedMap = new Set<string>();

      // 1. Bulk ensure Users exist
      const uniqueUsernames = Array.from(new Set(newSubmissions.map(s => s.hacker_username || s.hacker || `user_${s.hacker_id}`)));
      const existingUsers = await prisma.user.findMany({ where: { username: { in: uniqueUsernames } } });
      const existingUserMap = new Map(existingUsers.map(u => [u.username, u.id]));
      
      const missingUsernames = uniqueUsernames.filter(u => !existingUserMap.has(u));
      if (missingUsernames.length > 0) {
          await prisma.user.createMany({
              data: missingUsernames.map(username => ({ username })),
              skipDuplicates: true
          });
          const newlyCreatedUsers = await prisma.user.findMany({ where: { username: { in: missingUsernames } } });
          newlyCreatedUsers.forEach(u => existingUserMap.set(u.username, u.id));
          participantsAdded += missingUsernames.length;
      }
      
      // 2. Bulk ensure Problems exist
      const uniqueProblemSlugs = Array.from(new Set(newSubmissions.map(s => s.challenge?.slug || s.challenge_slug || "")));
      const missingProblemSlugs = uniqueProblemSlugs.filter(slug => !problemMap.has(slug));
      for (const slug of missingProblemSlugs) {
          const sub = newSubmissions.find(s => (s.challenge?.slug || s.challenge_slug || "") === slug);
          const newProblem = await prisma.problem.create({
            data: {
              name: sub?.challenge?.name || slug,
              slug: slug,
              contestId: contest.id,
              week: 1,
            },
          });
          problemMap.set(slug, newProblem.id);
      }
      
      // 3. Pre-calculate isLatestAccepted and prepare operations
      const upsertOperations = [];
      const unmarkPairs = [];
      
      for (let i = 0; i < newSubmissions.length; i++) {
        const sub = newSubmissions[i];
        const username = sub.hacker_username || sub.hacker || `user_${sub.hacker_id}`;
        const userId = existingUserMap.get(username)!;
        const challengeSlug = sub.challenge?.slug || sub.challenge_slug || "";
        const problemId = problemMap.get(challengeSlug)!;
        
        let isLatestAccepted = false;
        if (sub.status === "Accepted") {
          const key = `${userId}_${problemId}`;
          if (!latestAcceptedMap.has(key)) {
            latestAcceptedMap.add(key);
            isLatestAccepted = true;
            unmarkPairs.push({ userId, problemId });
          }
          acceptedAdded++;
        }
        
        const createdAtDate = new Date((sub.created_at as any as number) * 1000);
        
        upsertOperations.push({
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
          testcaseMessages: sub.testcase_message ? JSON.stringify(sub.testcase_message) : null,
          isLatestAccepted,
          viewUrl: `/submissions/${sub.id}`,
        });
      }
      
      // 4. Execute Unmarks
      if (unmarkPairs.length > 0) {
          const chunkSize = 50;
          for (let i = 0; i < unmarkPairs.length; i += chunkSize) {
             const chunk = unmarkPairs.slice(i, i + chunkSize);
             await prisma.submission.updateMany({
                 where: { OR: chunk, isLatestAccepted: true },
                 data: { isLatestAccepted: false }
             });
          }
      }
      
      // 5. Execute Upserts in chunks
      const chunkSize = 200;
      for (let i = 0; i < upsertOperations.length; i += chunkSize) {
          const chunk = upsertOperations.slice(i, i + chunkSize);
          await prisma.submission.createMany({
              data: chunk,
              skipDuplicates: true,
          });
          this.emitProgress(
             "saving_to_database",
             `Saving submission metadata (${Math.min(i + chunkSize, upsertOperations.length)}/${upsertOperations.length})...`,
             Math.min(i + chunkSize, upsertOperations.length),
             upsertOperations.length
          );
      }

      // PHASE 5: Fetch Official Leaderboard
      this.emitProgress("fetching_leaderboard", "Fetching official leaderboard...", 0, null);

      const officialLeaderboard = await this.client.getAllLeaderboardEntries(this.contestSlug);

      console.log(`[Sync] ${officialLeaderboard.length} leaderboard entries fetched`);
      this.emitProgress("saving_to_database", "Saving official leaderboard...", 0, officialLeaderboard.length);

      // Delete existing leaderboard entries for this contest
      await prisma.leaderboardEntry.deleteMany({
        where: { contestId: contest.id }
      });

      // Insert new entries
      if (officialLeaderboard.length > 0) {
          const dataToInsert = officialLeaderboard.map((entry, index) => ({
             contestId: contest.id,
             username: entry.hacker,
             hrRank: entry.rank,
             officialRank: entry.index + 1,
             score: entry.score,
             timeTaken: entry.time_taken,
             avatar: entry.avatar || null,
             country: entry.country || null,
          }));

          await prisma.leaderboardEntry.createMany({
             data: dataToInsert,
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
