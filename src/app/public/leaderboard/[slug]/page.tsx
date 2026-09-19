import { notFound } from "next/navigation";
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

  // Only render if the contest is explicitly marked as public
  const contest = await prisma.contest.findUnique({
    where: { slug },
    select: { isPublic: true },
  });

  if (!contest?.isPublic) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <PublicContestBoard slug={slug} />
      </div>
    </main>
  );
}
