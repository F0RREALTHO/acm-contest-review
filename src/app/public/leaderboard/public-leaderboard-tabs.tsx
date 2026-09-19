"use client";

import { useState } from "react";
import { PublicContestBoard } from "@/components/public-contest-board";

interface PublicContest {
  id: string;
  name: string;
  icon: string | null;
  slug: string;
}

export function PublicLeaderboardTabs({
  contests,
}: {
  contests: PublicContest[];
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = contests[activeIdx];

  return (
    <div className="w-full">
      {/* Tab bar — shows names only, never slugs */}
      {contests.length > 1 && (
        <div className="flex gap-1 mb-8 border-b border-border overflow-x-auto">
          {contests.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                i === activeIdx
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {c.icon && <span>{c.icon}</span>}
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Leaderboard — slug is passed as prop, never in URL */}
      <PublicContestBoard key={active.slug} slug={active.slug} contestName={active.name} />
    </div>
  );
}
