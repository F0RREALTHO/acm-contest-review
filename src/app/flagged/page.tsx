"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Flag, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function FlaggedPage() {
  const { data: reviews, isLoading, refetch } = useQuery<{ data: FlaggedSubmission[] }>({
    queryKey: ["flagged-reviews"],
    queryFn: async () => {
      const res = await fetch("/api/reviews?flagged=true&limit=100");
      if (!res.ok) throw new Error("Failed to fetch flagged reviews");
      return res.json();
    },
  });

  const handleUnflag = async (submissionId: string) => {
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, flagged: false, reason: null, notes: null }),
      });
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8 border-b border-border pb-6 pt-2">
        <h1 className="text-[28px] font-bold text-foreground tracking-tight flex items-center gap-3">
          <Flag className="h-6 w-6 text-warning" /> Flagged Reviews
        </h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-card border border-border rounded-[18px] h-48 animate-pulse" />)}
        </div>
      ) : !reviews?.data?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-card border border-border rounded-[24px]">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(24,195,126,0.15)]">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2 tracking-tight">All Clear</h2>
          <p className="text-muted-foreground max-w-sm">No flagged submissions at the moment. Everything looks clean and perfectly normal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.data.map((review) => (
            <div key={review.id} className="bg-card border border-border rounded-[18px] p-5 flex flex-col justify-between hover:border-border/80 transition-colors">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-1">
                      <Link href={`/participants/${review.submission.user.username}`} className="hover:text-primary transition-colors">
                        {review.submission.user.username}
                      </Link>
                    </h3>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="font-medium">{review.submission.problem.contest?.name || "Unknown"}</span>
                    </div>
                  </div>
                  <span className="bg-warning/10 text-warning px-2.5 py-1 rounded-[8px] text-[10px] font-bold uppercase tracking-wider">
                    {review.reason || "Flagged"}
                  </span>
                </div>
                
                <div className="mb-6">
                  <div className="text-sm font-semibold text-foreground mb-1.5">{review.submission.problem.name}</div>
                  {review.notes && (
                    <div className="text-xs text-muted-foreground bg-accent/30 p-3 rounded-lg border border-border/50 font-mono">
                      {review.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Button 
                  onClick={() => handleUnflag(review.submissionId)}
                  variant="outline" 
                  className="flex-1 rounded-[12px] h-9 text-xs font-medium border-border hover:bg-success/10 hover:text-success hover:border-success/30 transition-colors"
                >
                  Mark Safe
                </Button>
                <Link href={`/submissions/${review.submissionId}?participant=${review.submission.user.username}`} className="flex-1">
                  <Button 
                    className="w-full rounded-[12px] h-9 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Review
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
