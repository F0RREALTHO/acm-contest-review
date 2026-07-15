"use client";

import { use, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useSubmission } from "@/hooks/use-submissions";
import { MONACO_LANGUAGE_MAP } from "@/lib/constants";
import { ArrowLeft, Loader2 } from "lucide-react";

const DiffEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.DiffEditor), {
  ssr: false,
  loading: () => <div className="flex-1 bg-background flex items-center justify-center text-muted-foreground">Loading diff editor...</div>,
});

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const baseId = searchParams.get("base");
  const compareId = searchParams.get("compare");

  const { data: baseSubmission, isLoading: baseLoading, refetch: refetchBase } = useSubmission(baseId || "");
  const { data: compareSubmission, isLoading: compareLoading, refetch: refetchCompare } = useSubmission(compareId || "");

  const [isDownloading, setIsDownloading] = useState(false);

  // Trigger source code download if needed
  useEffect(() => {
    let mounted = true;
    const downloadSources = async () => {
      const needsBase = baseSubmission && !baseSubmission.sourceCode && (baseSubmission as any).downloadStatus !== "RATE_LIMITED";
      const needsCompare = compareSubmission && !compareSubmission.sourceCode && (compareSubmission as any).downloadStatus !== "RATE_LIMITED";
      
      if (!needsBase && !needsCompare) {
        setIsDownloading(false);
        return;
      }

      setIsDownloading(true);
      
      try {
        if (needsBase) {
          await fetch("/api/submissions/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissionId: baseId, priority: "HIGH" }),
          });
          if (mounted) await refetchBase();
        }
        
        if (needsCompare) {
          await fetch("/api/submissions/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissionId: compareId, priority: "HIGH" }),
          });
          if (mounted) await refetchCompare();
        }
      } finally {
        if (mounted) setIsDownloading(false);
      }
    };

    downloadSources();
    return () => { mounted = false; };
  }, [baseSubmission, compareSubmission, baseId, compareId, refetchBase, refetchCompare]);

  if (!baseId || !compareId) {
    return <div className="p-8 text-center text-muted-foreground">Missing submission IDs to compare.</div>;
  }

  if (baseLoading || compareLoading) {
    return <div className="h-[calc(100vh-3rem)] bg-background flex items-center justify-center text-muted-foreground">Loading submissions...</div>;
  }

  if (!baseSubmission || !compareSubmission) {
    return <div className="h-[calc(100vh-3rem)] bg-background flex items-center justify-center text-muted-foreground">One or both submissions not found.</div>;
  }

  const monacoLanguage = MONACO_LANGUAGE_MAP[baseSubmission.language] || "plaintext";

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] w-full bg-background text-foreground overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="text-muted-foreground hover:text-foreground flex items-center p-1 hover:bg-slate-800/50 rounded transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Original (Base)</span>
              <span className="text-sm font-medium text-foreground">{baseSubmission.user?.username} <span className="text-muted-foreground font-mono ml-1 text-xs">{baseSubmission.language}</span></span>
            </div>
            
            <div className="h-8 w-px bg-border hidden sm:block" />
            
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Modified (Comparing)</span>
              <span className="text-sm font-medium text-foreground">{compareSubmission.user?.username} <span className="text-muted-foreground font-mono ml-1 text-xs">{compareSubmission.language}</span></span>
            </div>
          </div>
        </div>
        
        <div className="text-sm font-semibold truncate hidden md:block">
          {baseSubmission.problem?.name}
        </div>
      </div>

      {/* Diff Editor */}
      <div className="flex-1 relative w-full h-full">
        {baseSubmission.sourceCode && compareSubmission.sourceCode ? (
          <DiffEditor
            language={monacoLanguage}
            original={baseSubmission.sourceCode}
            modified={compareSubmission.sourceCode}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "var(--font-mono)",
              lineNumbers: "on",
              wordWrap: "off",
              scrollBeyondLastLine: false,
              padding: { top: 16 }
            }}
          />
        ) : isDownloading || (baseSubmission as any).downloadStatus === "DOWNLOADING" || (compareSubmission as any).downloadStatus === "DOWNLOADING" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-background">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p>Downloading source code...</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-background">
            <p className="mb-2">Source code not available for one or both submissions.</p>
            <p className="text-sm opacity-70 text-center max-w-md">Base status: {(baseSubmission as any).downloadStatus || 'N/A'}<br/>Compare status: {(compareSubmission as any).downloadStatus || 'N/A'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="h-[calc(100vh-3rem)] bg-background flex items-center justify-center text-muted-foreground">Loading comparator...</div>}>
      <CompareContent />
    </Suspense>
  );
}
