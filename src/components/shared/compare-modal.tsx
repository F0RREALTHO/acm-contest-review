"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, ArrowRightLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime, getStatusAbbreviation } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useContest } from "@/providers/contest-provider";

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseSubmissionId: string;
  problemId: string;
}

export function CompareModal({ isOpen, onClose, baseSubmissionId, problemId }: CompareModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["submissions-for-compare", problemId],
    queryFn: async () => {
      // Fetch up to 200 submissions for this problem to select from
      const res = await fetch(`/api/submissions?problemId=${problemId}&limit=200`);
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json();
    },
    enabled: isOpen && !!problemId,
  });

  const filteredSubmissions = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((s: any) => 
      s.submissionId !== baseSubmissionId && 
      (s.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       s.language?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       s.status?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [data, searchQuery, baseSubmissionId]);

  const handleCompare = () => {
    if (!selectedId) return;
    router.push(`/submissions/compare?base=${baseSubmissionId}&compare=${selectedId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Compare Submissions</DialogTitle>
          <DialogDescription>
            Select a submission to compare against. The diff viewer will highlight the differences.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by username, language, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>

          <div className="border border-border rounded-md bg-background overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
                No other submissions found.
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="flex flex-col p-1">
                  {filteredSubmissions.map((s: any) => (
                    <button
                      key={s.submissionId}
                      onClick={() => setSelectedId(s.submissionId)}
                      className={`flex items-center justify-between p-3 text-left rounded-md transition-colors ${
                        selectedId === s.submissionId 
                          ? "bg-primary/15 border-primary/30 border" 
                          : "hover:bg-accent border border-transparent"
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-sm">{s.user?.username || "Unknown"}</span>
                        <div className="flex gap-2 text-xs text-muted-foreground font-mono">
                          <span>{s.language}</span>
                          <span>&bull;</span>
                          <span>{formatDateTime(s.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                          s.status === "Accepted" ? "bg-emerald-500/10 text-emerald-500" : 
                          s.status.includes("Wrong") ? "bg-red-500/10 text-red-500" : "bg-zinc-500/10 text-zinc-500"
                        }`}>
                          {getStatusAbbreviation(s.status)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCompare} disabled={!selectedId} className="gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Compare
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
