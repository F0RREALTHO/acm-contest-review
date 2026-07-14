import { NextRequest, NextResponse } from "next/server";
import { participantService } from "@/services/participant-service";
import { parseIntSafe } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await participantService.getParticipants({
      page: parseIntSafe(searchParams.get("page"), 1),
      limit: parseIntSafe(searchParams.get("limit"), 50),
      sortBy: searchParams.get("sortBy") || "username",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
      search: searchParams.get("search") || undefined,
      week: searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined,
      team: searchParams.get("team") || undefined,
      contestSlug: searchParams.get("contest") || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch participants" },
      { status: 500 }
    );
  }
}
