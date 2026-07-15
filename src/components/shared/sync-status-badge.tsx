"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SyncStatus {
  status: "synced" | "syncing" | "failed" | "not_synced";
  contest: string;
  stage?: string;
  processed?: number;
  total?: number;
  lastSync?: string | null;
  error?: string;
}

export function SyncStatusBadge({ contestSlug }: { contestSlug: string }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<SyncStatus>({
    queryKey: ["sync-status", contestSlug],
    queryFn: async () => {
      const res = await fetch(`/api/sync/status?contestSlug=${contestSlug}`);
      if (!res.ok) throw new Error("Failed to fetch sync status");
      return res.json();
    },
    refetchInterval: (query: any) => {
      if (isSyncing) return 2500;
      return query?.state?.data?.status === "syncing" ? 2500 : 30000;
    },
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch("/api/internal/sync", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contestSlug })
      });
    } catch (e) {
      // sync failed, will be picked up by status refetch
    } finally {
      setIsSyncing(false);
      // Invalidate all related queries so leaderboard etc. refresh
      queryClient.invalidateQueries({ queryKey: ["sync-status", contestSlug] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard", contestSlug] });
    }
  };

  if (isSyncing || (data?.status === "syncing")) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-500 font-medium bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>
          {data?.stage || "Syncing..."}
          {data?.processed !== undefined && data?.total !== undefined ? ` (${data.processed}/${data.total})` : ""}
        </span>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking sync status...
      </div>
    );
  }




  if (data.status === "failed") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-xs text-rose-500 font-medium bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20">
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="truncate max-w-[200px]" title={data.error}>
            Failed: {data.error || "Unknown error"}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSync} className="h-7 px-2 text-zinc-400 hover:text-zinc-200">
          <RefreshCw className="h-3 w-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {data.status === "not_synced" ? (
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium bg-zinc-500/10 px-3 py-1.5 rounded-full border border-zinc-500/20">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Not synced</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{data.lastSync ? `Synced ${formatRelativeTime(data.lastSync)}` : "Synced"}</span>
        </div>
      )}
      <Button variant="ghost" size="sm" onClick={handleSync} className="h-7 px-2 text-zinc-400 hover:text-zinc-200">
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
}
