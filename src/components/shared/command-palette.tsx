"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Users, Code2, FileText, Settings, LayoutDashboard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: searchResults } = useQuery({
    queryKey: ["global-search"],
    queryFn: async () => {
      const res = await fetch("/api/search?q=");
      if (!res.ok) return { participants: [], problems: [], submissions: [] };
      return res.json();
    },
    enabled: open,
  });

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl border-zinc-800 bg-zinc-950/90 backdrop-blur-xl sm:max-w-[600px] rounded-xl">
        <Command className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-transparent text-zinc-100">
          <div className="flex items-center border-b border-zinc-800 px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search participants, problems, or navigate..."
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
            <Command.Empty className="py-6 text-center text-sm text-zinc-500">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-xs font-medium text-zinc-500 mb-2 px-2 py-1">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-zinc-800/50 aria-selected:text-zinc-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/settings"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-zinc-800/50 aria-selected:text-zinc-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Command.Item>
            </Command.Group>

            {searchResults?.participants && searchResults.participants.length > 0 && (
              <Command.Group heading="Participants" className="text-xs font-medium text-zinc-500 mb-2 px-2 py-1">
                {searchResults.participants.slice(0, 5).map((p: any) => (
                  <Command.Item
                    key={p.id}
                    onSelect={() => runCommand(() => router.push(`/participants/${p.username}`))}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-zinc-800/50 aria-selected:text-zinc-100 transition-colors"
                  >
                    <Users className="mr-2 h-4 w-4 text-zinc-400" />
                    <span>{p.username}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {searchResults?.problems && searchResults.problems.length > 0 && (
              <Command.Group heading="Problems" className="text-xs font-medium text-zinc-500 mb-2 px-2 py-1">
                {searchResults.problems.slice(0, 5).map((p: any) => (
                  <Command.Item
                    key={p.id}
                    onSelect={() => runCommand(() => router.push(`/problems/${p.slug}`))}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-zinc-800/50 aria-selected:text-zinc-100 transition-colors"
                  >
                    <Code2 className="mr-2 h-4 w-4 text-zinc-400" />
                    <span>{p.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
