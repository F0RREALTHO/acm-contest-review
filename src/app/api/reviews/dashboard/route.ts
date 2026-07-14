import { NextRequest, NextResponse } from "next/server";
import { reviewService } from "@/services/review-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined;
    const stats = await reviewService.getDashboardStats(week);
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
