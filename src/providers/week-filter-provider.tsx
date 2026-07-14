"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface WeekFilterContextType {
  selectedWeek: number | null; // null = all weeks
  setSelectedWeek: (week: number | null) => void;
  availableWeeks: number[];
  setAvailableWeeks: (weeks: number[]) => void;
}

const WeekFilterContext = createContext<WeekFilterContextType | undefined>(undefined);

export function WeekFilterProvider({ children }: { children: ReactNode }) {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);

  const handleSetWeek = useCallback((week: number | null) => {
    setSelectedWeek(week);
  }, []);

  const handleSetWeeks = useCallback((weeks: number[]) => {
    setAvailableWeeks(weeks);
  }, []);

  return (
    <WeekFilterContext.Provider
      value={{
        selectedWeek,
        setSelectedWeek: handleSetWeek,
        availableWeeks,
        setAvailableWeeks: handleSetWeeks,
      }}
    >
      {children}
    </WeekFilterContext.Provider>
  );
}

export function useWeekFilter() {
  const context = useContext(WeekFilterContext);
  if (!context) {
    throw new Error("useWeekFilter must be used within a WeekFilterProvider");
  }
  return context;
}
