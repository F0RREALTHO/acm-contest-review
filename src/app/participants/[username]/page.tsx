"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useContest } from "@/providers/contest-provider";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ParticipantDetailsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { activeContest } = useContest();
  const contest = activeContest || "";

  const { data: profile, isLoading } = useQuery({
    queryKey: ["participant", username, contest],
    queryFn: async () => {
      const res = await fetch(`/api/participants/${username}?contest=${contest}`);
      if (!res.ok) throw new Error("Failed to fetch participant");
      return res.json();
    },
  });

  if (isLoading) return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex justify-between mb-8 pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-accent animate-pulse" />
          <div className="w-12 h-12 rounded-full bg-accent animate-pulse" />
          <div className="space-y-2">
            <div className="w-32 h-6 bg-accent rounded animate-pulse" />
            <div className="w-24 h-4 bg-accent rounded animate-pulse" />
          </div>
        </div>
        <div className="w-64 h-14 bg-card border border-border rounded-[14px] animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-card border border-border rounded-[16px] animate-pulse" />)}
      </div>
    </div>
  );
  if (!profile) return <div className="max-w-4xl mx-auto py-12 text-zinc-500">Participant not found.</div>;

  const allProblems = profile.weeks.flatMap((w: any) => w.problems);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 border-b border-border pb-6 pt-2">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="text-muted-foreground hover:text-foreground flex items-center justify-center w-8 h-8 rounded-full hover:bg-accent transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-4">
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="w-12 h-12 rounded-full border border-border" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-accent border border-border flex items-center justify-center text-lg font-bold text-muted-foreground">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                {username}
                {profile.status === "FLAGGED" && (
                  <span className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Flagged</span>
                )}
              </h1>
              <div className="text-sm text-muted-foreground mt-0.5">
                {profile.country || "Participant"} <span className="mx-1.5">•</span> {profile.contestName || contest}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6 bg-card border border-border rounded-[14px] px-6 py-3 shrink-0">
          {profile.leaderboard && (
            <>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rank</span>
                <span className="font-semibold text-foreground text-lg">
                  #{profile.leaderboard.officialRank}
                </span>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Score</span>
                <span className="font-semibold text-emerald-500 text-lg">
                  {profile.leaderboard.score}
                </span>
              </div>
              <div className="h-10 w-px bg-border" />
            </>
          )}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Solved</span>
            <span className="font-semibold text-foreground text-lg">
              {profile.stats.totalAccepted} <span className="text-muted-foreground text-sm font-normal">/ {allProblems.length}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-foreground mb-4">Problem Grid</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allProblems.map((problem: any) => {
            const hasAC = problem.solved;
            const attemptCount = problem.attempts.length;
            const hasAttempts = attemptCount > 0;
            const isWrong = hasAttempts && !hasAC;

            return (
              <div key={problem.id} className="bg-card border border-border rounded-[16px] p-4 flex flex-col justify-between hover:border-border/80 transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-2">{problem.name}</h3>
                    {hasAC ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-success shrink-0 mt-1 shadow-[0_0_8px_rgba(24,195,126,0.3)]" />
                    ) : isWrong ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-warning shrink-0 mt-1 shadow-[0_0_8px_rgba(246,196,83,0.3)]" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {hasAttempts ? (
                      <details className="group/details">
                        <summary className="cursor-pointer hover:text-primary transition-colors select-none flex items-center gap-1 font-medium">
                          {attemptCount} attempt{attemptCount > 1 ? 's' : ''} <ChevronDown className="h-3 w-3 group-open/details:rotate-180 transition-transform" />
                        </summary>
                        <div className="mt-2 pl-3 border-l-2 border-border space-y-1.5 mb-2">
                          {problem.attempts.map((att: any) => (
                            <Link 
                              key={att.submissionId} 
                              href={`/submissions/${att.submissionId}?participant=${username}`}
                              className="flex justify-between max-w-[200px] font-mono text-[11px] text-muted-foreground hover:bg-accent hover:text-primary px-2 py-1 rounded transition-colors -ml-2"
                            >
                              <span className={att.status === "Accepted" ? "text-success font-semibold" : ""}>
                                {att.status}
                              </span>
                              <span>{att.language}</span>
                            </Link>
                          ))}
                        </div>
                      </details>
                    ) : (
                      "No attempts"
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center h-11">
                  <div className="text-[11px] font-mono text-muted-foreground font-medium uppercase tracking-wider">
                    {problem.latestAccepted ? problem.latestAccepted.language : "UNSOLVED"}
                  </div>
                  {problem.latestAccepted ? (
                    <Link href={`/submissions/${problem.latestAccepted.submissionId}?participant=${username}`}>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-[8px] border-border hover:bg-accent text-primary px-3">
                        View Code
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
