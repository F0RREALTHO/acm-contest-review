"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Flag } from "lucide-react";

interface FlaggedSubmission {
  id: string;
  submissionId: string;
  reason: string | null;
  notes: string | null;
  submission: {
    language: string;
    user: { username: string };
    problem: { name: string; contest: { slug: string } };
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
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
          <Flag className="h-6 w-6 text-destructive" /> Flagged Submissions
        </h1>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading flagged submissions...</div>
      ) : !reviews?.data?.length ? (
        <div className="text-muted-foreground">No flagged submissions.</div>
      ) : (
        <div className="border border-border rounded-md bg-card overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="bg-muted border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Contest</th>
                <th className="px-4 py-3 font-medium">Participant</th>
                <th className="px-4 py-3 font-medium">Problem</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {reviews.data.map((review, index) => (
                <tr 
                  key={review.id} 
                  className={`h-12 hover:bg-slate-800/30 transition-colors group border-b border-border/50 last:border-0 ${
                    index % 2 === 0 ? "bg-transparent" : "bg-black/10"
                  }`}
                >
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {review.submission.problem.contest?.name || "Unknown"}
                  </td>
                  <td className="px-4 py-2">
                    <Link 
                      href={`/participants/${review.submission.user.username}?contest=${review.submission.problem.contest?.slug}`}
                      className="text-foreground font-medium hover:text-primary transition-colors"
                    >
                      {review.submission.user.username}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-foreground font-medium">{review.submission.problem.name}</td>
                  <td className="px-4 py-2 text-destructive font-medium uppercase tracking-wider text-[11px]">{review.reason || "-"}</td>
                  <td className="px-4 py-2 text-amber-500/80 max-w-xs truncate text-xs" title={review.notes || ""}>{review.notes || "-"}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <button 
                        onClick={() => handleUnflag(review.submissionId)}
                        className="text-xs text-muted-foreground hover:text-destructive font-medium transition-colors uppercase tracking-wider"
                      >
                        Unflag
                      </button>
                      <Link 
                        href={`/submissions/${review.submissionId}?participant=${review.submission.user.username}&contest=${review.submission.problem.contest?.slug}`}
                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors uppercase tracking-wider"
                      >
                        View Code
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
