import { NextRequest, NextResponse } from "next/server";
import { problemService } from "@/services/problem-service";
import { parseIntSafe } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await problemService.getProblems({
      page: parseIntSafe(searchParams.get("page"), 1),
      limit: parseIntSafe(searchParams.get("limit"), 50),
      week: searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined,
      search: searchParams.get("search") || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch problems" },
      { status: 500 }
    );
  }
}
