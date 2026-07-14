import { NextRequest, NextResponse } from "next/server";
import { reviewService } from "@/services/review-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewed = searchParams.get("reviewed") === "true" ? true : searchParams.get("reviewed") === "false" ? false : undefined;
    const flagged = searchParams.get("flagged") === "true" ? true : searchParams.get("flagged") === "false" ? false : undefined;

    const result = await reviewService.getReviews({
      reviewed,
      flagged,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "50"),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const review = await reviewService.createOrUpdateReview(body);
    return NextResponse.json(review);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save review" },
      { status: 500 }
    );
  }
}
