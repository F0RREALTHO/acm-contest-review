"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse } from "@/types/api";

export function useSubmissions(params: {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
  problemId?: string;
  week?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: ["submissions", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.set(key, String(value));
        }
      });
      const res = await fetch(`/api/submissions?${searchParams}`);
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json() as Promise<PaginatedResponse<unknown>>;
    },
  });
}

export function useSubmission(id: string) {
  return useQuery({
    queryKey: ["submission", id],
    queryFn: async () => {
      const res = await fetch(`/api/submissions/${id}`);
      if (!res.ok) throw new Error("Failed to fetch submission");
      return res.json();
    },
    enabled: !!id,
  });
}
