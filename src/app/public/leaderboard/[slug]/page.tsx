import { prisma } from "@/lib/prisma";
import { PublicContestBoard } from "@/components/public-contest-board";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Public Leaderboard",
  description: "Public view of the ACM Coding Contest Review Leaderboard",
};

export default async function PublicLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Check if the contest exists and is public
  const contest = await prisma.contest.findUnique({
    where: { slug },
    select: { isPublic: true, name: true },
  });

  // Contest doesn't exist OR is not marked public → sarcastic wall
  if (!contest?.isPublic) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          {/* Big emoji */}
          <div className="text-7xl mb-6 select-none">🕵️</div>

          <h1 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
            Oh wow, look at you.
          </h1>

          <p className="text-muted-foreground text-sm leading-relaxed mb-2">
            Manually typing in contest slugs, huh? Very impressive. Truly the
            hacker of the century.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Unfortunately, this leaderboard is{" "}
            <span className="text-foreground font-semibold">not public</span>.
            Whatever you were looking for — it&apos;s not here for you.
          </p>

          <a
            href="/public/leaderboard"
            className="inline-flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
          >
            ← Go back to what you&apos;re allowed to see
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <PublicContestBoard slug={slug} />
      </div>
    </main>
  );
}
