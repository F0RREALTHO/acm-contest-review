import { NextRequest, NextResponse } from "next/server";
import { submissionService } from "@/services/submission-service";
import { parseIntSafe } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await submissionService.getSubmissions({
      page: parseIntSafe(searchParams.get("page"), 1),
      limit: parseIntSafe(searchParams.get("limit"), 50),
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
      status: searchParams.get("status") || undefined,
      userId: searchParams.get("userId") || undefined,
      problemId: searchParams.get("problemId") || undefined,
      week: searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined,
      language: searchParams.get("language") || undefined,
      search: searchParams.get("search") || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
