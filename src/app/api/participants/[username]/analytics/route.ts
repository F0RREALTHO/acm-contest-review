import { NextRequest, NextResponse } from "next/server";
import { participantService } from "@/services/participant-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const analytics = await participantService.getParticipantAnalytics(
      decodeURIComponent(username)
    );

    if (!analytics) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
