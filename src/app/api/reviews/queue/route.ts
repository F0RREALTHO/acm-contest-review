import { NextRequest, NextResponse } from "next/server";
import { reviewService } from "@/services/review-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined;
    const result = await reviewService.getReviewQueue({ week, page: 1, limit: 200 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch queue" },
      { status: 500 }
    );
  }
}
