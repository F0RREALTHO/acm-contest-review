import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const contests = await prisma.contest.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: { problems: true, leaderboardEntries: true }
        }
      }
    });

    return NextResponse.json(contests);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch contests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, icon, enabled, displayOrder } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const contest = await prisma.contest.create({
      data: {
        name,
        slug,
        icon: icon || null,
        enabled: enabled ?? true,
        displayOrder: displayOrder ?? 0,
      },
    });

    return NextResponse.json(contest, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create contest" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, slug, icon, enabled, displayOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "Contest id is required" }, { status: 400 });
    }

    const contest = await prisma.contest.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(icon !== undefined && { icon }),
        ...(enabled !== undefined && { enabled }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    });

    return NextResponse.json(contest);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update contest" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Contest id is required" }, { status: 400 });
    }

    await prisma.contest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete contest" },
      { status: 500 }
    );
  }
}
