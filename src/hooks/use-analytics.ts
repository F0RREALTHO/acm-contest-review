"use client";

import { useQuery } from "@tanstack/react-query";

export function useAnalytics(week?: number | null) {
  return useQuery({
    queryKey: ["analytics", week],
    queryFn: async () => {
      const params = week ? `?week=${week}` : "";
      const res = await fetch(`/api/analytics${params}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });
}
