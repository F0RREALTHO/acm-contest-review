"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContest } from "@/providers/contest-provider";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flag, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContestTab {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  enabled: boolean;
  displayOrder: number;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeContest, setActiveContest } = useContest();

  const { data: contests } = useQuery<ContestTab[]>({
    queryKey: ["contests-nav"],
    queryFn: async () => {
      const res = await fetch("/api/contests");
      if (!res.ok) return [];
      const data = await res.json();
      return data.filter((c: ContestTab) => c.enabled);
    },
    staleTime: 60_000, // cache for 1 minute
  });

  useEffect(() => {
    if (contests?.length && !activeContest && !localStorage.getItem("acm_active_contest")) {
      setActiveContest(contests[0].slug);
    }
  }, [contests, activeContest, setActiveContest]);


  return (
    <header className="sticky top-0 z-40 flex h-[72px] shrink-0 items-center border-b border-border bg-[#08111F]/90 backdrop-blur-lg px-4 sm:px-8 md:px-12">
      <div className="flex flex-1 items-center gap-6 h-full">
        <div className="flex items-center">
          <img src="/acm-logo.svg" alt="ACM" className="h-8 w-8 mr-3" />
          <span className="font-bold text-foreground text-base tracking-tight">ACM Review</span>
          <div className="h-5 w-px bg-border mx-4 hidden sm:block" />
          <span className="text-sm font-medium text-muted-foreground hidden sm:block">Contest Review Dashboard</span>
        </div>
        
        <nav className="flex items-center h-full">
          {/* Dynamic contest tabs */}
          {contests?.map((contest) => {
            const isActive = activeContest === contest.slug && pathname === "/";

            return (
              <button
                key={contest.id}
                onClick={() => {
                  setActiveContest(contest.slug);
                  if (pathname !== "/") router.push("/");
                }}
                className={cn(
                  "flex items-center gap-2 px-4 h-full text-sm font-medium transition-colors relative cursor-pointer",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {contest.name}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}

          {/* Static tabs */}
          <Link
            href="/flagged"
            className={cn(
              "flex items-center gap-2 px-4 h-full text-sm font-medium transition-colors relative",
              pathname.startsWith("/flagged") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Flag className="h-4 w-4" />
            Flagged
            {pathname.startsWith("/flagged") && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </Link>
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2 px-4 h-full text-sm font-medium transition-colors relative",
              pathname.startsWith("/settings") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
            {pathname.startsWith("/settings") && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
