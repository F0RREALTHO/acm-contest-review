import { NextRequest, NextResponse } from "next/server";
import { leaderboardService } from "@/services/leaderboard-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contest = searchParams.get("contest");
    const search = searchParams.get("search") || undefined;

    if (!contest) {
      return NextResponse.json({ error: "Contest parameter is required" }, { status: 400 });
    }

    const result = await leaderboardService.getLeaderboard({
      contestSlug: contest,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
