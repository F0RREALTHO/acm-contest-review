import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PublicLeaderboardIndexPage() {
  const publicContests = await prisma.contest.findMany({
    where: { isPublic: true },
    orderBy: { displayOrder: "asc" },
  });

  // If only one public contest, go straight to it
  if (publicContests.length === 1) {
    redirect(`/public/leaderboard/${publicContests[0].slug}`);
  }

  // Nothing marked public — show a clear "nothing to see" message
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

  // Multiple public contests — show a selection page
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
            ACM Contest Leaderboards
          </h1>
          <p className="text-muted-foreground text-sm">
            Select a contest to view the public leaderboard
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {publicContests.map((contest) => (
            <Link
              key={contest.id}
              href={`/public/leaderboard/${contest.slug}`}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all duration-150"
            >
              <span className="text-2xl">{contest.icon || "🏆"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground group-hover:text-violet-300 transition-colors">
                  {contest.name}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                  {contest.slug}
                </p>
              </div>
              <span className="text-muted-foreground group-hover:text-violet-400 transition-colors text-lg">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
