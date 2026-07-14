"use client";

import { useQuery } from "@tanstack/react-query";

export function useProblems(params: {
  page?: number;
  limit?: number;
  week?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ["problems", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.set(key, String(value));
        }
      });
      const res = await fetch(`/api/problems?${searchParams}`);
      if (!res.ok) throw new Error("Failed to fetch problems");
      return res.json();
    },
  });
}

export function useProblem(slug: string) {
  return useQuery({
    queryKey: ["problem", slug],
    queryFn: async () => {
      const res = await fetch(`/api/problems/${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error("Failed to fetch problem");
      return res.json();
    },
    enabled: !!slug,
  });
}

export function useProblemAnalytics(slug: string) {
  return useQuery({
    queryKey: ["problem-analytics", slug],
    queryFn: async () => {
      const res = await fetch(`/api/problems/${encodeURIComponent(slug)}/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!slug,
  });
}
