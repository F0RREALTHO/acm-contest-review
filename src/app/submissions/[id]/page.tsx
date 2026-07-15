"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useSubmission } from "@/hooks/use-submissions";
import { useContest } from "@/providers/contest-provider";
import { useQuery } from "@tanstack/react-query";
import { MONACO_LANGUAGE_MAP } from "@/lib/constants";
import { ArrowLeft, ChevronLeft, ChevronRight, Flag, Loader2, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => <div className="flex-1 bg-background flex items-center justify-center text-muted-foreground">Loading editor...</div>,
});

export default function SubmissionViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const participant = searchParams.get("participant");
  const { activeContest } = useContest();
  const contest = activeContest || "";

  const { data: submission, isLoading, refetch } = useSubmission(id);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  
  // Flag Dialog State
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagNotes, setFlagNotes] = useState("");

  // Fetch participant profile to get next/prev
  const { data: profile } = useQuery({
    queryKey: ["participant", participant, contest],
    queryFn: async () => {
      if (!participant) return null;
      const res = await fetch(`/api/participants/${participant}?contest=${contest || ""}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!participant,
  });

  const navigation = useMemo(() => {
    if (!profile) return { prev: null, next: null };
    const acceptedIds = profile.weeks
      .flatMap((w: any) => w.problems)
      .map((p: any) => p.latestAccepted?.submissionId)
      .filter(Boolean);

    const currentIndex = acceptedIds.indexOf(id);
    if (currentIndex === -1) return { prev: null, next: null };

    return {
      prev: currentIndex > 0 ? acceptedIds[currentIndex - 1] : null,
      next: currentIndex < acceptedIds.length - 1 ? acceptedIds[currentIndex + 1] : null,
    };
  }, [profile, id]);

  useEffect(() => {
    if (submission && !submission.sourceCode && (submission as any).downloadStatus !== "RATE_LIMITED") {
      setIsDownloading(true);
      fetch("/api/submissions/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: id, priority: "HIGH" }),
      })
        .then(async (res) => {
          if (res.ok) {
            await refetch();
          }
        })
        .finally(() => {
          setIsDownloading(false);
        });
    } else if (submission?.sourceCode) {
      setIsDownloading(false);
    }
  }, [submission, id, refetch]);

  const handleReviewed = async () => {
    setIsFlagging(true);
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: id, reviewed: true }),
      });
      toast.success("Marked as reviewed");
      if (navigation.next) navigateTo(navigation.next);
      else router.push(participant ? `/participants/${participant}` : "/");
    } finally {
      setIsFlagging(false);
    }
  };

  const openFlagDialog = () => {
    setShowFlagDialog(true);
  };

  const submitFlag = async () => {
    if (!flagReason) {
      toast.error("Please select a reason");
      return;
    }

    setIsFlagging(true);
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          submissionId: id, 
          flagged: true, 
          reviewed: true, 
          reason: flagReason,
          notes: flagNotes || undefined 
        }),
      });
      toast.success("Flagged for review");
      setShowFlagDialog(false);
      router.push(participant ? `/participants/${participant}` : "/");
    } catch (e) {
      toast.error("Failed to flag submission");
    } finally {
      setIsFlagging(false);
    }
  };

  const navigateTo = (newId: string) => {
    let url = `/submissions/${newId}`;
    if (participant) url += `?participant=${participant}`;
    router.push(url);
  };

  if (isLoading) return <div className="h-[calc(100vh-3rem)] bg-background flex items-center justify-center text-muted-foreground">Loading submission...</div>;
  if (!submission) return <div className="h-[calc(100vh-3rem)] bg-background flex items-center justify-center text-muted-foreground">Submission not found.</div>;

  const monacoLanguage = MONACO_LANGUAGE_MAP[submission.language] || "plaintext";

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] w-full bg-background text-foreground overflow-hidden">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-1.5 border-b border-border bg-card shrink-0 gap-2">
        <div className="flex items-center gap-3 text-sm">
          <Link href={participant ? `/participants/${participant}` : "/"} className="text-muted-foreground hover:text-foreground flex items-center p-1 hover:bg-slate-800/50 rounded transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">{submission.problem?.name}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground truncate max-w-[150px]">{submission.user?.username}</span>
          {profile?.participantFlag && (
            <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded uppercase tracking-wider font-bold shrink-0 shadow-sm border border-destructive/20">
              Participant Flagged
            </span>
          )}
          <div className="h-4 w-px bg-border hidden sm:block" />
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider hidden sm:inline-block ${
            submission.status === "Accepted" ? "bg-emerald-500/10 text-emerald-500" : 
            submission.status.includes("Wrong Answer") ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
          }`}>
            {submission.status}
          </span>
          <div className="h-4 w-px bg-border hidden lg:block" />
          <span className="font-mono text-muted-foreground hidden lg:block">{submission.language}</span>
          <div className="h-4 w-px bg-border hidden lg:block" />
          <span className="text-muted-foreground hidden lg:block">{formatDateTime(submission.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded bg-background overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              disabled={!navigation.prev}
              onClick={() => navigation.prev && navigateTo(navigation.prev)}
              className="h-7 px-2 rounded-none border-r border-border hover:bg-slate-800/50 text-muted-foreground text-xs"
            >
              <ChevronLeft className="h-3 w-3 mr-1" /> Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!navigation.next}
              onClick={() => navigation.next && navigateTo(navigation.next)}
              className="h-7 px-2 rounded-none hover:bg-slate-800/50 text-muted-foreground text-xs"
            >
              Next <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          
          <div className="h-4 w-px bg-border mx-1" />

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReviewed} 
            disabled={isFlagging}
            className="h-7 border-emerald-900/50 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 text-xs px-2"
          >
            <CheckCircle2 className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Reviewed</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={openFlagDialog} 
            disabled={isFlagging}
            className="h-7 border-rose-900/50 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 text-xs px-2"
          >
            <Flag className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Flag</span>
          </Button>
        </div>
      </div>

      {/* Full Width Editor */}
      <div className="flex-1 relative w-full h-full">
        {submission.sourceCode ? (
          <Editor
            language={monacoLanguage}
            value={submission.sourceCode}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "var(--font-mono)",
              lineNumbers: "on",
              wordWrap: "on",
              scrollBeyondLastLine: false,
              padding: { top: 16 }
            }}
          />
        ) : isDownloading || (submission as any).downloadStatus === "DOWNLOADING" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-background">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p>Downloading source code...</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-background">
            <p>Source code not available.</p>
          </div>
        )}
      </div>

      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Flag Submission</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Select value={flagReason} onValueChange={(val) => setFlagReason(val || "")}>
                <SelectTrigger id="reason" className="w-full bg-background border-border">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground">
                  <SelectItem value="Plagiarism / Code Similarity">Plagiarism / Code Similarity</SelectItem>
                  <SelectItem value="Hardcoded Testcases">Hardcoded Testcases</SelectItem>
                  <SelectItem value="AI Generation Suspected">AI Generation Suspected</SelectItem>
                  <SelectItem value="Malicious Code">Malicious Code</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Optional Notes</Label>
              <Textarea 
                id="notes" 
                value={flagNotes} 
                onChange={(e) => setFlagNotes(e.target.value)}
                placeholder="Provide additional context..." 
                className="bg-background border-border min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlagDialog(false)} className="border-border text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
            <Button variant="default" onClick={submitFlag} disabled={isFlagging || !flagReason} className="bg-destructive hover:bg-destructive/90 text-white">
              {isFlagging ? "Saving..." : "Save Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
