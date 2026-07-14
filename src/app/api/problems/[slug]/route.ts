import { NextRequest, NextResponse } from "next/server";
import { problemService } from "@/services/problem-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const problem = await problemService.getProblemBySlug(decodeURIComponent(slug));

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    return NextResponse.json(problem);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch problem" },
      { status: 500 }
    );
  }
}
