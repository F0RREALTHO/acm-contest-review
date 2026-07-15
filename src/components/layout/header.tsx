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

  const staticLinks = [
    { name: "Flagged", href: "/flagged", icon: "🚩" },
    { name: "Settings", href: "/settings", icon: "⚙️" },
  ];

  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center border-b border-border bg-background px-6 md:px-10 lg:px-12">
      <div className="flex flex-1 items-center gap-6 h-full">
        <div className="flex items-center gap-2 mr-4">
          <img src="/acm-logo.svg" alt="ACM" className="h-7 w-7" />
          <span className="font-bold text-foreground text-sm">ACM Review</span>
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
                  "flex items-center gap-2 px-4 h-full text-sm font-medium transition-colors relative hover:bg-slate-800/50 cursor-pointer",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {contest.icon && <span className="text-base">{contest.icon}</span>}
                {contest.name}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}

          {/* Static tabs */}
          {staticLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);

            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 h-full text-sm font-medium transition-colors relative hover:bg-slate-800/50",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-base">{link.icon}</span>
                {link.name}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
