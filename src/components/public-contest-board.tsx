"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Trophy, Medal, Search, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function PublicContestBoard({ slug }: { slug: string }) {
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
    if (rank === 0) return { label: "-", icon: null, color: "text-muted-foreground" };
    if (rank === 1) return { label: "1st", icon: <Trophy className="h-4 w-4" />, color: "text-amber-400" };
    if (rank === 2) return { label: "2nd", icon: <Medal className="h-4 w-4" />, color: "text-slate-300" };
    if (rank === 3) return { label: "3rd", icon: <Medal className="h-4 w-4" />, color: "text-amber-600" };
    return { label: `${rank}`, icon: null, color: "text-foreground" };
  }

  // Fetch contest metadata dynamically
  const { data: contests } = useQuery({
    queryKey: ["contests-nav-public"],
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
    queryKey: ["public-leaderboard", slug, debouncedSearch],
    queryFn: async () => {
      const url = new URL("/api/public/leaderboard", window.location.origin);
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
            {contestTitle} Leaderboard
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Official ACM Coding Contest Leaderboard</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{data?.data?.length || 0} Participants</span>
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
        </div>
      </div>

      {!isLoading && data?.data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Participants", value: data.data.length },
            { label: "Problems", value: data.contestTotalProblems || "-" },
            { label: "Flagged", value: data.data.filter((p: any) => p.isFlagged).length, alert: true },
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
                {data.data.map((p: any) => {
                  const isParticipantFlagged = p.isFlagged;
                  const rank = formatRank(p.officialRank);

                  return (
                    <tr
                      key={p.username}
                      className={`h-14 border-b border-border/30 last:border-0 transition-colors group ${isParticipantFlagged ? 'bg-[rgba(220,38,38,0.08)] hover:bg-[rgba(220,38,38,0.12)] border-l-4 border-l-[#DC2626]' : 'hover:bg-accent'}`}
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
                          <div className="relative">
                            {p.avatar ? (
                              <img src={p.avatar} alt="" className="w-8 h-8 rounded-full ring-1 ring-border object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-700 ring-1 ring-border flex items-center justify-center text-xs font-medium text-slate-300">
                                {p.username?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                            )}
                            {isParticipantFlagged && (
                              <div className="absolute -bottom-1 -right-1 bg-[#08111F] rounded-full p-0.5 ring-1 ring-border">
                                <Flag className="h-3 w-3 text-[#EF4444] fill-[#EF4444]" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <span className={cn("group-hover:text-primary transition-colors block truncate", isParticipantFlagged ? "text-[#EF4444] font-semibold" : "text-foreground font-medium")}>
                              {p.username}
                            </span>
                            {p.country && (
                              <span className="text-xs text-muted-foreground truncate block">{p.country}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td className={cn(
                        "px-5 py-2 font-mono text-[14px] text-right font-bold transition-colors",
                        isParticipantFlagged 
                          ? "text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                          : "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                      )}>
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
                        {isParticipantFlagged ? (
                          <span className="inline-flex items-center rounded-full bg-[rgba(220,38,38,0.12)] border border-[rgba(220,38,38,0.35)] px-2.5 py-0.5 text-[10px] font-bold text-[#F87171] uppercase tracking-wide">
                            🚩 FLAGGED
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
