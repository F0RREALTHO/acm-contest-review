"use client";

import { useContest } from "@/providers/contest-provider";
import { ContestBoard } from "@/components/contest-board";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const { activeContest } = useContest();

  if (!activeContest) {
    return (
      <div className="flex h-[calc(100vh-3rem)] w-full items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      </div>
    );
  }

  return <ContestBoard slug={activeContest} />;
}
