"use client";

import { Header } from "./header";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-full">
          {children}
        </main>

    </div>
  );
}
