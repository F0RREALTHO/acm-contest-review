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

    const targetContest = requestedSlug 
      ? await prisma.contest.findUnique({ where: { slug: requestedSlug } })
      : await prisma.contest.findFirst({
          where: { enabled: true },
          orderBy: { displayOrder: "asc" }
        });

    if (!targetContest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    // Start async without awaiting the whole sync
    startSync({
      contestSlug: targetContest.slug,
      cookie,
      fullSync: false
    }).catch(console.error);

    return NextResponse.json({ success: true, message: "Sync started in background" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
