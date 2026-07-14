"use client";

import { useQuery } from "@tanstack/react-query";

export function useParticipants(params: {
  page?: number;
  limit?: number;
  search?: string;
  week?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: ["participants", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.set(key, String(value));
        }
      });
      const res = await fetch(`/api/participants?${searchParams}`);
      if (!res.ok) throw new Error("Failed to fetch participants");
      return res.json();
    },
  });
}

export function useParticipant(username: string) {
  return useQuery({
    queryKey: ["participant", username],
    queryFn: async () => {
      const res = await fetch(`/api/participants/${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error("Failed to fetch participant");
      return res.json();
    },
    enabled: !!username,
  });
}

export function useParticipantAnalytics(username: string) {
  return useQuery({
    queryKey: ["participant-analytics", username],
    queryFn: async () => {
      const res = await fetch(`/api/participants/${encodeURIComponent(username)}/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!username,
  });
}
