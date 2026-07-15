"use client";

import { Header } from "./header";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-background text-foreground flex flex-col items-center">
      <div className="w-full max-w-[1500px] flex flex-col flex-1">
        <Header />
        <main className="flex-1 w-full px-4 sm:px-8 md:px-12 pb-12 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
