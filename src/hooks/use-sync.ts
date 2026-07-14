"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SyncProgressEvent, SyncState } from "@/types/sync";

export function useSync() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SyncState>({
    isRunning: false,
    progress: null,
    summary: null,
    error: null,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  const startSync = useCallback(async ({ contestSlug, fullSync = false }: { contestSlug: string; fullSync?: boolean }) => {
    setState({
      isRunning: true,
      progress: null,
      summary: null,
      error: null,
    });

    try {
      // Start SSE listener
      const es = new EventSource(`/api/sync/status?contestSlug=${contestSlug}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SyncProgressEvent;
          setState((prev) => ({
            ...prev,
            progress: data,
          }));

          if (data.phase === "complete") {
            es.close();
            setState((prev) => ({
              ...prev,
              isRunning: false,
            }));
            // Invalidate all queries after sync
            queryClient.invalidateQueries();
          }

          if (data.phase === "error") {
            es.close();
            setState((prev) => ({
              ...prev,
              isRunning: false,
              error: data.message,
            }));
          }
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
      };

      // Trigger sync via POST
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contestSlug, fullSync }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sync failed");
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isRunning: false,
        error: error instanceof Error ? error.message : "Sync failed",
      }));
    }
  }, [queryClient]);

  const stopListening = useCallback(() => {
    eventSourceRef.current?.close();
  }, []);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return {
    ...state,
    startSync,
    stopListening,
  };
}
