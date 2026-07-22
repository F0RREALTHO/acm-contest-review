"use client";

import { useState, useMemo } from "react";
import { FileDown, Users, ShieldAlert, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateResultsPdf, type PdfParticipant } from "@/lib/generate-results-pdf";

interface LeaderboardEntry {
  username: string;
  hrRank: number;
  officialRank: number;
  score: number;
  timeTaken: number;
  country?: string | null;
  avatar?: string | null;
  problemsSolved: number;
  status: string;
  participantFlag?: {
    reason: string;
    notes?: string | null;
  } | null;
}

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  contestName: string;
  contestIcon?: string | null;
  totalProblems: number;
  leaderboardData: LeaderboardEntry[];
}

export function ExportPdfModal({
  isOpen,
  onClose,
  contestName,
  contestIcon,
  totalProblems,
  leaderboardData,
}: ExportPdfModalProps) {
  const [topX, setTopX] = useState(30);
  const [allowedUsernames, setAllowedUsernames] = useState<Set<string>>(new Set());

  // Separate clean-ranked and flagged participants
  const { cleanRanked, flaggedParticipants } = useMemo(() => {
    const clean: LeaderboardEntry[] = [];
    const flagged: LeaderboardEntry[] = [];

    for (const entry of leaderboardData) {
      const isFlagged = entry.status === "FLAGGED" || !!entry.participantFlag;
      if (isFlagged) {
        flagged.push(entry);
      } else {
        clean.push(entry);
      }
    }

    // Sort clean by officialRank
    clean.sort((a, b) => a.officialRank - b.officialRank);
    // Sort flagged by hrRank (original HackerRank position)
    flagged.sort((a, b) => a.hrRank - b.hrRank);

    return { cleanRanked: clean, flaggedParticipants: flagged };
  }, [leaderboardData]);

  const selectedClean = cleanRanked.slice(0, topX);
  const selectedAllowed = flaggedParticipants.filter((p) => allowedUsernames.has(p.username));
  const totalSelected = selectedClean.length + selectedAllowed.length;
  const maxClean = cleanRanked.length;

  const toggleAllow = (username: string) => {
    setAllowedUsernames((prev) => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
      } else {
        next.add(username);
      }
      return next;
    });
  };

  const toggleAllFlagged = () => {
    if (selectedAllowed.length === flaggedParticipants.length) {
      setAllowedUsernames(new Set());
    } else {
      setAllowedUsernames(new Set(flaggedParticipants.map((p) => p.username)));
    }
  };

  const handleGenerate = () => {
    const cleanPdf: PdfParticipant[] = selectedClean.map((p, i) => ({
      rank: i + 1,
      hrRank: p.hrRank,
      username: p.username,
      country: p.country,
      score: p.score,
      timeTaken: p.timeTaken,
      problemsSolved: p.problemsSolved,
    }));

    const flaggedPdf: PdfParticipant[] = selectedAllowed.map((p) => ({
      rank: 0,
      hrRank: p.hrRank,
      username: p.username,
      country: p.country,
      score: p.score,
      timeTaken: p.timeTaken,
      problemsSolved: p.problemsSolved,
      isFlaggedButAllowed: true,
      flagReason: p.participantFlag?.reason || "Flagged",
    }));

    generateResultsPdf({
      contestName,
      contestIcon,
      totalProblems,
      topX: Math.min(topX, maxClean),
      cleanParticipants: cleanPdf,
      allowedFlagged: flaggedPdf,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border text-foreground max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Export Results PDF
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
          {/* Top X Input */}
          <div className="space-y-2">
            <Label htmlFor="topX" className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Top Ranked Participants
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="topX"
                type="number"
                min={1}
                max={maxClean}
                value={topX}
                onChange={(e) => setTopX(Math.max(1, Math.min(maxClean, parseInt(e.target.value) || 1)))}
                className="w-24 bg-background border-border text-center font-mono text-lg font-bold"
              />
              <span className="text-sm text-muted-foreground">
                out of {maxClean} clean participants
              </span>
            </div>
          </div>

          {/* Flagged Participants */}
          {flaggedParticipants.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  Allow Flagged Participants
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({flaggedParticipants.length} flagged)
                  </span>
                </Label>
                <button
                  onClick={toggleAllFlagged}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {selectedAllowed.length === flaggedParticipants.length ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div className="space-y-1 rounded-lg border border-border bg-background p-1">
                {flaggedParticipants.map((p) => {
                  const isAllowed = allowedUsernames.has(p.username);
                  return (
                    <button
                      key={p.username}
                      onClick={() => toggleAllow(p.username)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isAllowed
                          ? "bg-amber-500/10 border border-amber-500/30"
                          : "hover:bg-accent border border-transparent"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                          isAllowed
                            ? "bg-amber-500 border-amber-500"
                            : "border-border bg-background"
                        }`}
                      >
                        {isAllowed && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{p.username}</span>
                          {p.country && (
                            <span className="text-xs text-muted-foreground">{p.country}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>Score: <strong className="text-foreground">{p.score}</strong></span>
                          <span>Solved: <strong className="text-foreground">{p.problemsSolved}/{totalProblems}</strong></span>
                          <span className="text-amber-500">
                            {p.participantFlag?.reason || "Flagged"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-background border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground mb-2 font-medium">PDF Summary</div>
            <div className="flex items-center gap-2 text-lg font-bold text-foreground">
              <span className="text-primary">{Math.min(topX, maxClean)}</span>
              <span className="text-muted-foreground text-sm font-normal">ranked</span>
              {selectedAllowed.length > 0 && (
                <>
                  <span className="text-muted-foreground text-sm font-normal">+</span>
                  <span className="text-amber-500">{selectedAllowed.length}</span>
                  <span className="text-muted-foreground text-sm font-normal">allowed</span>
                </>
              )}
              <span className="text-muted-foreground text-sm font-normal">=</span>
              <span className="text-emerald-500">{totalSelected}</span>
              <span className="text-muted-foreground text-sm font-normal">total</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <FileDown className="h-4 w-4" />
            Generate PDF ({totalSelected})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
