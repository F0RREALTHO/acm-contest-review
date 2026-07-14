"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function useReplay() {
  const [selectedWeek, setSelectedWeek] = useState(1);

  const replayQuery = useQuery({
    queryKey: ["replay", selectedWeek],
    queryFn: async () => {
      const res = await fetch(`/api/replay?week=${selectedWeek}`);
      if (!res.ok) throw new Error("Failed to fetch replay data");
      return res.json();
    },
  });

  const weeksQuery = useQuery({
    queryKey: ["replay-weeks"],
    queryFn: async () => {
      const res = await fetch("/api/replay?getWeeks=true");
      if (!res.ok) throw new Error("Failed to fetch weeks");
      return res.json();
    },
  });

  return {
    selectedWeek,
    setSelectedWeek,
    replayData: replayQuery.data,
    isLoading: replayQuery.isLoading,
    availableWeeks: weeksQuery.data || [],
    isWeeksLoading: weeksQuery.isLoading,
  };
}
