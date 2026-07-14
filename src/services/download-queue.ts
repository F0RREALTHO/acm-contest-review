import { prisma } from "@/lib/prisma";
import { HackerRankClient } from "@/services/hackerrank-client";

export type DownloadPriority = "HIGH" | "MEDIUM" | "LOW";

interface QueueItem {
  submissionId: string;
  contestSlug: string;
  challengeSlug: string;
  priority: DownloadPriority;
  enqueuedAt: number;
}

const BACKOFF_MINUTES = [1, 2, 4, 8, 16, 30, 60];

class DownloadQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private backoffIndex = 0;
  private pauseUntil = 0;
  private client: HackerRankClient | null = null;
  
  private async getClient() {
    if (this.client) return this.client;
    const cookie = process.env.HR_SESSION_COOKIE;
    if (!cookie) throw new Error("HR_SESSION_COOKIE is not configured.");
    this.client = new HackerRankClient({ cookie, delayMs: 1000 });
    return this.client;
  }

  public enqueue(
    submissionId: string, 
    contestSlug: string, 
    challengeSlug: string, 
    priority: DownloadPriority
  ) {
    const existing = this.queue.find(q => q.submissionId === submissionId);
    if (existing) {
       if (priority === "HIGH" && existing.priority !== "HIGH") existing.priority = "HIGH";
       if (priority === "MEDIUM" && existing.priority === "LOW") existing.priority = "MEDIUM";
       return;
    }
    
    this.queue.push({ submissionId, contestSlug, challengeSlug, priority, enqueuedAt: Date.now() });
    
    prisma.sourceCodeCache.upsert({
      where: { submissionId },
      update: {},
      create: { submissionId, status: "PENDING" }
    }).catch(console.error);

    this.processQueue();
  }

  public async getStatus(submissionId: string) {
    return prisma.sourceCodeCache.findUnique({
      where: { submissionId }
    });
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        if (Date.now() < this.pauseUntil) {
          // Sleep a bit before checking again, but don't block fully if we can avoid it.
          // Just wait for 5 seconds and let the loop spin slowly while paused.
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        this.queue.sort((a, b) => {
          const pValues = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          if (pValues[a.priority] !== pValues[b.priority]) {
            return pValues[b.priority] - pValues[a.priority];
          }
          return a.enqueuedAt - b.enqueuedAt;
        });

        const item = this.queue.shift();
        if (!item) break;
        
        const cache = await prisma.sourceCodeCache.findUnique({ where: { submissionId: item.submissionId } });
        if (cache?.status === "DONE" && cache.sourceCode) continue;

        await prisma.sourceCodeCache.upsert({
           where: { submissionId: item.submissionId },
           update: { status: "DOWNLOADING", lastAttempt: new Date() },
           create: { submissionId: item.submissionId, status: "DOWNLOADING", lastAttempt: new Date() }
        });

        try {
          const client = await this.getClient();
          const detail = await client.getSubmissionDetail(item.contestSlug, item.challengeSlug, Number(item.submissionId));
          
          await prisma.sourceCodeCache.update({
            where: { submissionId: item.submissionId },
            data: { 
              sourceCode: detail.model?.code || null,
              status: "DONE", 
              downloadedAt: new Date(),
              downloadAttempts: { increment: 1 }
            }
          });
          
          this.backoffIndex = 0;
          
        } catch (error: any) {
          if (error.message?.includes("429") || error.message?.includes("Rate limited")) {
            const waitMins = BACKOFF_MINUTES[Math.min(this.backoffIndex, BACKOFF_MINUTES.length - 1)];
            console.log(`[Queue] 429 Rate Limit. Pausing for ${waitMins} minutes...`);
            this.pauseUntil = Date.now() + waitMins * 60000;
            this.backoffIndex++;
            
            this.queue.unshift(item); // Re-queue
            
            await prisma.sourceCodeCache.update({
              where: { submissionId: item.submissionId },
              data: { status: "RATE_LIMITED", downloadAttempts: { increment: 1 } }
            });
          } else {
            console.error(`[Queue] Failed to download ${item.submissionId}:`, error.message);
            await prisma.sourceCodeCache.update({
              where: { submissionId: item.submissionId },
              data: { status: "FAILED", downloadAttempts: { increment: 1 } }
            });
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const downloadQueue = new DownloadQueue();
