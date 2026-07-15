"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ContestContextType {
  activeContest: string | null;
  setActiveContest: (slug: string) => void;
}

const ContestContext = createContext<ContestContextType>({
  activeContest: null,
  setActiveContest: () => {},
});

export function ContestProvider({ children }: { children: ReactNode }) {
  const [activeContest, setActiveContestState] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("acm_active_contest");
    if (saved) {
      setActiveContestState(saved);
    }
  }, []);

  const setActiveContest = (slug: string) => {
    setActiveContestState(slug);
    localStorage.setItem("acm_active_contest", slug);
  };

  return (
    <ContestContext.Provider value={{ activeContest, setActiveContest }}>
      {children}
    </ContestContext.Provider>
  );
}

export function useContest() {
  return useContext(ContestContext);
}
