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

  if (isLoading) return <div className="max-w-4xl mx-auto py-12 text-zinc-500">Loading...</div>;
  if (!profile) return <div className="max-w-4xl mx-auto py-12 text-zinc-500">Participant not found.</div>;

  const allProblems = profile.weeks.flatMap((w: any) => w.problems);
  const solvedProblems = allProblems.filter((p: any) => p.solved);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="text-muted-foreground hover:text-foreground flex items-center text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
          </Link>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-xl font-bold text-foreground tracking-tight">{username}</h1>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <span className="text-sm font-medium text-muted-foreground hidden sm:block">
            {profile.contestName || contest}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          {profile.leaderboard && (
            <>
              <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Rank</span>
                <span className="font-mono font-medium text-foreground">
                  {profile.leaderboard.officialRank}
                </span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Score</span>
                <span className="font-mono font-medium text-foreground">
                  {profile.leaderboard.score}
                </span>
              </div>
              <div className="h-8 w-px bg-border" />
            </>
          )}
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Solved</span>
            <span className="font-mono font-medium text-foreground">
              {profile.stats.totalAccepted} <span className="text-muted-foreground">/ {allProblems.length}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-px bg-border rounded-md border border-border overflow-hidden">
        {solvedProblems.length === 0 && (
          <div className="text-muted-foreground p-8 text-center bg-card">
            No accepted solutions to display.
          </div>
        )}
        {solvedProblems.map((problem: any) => {
          const hasAC = problem.solved;
          const latestVerdict = problem.attempts.length > 0 
            ? problem.attempts[problem.attempts.length - 1].status 
            : "No Submissions";
            
          return (
            <div key={problem.id} className="bg-card hover:bg-slate-800/20 transition-colors p-3 flex items-center gap-4 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-foreground truncate">{problem.name}</h3>
                  <span className={`text-[11px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${hasAC ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                    {latestVerdict}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span><strong className="font-mono text-foreground">{problem.attempts.length}</strong> attempts</span>
                  {problem.latestAccepted && (
                    <span className="font-mono">{problem.latestAccepted.language}</span>
                  )}
                  <details className="text-xs group/details">
                    <summary className="cursor-pointer hover:text-primary transition-colors select-none flex items-center gap-1">
                      <ChevronDown className="h-3 w-3 group-open/details:rotate-180 transition-transform" /> History
                    </summary>
                    <div className="mt-2 pl-4 border-l border-border space-y-1">
                      {problem.attempts.map((att: any) => (
                        <Link 
                          key={att.submissionId} 
                          href={`/submissions/${att.submissionId}?participant=${username}`}
                          className="flex justify-between max-w-[200px] font-mono text-muted-foreground hover:bg-muted hover:text-primary px-2 py-1 rounded transition-colors -ml-2"
                        >
                          <span className={att.status === "Accepted" ? "text-emerald-500" : ""}>
                            {att.status}
                          </span>
                          <span>{att.language}</span>
                        </Link>
                      ))}
                    </div>
                  </details>
                </div>
              </div>

              <div className="shrink-0">
                {problem.latestAccepted ? (
                  <Link href={`/submissions/${problem.latestAccepted.submissionId}?participant=${username}`}>
                    <Button variant="outline" size="sm" className="h-8 border-primary/50 text-primary hover:bg-primary/10 transition-colors">
                      View Code
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled className="h-8 border-border text-muted-foreground bg-transparent">
                    No AC
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
