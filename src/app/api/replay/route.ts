import { NextRequest, NextResponse } from "next/server";
import { replayService } from "@/services/replay-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("getWeeks") === "true") {
      const weeks = await replayService.getAvailableWeeks();
      return NextResponse.json(weeks);
    }

    const week = parseInt(searchParams.get("week") || "1");
    const data = await replayService.getReplayData(week);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch replay data" },
      { status: 500 }
    );
  }
}
