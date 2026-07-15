"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Flag, CheckCircle2, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FlaggedSubmission {
  id: string;
  submissionId: string;
  reason: string | null;
  notes: string | null;
  submission: {
    language: string;
    user: { username: string };
    problem: { name: string; contest: { slug: string; name: string } };
  };
}

interface FlaggedParticipant {
  id: string;
  userId: string;
  contestId: string;
  username: string;
  reason: string | null;
  notes: string | null;
  flaggedBy: string | null;
  createdAt: string;
  contest: { slug: string; name: string };
  leaderboard?: { hrRank: number; officialRank: number; score: number };
  problemsSolved: number;
}

export default function FlaggedPage() {
  const [activeTab, setActiveTab] = useState<"all" | "participants" | "submissions">("participants");
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");

  const { data: reviewsData, isLoading: loadingReviews, refetch: refetchReviews } = useQuery<{ data: FlaggedSubmission[] }>({
    queryKey: ["flagged-reviews"],
    queryFn: async () => {
      const res = await fetch("/api/reviews?flagged=true&limit=100");
      if (!res.ok) throw new Error("Failed to fetch flagged reviews");
      return res.json();
    },
  });

  const { data: participantsData, isLoading: loadingParticipants, refetch: refetchParticipants } = useQuery<{ data: FlaggedParticipant[] }>({
    queryKey: ["flagged-participants"],
    queryFn: async () => {
      const res = await fetch("/api/participant-flags");
      if (!res.ok) throw new Error("Failed to fetch participant flags");
      return res.json();
    },
  });

  const handleUnflagSubmission = async (submissionId: string) => {
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, flagged: false, reason: null, notes: null }),
      });
      refetchReviews();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnflagParticipant = async (username: string, contestSlug: string) => {
    if (!confirm("Remove this participant flag?")) return;
    try {
      await fetch(`/api/participant-flags?username=${username}&contestSlug=${contestSlug}`, { method: "DELETE" });
      refetchParticipants();
    } catch (e) {
      console.error(e);
    }
  };

  const allSubmissions = reviewsData?.data || [];
  const allParticipants = participantsData?.data || [];

  const filteredItems = useMemo(() => {
    let items: any[] = [];
    
    if (activeTab === "all" || activeTab === "participants") {
      items = [...items, ...allParticipants.map(p => ({ ...p, type: "participant" }))];
    }
    
    if (activeTab === "all" || activeTab === "submissions") {
      items = [...items, ...allSubmissions.map(s => ({ ...s, type: "submission" }))];
    }

    const s = search.toLowerCase();
    
    return items.filter(item => {
      // Reason filter
      const r = item.reason || "";
      if (reasonFilter !== "all" && r !== reasonFilter) return false;

      // Search
      if (!s) return true;
      const u = item.type === "participant" ? item.username : item.submission.user.username;
      const c = item.type === "participant" ? item.contest.name : item.submission.problem.contest?.name;
      
      return (
        u.toLowerCase().includes(s) ||
        r.toLowerCase().includes(s) ||
        (c && c.toLowerCase().includes(s)) ||
        item.type.includes(s)
      );
    });
  }, [allSubmissions, allParticipants, activeTab, search, reasonFilter]);

  const uniqueReasons = Array.from(new Set([
    ...allParticipants.map(p => p.reason),
    ...allSubmissions.map(s => s.reason)
  ])).filter(Boolean) as string[];

  const isLoading = loadingReviews || loadingParticipants;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 border-b border-border pb-6 pt-2 gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-foreground tracking-tight flex items-center gap-3 mb-2">
            <Flag className="h-6 w-6 text-warning" /> Flagged Reviews
          </h1>
          <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-lg w-fit">
            <button 
              onClick={() => setActiveTab("participants")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "participants" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
            >
              Participants
            </button>
            <button 
              onClick={() => setActiveTab("submissions")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "submissions" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
            >
              Submissions
            </button>
            <button 
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
            >
              All
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flagged..."
              className="pl-9 h-9 bg-card border-border text-sm focus:border-primary shadow-none rounded-[12px]"
            />
          </div>
          <select 
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="h-9 px-3 bg-card border border-border rounded-[12px] text-sm focus:outline-none focus:border-primary text-muted-foreground"
          >
            <option value="all">All Reasons</option>
            {uniqueReasons.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-card border border-border rounded-[18px] h-48 animate-pulse" />)}
        </div>
      ) : !filteredItems.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-card border border-border rounded-[24px]">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(24,195,126,0.15)]">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2 tracking-tight">All Clear</h2>
          <p className="text-muted-foreground max-w-sm">No flagged items found for this filter. Everything looks clean.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            if (item.type === "participant") {
              const p = item as FlaggedParticipant & { type: string };
              return (
                <div key={p.id} className="bg-card border border-border rounded-[18px] p-5 flex flex-col justify-between hover:border-border/80 transition-colors shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/5 rounded-bl-[100px] pointer-events-none" />
                  
                  <div>
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div>
                        <h3 className="font-bold text-destructive text-lg mb-1 flex items-center gap-2">
                          <Flag className="h-4 w-4" />
                          <Link href={`/participants/${p.username}`} className="hover:text-destructive/80 transition-colors">
                            {p.username}
                          </Link>
                        </h3>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          {p.contest.name}
                        </div>
                      </div>
                      <span className="bg-destructive/10 text-destructive px-2.5 py-1 rounded-[8px] text-[10px] font-bold uppercase tracking-wider">
                        {p.reason || "Flagged"}
                      </span>
                    </div>
                    
                    <div className="mb-6 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-bold">Solved</div>
                        <div className="text-sm font-semibold text-foreground">{p.problemsSolved} Problems</div>
                      </div>
                      {p.leaderboard && (
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-bold">Official Rank</div>
                          <div className="text-sm font-semibold text-foreground">#{p.leaderboard.officialRank} ({p.leaderboard.score} pts)</div>
                        </div>
                      )}
                      {p.notes && (
                        <div className="col-span-2 mt-2 text-xs text-muted-foreground bg-destructive/5 p-3 rounded-lg border border-destructive/10 font-mono">
                          {p.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <Button 
                      onClick={() => handleUnflagParticipant(p.username, p.contest.slug)}
                      variant="outline" 
                      className="flex-1 rounded-[12px] h-9 text-xs font-medium border-border hover:bg-success/10 hover:text-success hover:border-success/30 transition-colors"
                    >
                      Unflag
                    </Button>
                    <Link href={`/participants/${p.username}`} className="flex-1">
                      <Button 
                        variant="outline"
                        className="w-full rounded-[12px] h-9 text-xs font-medium border-border hover:bg-accent"
                      >
                        Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            } else {
              const s = item as FlaggedSubmission & { type: string };
              return (
                <div key={s.id} className="bg-card border border-border rounded-[18px] p-5 flex flex-col justify-between hover:border-border/80 transition-colors shadow-sm">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-foreground text-lg mb-1">
                          <Link href={`/participants/${s.submission.user.username}`} className="hover:text-primary transition-colors">
                            {s.submission.user.username}
                          </Link>
                        </h3>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          {s.submission.problem.contest?.name || "Unknown"}
                        </div>
                      </div>
                      <span className="bg-warning/10 text-warning px-2.5 py-1 rounded-[8px] text-[10px] font-bold uppercase tracking-wider">
                        {s.reason || "Flagged"}
                      </span>
                    </div>
                    
                    <div className="mb-6">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-bold">Submission</div>
                      <div className="text-sm font-semibold text-foreground mb-2">{s.submission.problem.name}</div>
                      {s.notes && (
                        <div className="text-xs text-muted-foreground bg-warning/5 p-3 rounded-lg border border-warning/10 font-mono">
                          {s.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <Button 
                      onClick={() => handleUnflagSubmission(s.submissionId)}
                      variant="outline" 
                      className="flex-1 rounded-[12px] h-9 text-xs font-medium border-border hover:bg-success/10 hover:text-success hover:border-success/30 transition-colors"
                    >
                      Mark Safe
                    </Button>
                    <Link href={`/submissions/${s.submissionId}?participant=${s.submission.user.username}`} className="flex-1">
                      <Button 
                        className="w-full rounded-[12px] h-9 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Review Code
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
