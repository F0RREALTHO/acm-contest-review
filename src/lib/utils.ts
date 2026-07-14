import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseIntSafe(val: string | null | undefined, fallback: number): number {
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-US', { 
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
  });
}

export function formatRelativeTime(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

export function formatDuration(ms: number) {
  if (!ms) return "0s";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function getStatusBgColor(status: string) {
  const s = status.toLowerCase();
  if (s === "accepted") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (s === "wrong answer") return "bg-red-500/10 text-red-400 border-red-500/20";
  if (s === "time limit exceeded") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (s.includes("error")) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
}

export function getStatusAbbreviation(status: string) {
  const s = status.toLowerCase();
  if (s === "accepted") return "AC";
  if (s === "wrong answer") return "WA";
  if (s === "time limit exceeded") return "TLE";
  if (s.includes("runtime")) return "RE";
  if (s.includes("compile")) return "CE";
  return status.substring(0, 3).toUpperCase();
}

export function generatePaginationParams(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}
