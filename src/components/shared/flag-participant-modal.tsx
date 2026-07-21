"use client";

import { useState } from "react";
import { Flag, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const REASONS = [
  "Similar Code",
  "AI Generated",
  "Suspicious Behaviour",
  "Plagiarism",
  "Multiple Accounts",
  "Manual Review",
  "Other"
];

interface FlagParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  contestSlug: string;
  onSuccess?: () => void;
}

export function FlagParticipantModal({
  isOpen,
  onClose,
  username,
  contestSlug,
  onSuccess
}: FlagParticipantModalProps) {
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/participant-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          contestSlug,
          reason,
          notes: notes.trim() || "",
        }),
      });

      if (res.ok) {
        onSuccess?.();
        onClose();
        setReason(REASONS[0]);
        setNotes("");
      } else {
        console.error("Failed to flag participant");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-card border border-border rounded-[24px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Flag Participant
            </h2>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-accent text-muted-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive/90 leading-relaxed">
              Flagging this participant marks the entire participant as suspicious and moves them to the Flagged page.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Participant
              </label>
              <div className="px-3 py-2 bg-accent rounded-lg text-sm text-muted-foreground font-mono">
                {username}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Reason <span className="text-destructive">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-10 px-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
              >
                {REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Remark {reason === "Other" && <span className="text-destructive">*</span>}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={reason === "Other" ? "Provide specific details for flagging..." : "Add an optional remark for other reviewers..."}
                className="w-full min-h-[80px] p-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow resize-none"
                required={reason === "Other"}
              />
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 min-w-[140px]"
              disabled={isSubmitting || (reason === "Other" && !notes.trim())}
            >
              {isSubmitting ? "Flagging..." : "Flag Participant"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
