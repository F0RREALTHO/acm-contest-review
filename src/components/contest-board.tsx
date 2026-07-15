"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Trophy, Medal, Search, RefreshCw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { SyncStatusBadge } from "@/components/shared/sync-status-badge";

export function ContestBoard({ slug }: { slug: string }) {
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

  function formatRank(rank: number) {
    if (rank === 1) return { label: "1st", icon: <Trophy className="h-4 w-4" />, color: "text-amber-400" };
    if (rank === 2) return { label: "2nd", icon: <Medal className="h-4 w-4" />, color: "text-slate-300" };
    if (rank === 3) return { label: "3rd", icon: <Medal className="h-4 w-4" />, color: "text-amber-600" };
    return { label: `${rank}`, icon: null, color: "text-foreground" };
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
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 border-b border-border pb-6 pt-2">
        <div>
          <h1 className="text-[28px] font-bold text-foreground tracking-tight mb-2 flex items-center gap-3">
            {contestTitle}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Official ACM Coding Contest Review</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{data?.data?.length || 0} Participants</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Updated recently</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-[340px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search participant..."
              className="pl-9 h-9 bg-card border-border text-sm focus:border-primary shadow-none rounded-[12px]"
            />
          </div>
          <SyncStatusBadge contestSlug={slug} />
        </div>
      </div>

      {!isLoading && data?.data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Participants", value: data.data.length },
            { label: "Problems", value: data.contestTotalProblems || "-" },
            { label: "Flagged", value: data.data.filter((p: any) => p.status === "FLAGGED").length, alert: true },
            { label: "Last Sync", value: "Just now" },
          ].map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-[18px] p-5 hover:-translate-y-0.5 transition-transform duration-150">
              <div className="text-sm text-muted-foreground mb-1 font-medium">{stat.label}</div>
              <div className={cn("text-2xl font-bold", stat.alert && stat.value > 0 ? "text-warning" : "text-foreground")}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="border border-border rounded-[16px] bg-card overflow-hidden shadow-sm flex flex-col mt-8">
          <div className="p-4 border-b border-border/50">
            <div className="h-6 w-32 bg-accent rounded animate-pulse" />
          </div>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-14 border-b border-border/30 last:border-0 flex items-center px-5 gap-6">
              <div className="h-4 w-12 bg-accent rounded animate-pulse" />
              <div className="h-4 w-16 bg-accent rounded animate-pulse" />
              <div className="h-8 w-8 bg-accent rounded-full animate-pulse" />
              <div className="h-4 w-48 bg-accent rounded animate-pulse flex-1" />
              <div className="h-4 w-16 bg-accent rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : !data?.data?.length ? (
        <div className="text-muted-foreground">No rankings available.</div>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm min-w-[800px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-5 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-muted-foreground w-24">HR Rank</th>
                  <th className="px-5 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-muted-foreground w-36">Official Rank ↑</th>
                  <th className="px-5 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Hacker</th>
                  <th className="px-5 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-right">Score</th>
                  <th className="px-5 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-right">Time</th>
                  <th className="px-5 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-center">Solved</th>
                  <th className="px-5 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-right w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((p: any, index: number) => {
                  const isFlagged = p.status === "FLAGGED";
                  const rank = formatRank(p.officialRank);

                  return (
                    <tr
                    key={p.username}
                    onClick={() => router.push(`/participants/${p.username}`)}
                    className={`h-14 border-b border-border/30 last:border-0 hover:bg-accent transition-colors cursor-pointer group`}
                  >
                      {/* HR Rank */}
                      <td className="px-5 py-4 font-mono text-sm text-muted-foreground">
                        #{p.hrRank ?? "-"}
                      </td>

                      {/* Official Rank */}
                      <td className="px-5 py-2">
                        <span className={`font-semibold text-[13px] flex items-center gap-2 ${rank.color}`}>
                          {rank.icon}
                          {rank.label}
                        </span>
                      </td>

                      {/* Hacker */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {p.avatar ? (
                            <img src={p.avatar} alt="" className="w-8 h-8 rounded-full ring-1 ring-border object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-700 ring-1 ring-border flex items-center justify-center text-xs font-medium text-slate-300">
                              {p.username?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <span className="text-foreground font-medium group-hover:text-primary transition-colors block truncate">
                              {p.username}
                            </span>
                            {p.country && (
                              <span className="text-xs text-muted-foreground truncate block">{p.country}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-5 py-2 font-mono text-[13px] text-right font-medium text-emerald-500">
                        {p.score}
                      </td>

                      {/* Time */}
                      <td className="px-5 py-4 font-mono text-sm text-right text-muted-foreground">
                        {formatTime(p.timeTaken)}
                      </td>

                      {/* Solved */}
                      <td className="px-5 py-4 font-mono text-sm text-center">
                        <span className="text-foreground">{p.problemsSolved}</span>
                        <span className="text-muted-foreground"> / {data.contestTotalProblems || "?"}</span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-2 text-right">
                        {isFlagged ? (
                          <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-bold text-warning uppercase tracking-wide">
                            Flagged
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-bold text-success uppercase tracking-wide">
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
        </div>
      )}
    </div>
  );
}

