import { NextRequest, NextResponse } from "next/server";
import { participantService } from "@/services/participant-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const { searchParams } = new URL(request.url);
    const contestSlug = searchParams.get("contest") || undefined;

    const profile = await participantService.getParticipantProfile(decodeURIComponent(username), contestSlug);

    if (!profile) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch participant" },
      { status: 500 }
    );
  }
}
