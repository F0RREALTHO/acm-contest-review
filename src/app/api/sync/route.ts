import { NextRequest, NextResponse } from "next/server";
import { startSync, isSyncRunning } from "@/services/sync-engine";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    if (isSyncRunning()) {
      return NextResponse.json(
        { error: "A sync is already in progress" },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { fullSync, contestSlug } = body;

    if (!contestSlug) {
      return NextResponse.json(
        { error: "contestSlug is required" },
        { status: 400 }
      );
    }

    // Get settings
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings?.cookie) {
      return NextResponse.json(
        { error: "Please configure your session cookie in Settings" },
        { status: 400 }
      );
    }

    // Start sync in background (don't await)
    startSync({
      contestSlug,
      cookie: settings.cookie,
      fullSync: fullSync || false,
    }).catch((err) => {
      console.error("Sync error:", err);
    });

    return NextResponse.json({
      status: "started",
      message: "Sync started successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start sync" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const latestSync = await prisma.syncLog.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        contest: { select: { name: true, slug: true } },
      },
    });

    return NextResponse.json({
      isRunning: isSyncRunning(),
      latestSync,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get sync status" },
      { status: 500 }
    );
  }
}
