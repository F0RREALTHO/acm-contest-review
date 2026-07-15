import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSyncRunning, getSyncState } from "@/services/sync-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contestSlug = searchParams.get("contestSlug");

    if (!contestSlug) {
      return NextResponse.json({ error: "contestSlug is required" }, { status: 400 });
    }

    const contest = await prisma.contest.findUnique({
      where: { slug: contestSlug },
      include: {
        syncLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    const latestLog = contest.syncLogs[0];
    const engineRunning = isSyncRunning();

    let status: "synced" | "syncing" | "failed" | "not_synced" = "not_synced";
    let error: string | undefined = undefined;
    let stage: string | undefined = undefined;
    let processed: number | undefined = undefined;
    let total: number | undefined = undefined;

    if (latestLog) {
      if (latestLog.syncStatus === "in_progress") {
        if (engineRunning) {
          status = "syncing";
          const progress = getSyncState();
          if (progress) {
            stage = progress.message;
            processed = progress.current;
            total = progress.total !== null ? progress.total : undefined;
          } else {
            stage = "Starting sync...";
            processed = 0;
            total = 0;
          }
        } else {
          // DB says in_progress, but engine isn't running -> Server crashed/restarted
          status = "failed";
          error = "Sync interrupted by server restart.";
        }
      } else if (latestLog.syncStatus === "error") {
        status = "failed";
        error = latestLog.errorMessage || "Unknown error";
      } else {
        status = "synced";
      }
    } else if (engineRunning) {
      status = "syncing";
      stage = "Starting sync...";
    }

    return NextResponse.json({
      status,
      contest: contestSlug,
      stage,
      processed,
      total,
      lastSync: contest.lastSync,
      error,
    });
  } catch (error) {
    console.error("Status check failed:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
