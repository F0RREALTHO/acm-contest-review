import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "@/services/analytics-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined;
    const analytics = await analyticsService.getGlobalAnalytics(week);
    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
