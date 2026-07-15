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

  function formatRank(rank: number) {
    if (rank === 1) return { label: "1st", icon: "🥇", color: "text-amber-400" };
    if (rank === 2) return { label: "2nd", icon: "🥈", color: "text-slate-300" };
    if (rank === 3) return { label: "3rd", icon: "🥉", color: "text-amber-600" };
    return { label: `#${rank}`, icon: null, color: "text-foreground" };
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
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
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
        <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-24">HR Rank</th>
                <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-36">Official Rank ↑</th>
                <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Hacker</th>
                <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">Score</th>
                <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">Time</th>
                <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-center">Solved</th>
                <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((p: any, index: number) => {
                const isFlagged = p.status === "FLAGGED";
                const rank = formatRank(p.officialRank);

                return (
                  <tr
                    key={p.username}
                    onClick={() => router.push(`/participants/${p.username}?contest=${slug}`)}
                    className={`border-b border-border/40 last:border-0 hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                      isFlagged ? "!bg-red-950/20 hover:!bg-red-900/30" : ""
                    }`}
                  >
                    {/* HR Rank */}
                    <td className="px-5 py-4 font-mono text-sm text-muted-foreground">
                      #{p.hrRank ?? "-"}
                    </td>

                    {/* Official Rank */}
                    <td className="px-5 py-4">
                      <span className={`font-bold text-sm ${rank.color}`}>
                        {rank.icon && <span className="mr-1.5">{rank.icon}</span>}
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
                        <div className="min-w-0">
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
                    <td className="px-5 py-4 font-mono text-sm text-right font-semibold text-emerald-400">
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
                    <td className="px-5 py-4 text-right">
                      {isFlagged ? (
                        <span className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive border border-destructive/20 uppercase tracking-wider">
                          Flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
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

