import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function PublicLeaderboardIndexPage() {
  // First try the contest explicitly marked as public
  let contest = await prisma.contest.findFirst({
    where: { isPublic: true },
  });

  // Fallback: first enabled contest by displayOrder
  if (!contest) {
    contest = await prisma.contest.findFirst({
      where: { enabled: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  if (contest) {
    redirect(`/public/leaderboard/${contest.slug}`);
  }

  // Fallback if no contests exist yet
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          No Active Contests
        </h1>
        <p className="text-muted-foreground">
          There are no active contests at the moment. Check back later!
        </p>
      </div>
    </main>
  );
}
