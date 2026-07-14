"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useReviewQueue(week?: number | null) {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  const queueQuery = useQuery({
    queryKey: ["review-queue", week],
    queryFn: async () => {
      const params = week ? `?week=${week}` : "";
      const res = await fetch(`/api/reviews/queue${params}`);
      if (!res.ok) throw new Error("Failed to fetch review queue");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: {
      submissionId: string;
      reviewed?: boolean;
      flagged?: boolean;
      notes?: string;
    }) => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });

  const dashboardQuery = useQuery({
    queryKey: ["review-dashboard", week],
    queryFn: async () => {
      const params = week ? `?week=${week}` : "";
      const res = await fetch(`/api/reviews/dashboard${params}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });

  const currentSubmission = queueQuery.data?.data?.[currentIndex] || null;
  const totalInQueue = queueQuery.data?.total || 0;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= totalInQueue - 1) return 0;
      return prev + 1;
    });
  }, [totalInQueue]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev <= 0) return Math.max(0, totalInQueue - 1);
      return prev - 1;
    });
  }, [totalInQueue]);

  // Background YouTube-style buffering
  useEffect(() => {
    if (!queueQuery.data?.data) return;
    
    // We want to prefetch the NEXT 5 submissions
    const queue = queueQuery.data.data;
    if (queue.length === 0) return;
    
    const prefetchCount = 5;
    for (let i = 1; i <= prefetchCount; i++) {
       const prefetchIndex = (currentIndex + i) % queue.length;
       const submission = queue[prefetchIndex];
       if (submission) {
          // Trigger MEDIUM priority download silently
          fetch("/api/submissions/download", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ submissionId: submission.submissionId, priority: "MEDIUM" })
          }).catch(() => {}); // silent fail
       }
    }
  }, [currentIndex, queueQuery.data?.data]);

  const markReviewed = useCallback(
    async (notes?: string) => {
      if (!currentSubmission) return;
      await reviewMutation.mutateAsync({
        submissionId: currentSubmission.submissionId,
        reviewed: true,
        notes,
      });
      goToNext();
    },
    [currentSubmission, reviewMutation, goToNext]
  );

  const markFlagged = useCallback(
    async (notes?: string) => {
      if (!currentSubmission) return;
      await reviewMutation.mutateAsync({
        submissionId: currentSubmission.submissionId,
        reviewed: true,
        flagged: true,
        notes,
      });
      goToNext();
    },
    [currentSubmission, reviewMutation, goToNext]
  );

  return {
    queue: queueQuery.data?.data || [],
    currentSubmission,
    currentIndex,
    totalInQueue,
    isLoading: queueQuery.isLoading,
    goToNext,
    goToPrevious,
    markReviewed,
    markFlagged,
    isReviewing: reviewMutation.isPending,
    dashboard: dashboardQuery.data,
    isDashboardLoading: dashboardQuery.isLoading,
  };
}
