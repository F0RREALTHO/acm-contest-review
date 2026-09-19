import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicLeaderboardTabs } from "./public-leaderboard-tabs";

export const dynamic = "force-dynamic";

export default async function PublicLeaderboardIndexPage() {
  const publicContests = await prisma.contest.findMany({
    where: { isPublic: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true, icon: true, slug: true },
  });

  // Nothing marked public
  if (publicContests.length === 0) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-5 select-none">🚧</div>
          <h1 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
            Nothing to see here
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            No contest leaderboards are publicly available right now. Check back
            later — or bother the organizers.
          </p>
        </div>
      </main>
    );
  }

  // One or more — render tabs (slug never in URL)
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <PublicLeaderboardTabs contests={publicContests} />
      </div>
    </main>
  );
}
