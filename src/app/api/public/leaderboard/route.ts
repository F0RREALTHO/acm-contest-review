import { NextRequest, NextResponse } from "next/server";
import { leaderboardService } from "@/services/leaderboard-service";

// Enable CORS for this public route
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contest = searchParams.get("contest");
    const search = searchParams.get("search") || undefined;

    if (!contest) {
      return NextResponse.json(
        { error: "Contest parameter is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await leaderboardService.getLeaderboard({
      contestSlug: contest,
      search,
    });

    // Strip sensitive information
    const publicData = result.data.map((entry) => ({
      hrRank: entry.hrRank,
      officialRank: entry.officialRank,
      username: entry.username,
      score: entry.score,
      timeTaken: entry.timeTaken,
      problemsSolved: entry.problemsSolved,
      avatar: entry.avatar,
      country: entry.country,
      isFlagged: entry.status === "FLAGGED" || !!entry.participantFlag,
    }));

    return NextResponse.json(
      {
        data: publicData,
        contestTotalProblems: result.contestTotalProblems,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch public leaderboard" },
      { status: 500, headers: corsHeaders }
    );
  }
}
