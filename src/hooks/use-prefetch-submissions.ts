"use client";

import { useEffect, useRef } from "react";

/**
 * Prefetches all submission source code for a participant after they've been
 * viewed for a configurable dwell time (default 5 seconds).
 *
 * This ensures that when a reviewer clicks into individual submissions,
 * the source code is already cached and loads instantly instead of waiting
 * for each download one by one.
 */
export function usePrefetchSubmissions(
  username: string | undefined,
  contestSlug: string | undefined,
  { dwellMs = 5000, enabled = true } = {}
) {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!enabled || !username || hasFiredRef.current) return;

    const timer = setTimeout(() => {
      hasFiredRef.current = true;

      // Fire-and-forget — we don't need to await or handle the response
      fetch("/api/submissions/prefetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, contestSlug }),
      }).catch((err) => {
        // Silently swallow — this is best-effort background optimization
        console.debug("[Prefetch] Background prefetch failed:", err.message);
      });
    }, dwellMs);

    return () => {
      clearTimeout(timer);
    };
  }, [username, contestSlug, dwellMs, enabled]);
}
