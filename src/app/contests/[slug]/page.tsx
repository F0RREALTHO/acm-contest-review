"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SyncStatusBadge } from "@/components/shared/sync-status-badge";

export default function ContestParticipantListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  function formatTime(seconds: number) {
    if (!seconds) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Fetch contest metadata dynamically
  const { data: contests } = useQuery({
    queryKey: ["contests-nav"],
    queryFn: async () => {
      const res = await fetch("/api/contests");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const contest = contests?.find((c: any) => c.slug === slug);
  const contestTitle = contest ? `${contest.icon || ""} ${contest.name}`.trim() : slug;

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", slug, debouncedSearch],
    queryFn: async () => {
      const url = new URL("/api/leaderboard", window.location.origin);
      url.searchParams.set("contest", slug);
      if (debouncedSearch) url.searchParams.set("search", debouncedSearch);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {contestTitle}
          </h1>
          <SyncStatusBadge contestSlug={slug} />
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hacker..."
            className="pl-9 bg-card border-border text-sm focus:border-primary shadow-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading leaderboard...</div>
      ) : !data?.data?.length ? (
        <div className="text-muted-foreground">No rankings available.</div>
      ) : (
        <div className="border border-border rounded-md bg-card overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="bg-muted border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium w-16 text-center">HR Rank</th>
                <th className="px-4 py-3 font-medium w-16 text-center">Rank</th>
                <th className="px-4 py-3 font-medium">Hacker</th>
                <th className="px-4 py-3 font-medium text-right">Score</th>
                <th className="px-4 py-3 font-medium text-right">Time</th>
                <th className="px-4 py-3 font-medium text-center">Solved</th>
                <th className="px-4 py-3 font-medium text-right w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.data.map((p: any, index: number) => {
                const isFlagged = p.status === "FLAGGED";
                const rankDisplay = p.officialRank === 1 ? "🥇" : p.officialRank === 2 ? "🥈" : p.officialRank === 3 ? "🥉" : p.officialRank;
                
                return (
                  <tr 
                    key={p.username} 
                    onClick={() => router.push(`/participants/${p.username}?contest=${slug}`)}
                    className={`h-12 hover:bg-slate-800/30 transition-colors cursor-pointer group border-b border-border/50 last:border-0 ${
                      index % 2 === 0 ? "bg-transparent" : "bg-black/10"
                    } ${isFlagged ? "!bg-red-950/30 hover:!bg-red-900/40" : ""}`}
                  >
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground text-center">{p.hrRank ?? "-"}</td>
                    <td className="px-4 py-2 font-mono text-sm text-foreground text-center whitespace-nowrap">{rankDisplay}</td>
                    <td className="px-4 py-2">
                      <span className="text-foreground font-medium group-hover:text-primary transition-colors flex items-center gap-2">
                        {p.avatar && <img src={p.avatar} alt="avatar" className="w-5 h-5 rounded-full ring-1 ring-border" />}
                        {p.username}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-sm text-right text-foreground">{p.score}</td>
                    <td className="px-4 py-2 font-mono text-sm text-right text-muted-foreground">{formatTime(p.timeTaken)}</td>
                    <td className="px-4 py-2 font-mono text-sm text-center">
                      <span className="text-foreground">{p.problemsSolved}</span> <span className="text-muted-foreground">/ {data.contestTotalProblems || "?"}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {isFlagged ? (
                        <span className="inline-flex items-center rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive border border-destructive/20 uppercase tracking-wider">
                          Flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
                          Clean
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
