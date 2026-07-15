import { NextRequest, NextResponse } from "next/server";
import { startSync, isSyncRunning } from "@/services/sync-engine";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    if (isSyncRunning()) {
      return NextResponse.json({ message: "Sync already running" }, { status: 409 });
    }

    const cookie = process.env.HR_SESSION_COOKIE;

    if (!cookie) {
      return NextResponse.json(
        { error: "HR_SESSION_COOKIE is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedSlug = body.contestSlug;

    let contestSlug = requestedSlug;

    if (!contestSlug) {
      // No slug provided — pick the first enabled contest from DB
      const targetContest = await prisma.contest.findFirst({
        where: { enabled: true },
        orderBy: { displayOrder: "asc" },
      });
      if (!targetContest) {
        return NextResponse.json({ error: "No contest found to sync" }, { status: 404 });
      }
      contestSlug = targetContest.slug;
    }

    // Await startSync so Vercel doesn't kill the background process
    await startSync({
      contestSlug: targetContest.slug,
      cookie,
      fullSync: false
    });

    return NextResponse.json({ success: true, message: "Sync started in background" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
