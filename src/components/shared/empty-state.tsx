"use client";

import { FileX, Search, Database, AlertCircle } from "lucide-react";

interface EmptyStateProps {
  icon?: "file" | "search" | "database" | "alert";
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const iconMap = {
  file: FileX,
  search: Search,
  database: Database,
  alert: AlertCircle,
};

export function EmptyState({ icon = "file", title, description, action }: EmptyStateProps) {
  const Icon = iconMap[icon];
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-zinc-800/50 p-4 mb-4">
        <Icon className="h-8 w-8 text-zinc-500" />
      </div>
      <h3 className="text-lg font-medium text-zinc-300 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-500 text-center max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
