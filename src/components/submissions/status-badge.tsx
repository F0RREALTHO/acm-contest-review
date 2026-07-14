"use client";

import { Badge } from "@/components/ui/badge";
import { getStatusBgColor, getStatusAbbreviation } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  showFull?: boolean;
  className?: string;
}

export function StatusBadge({ status, showFull = false, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`${getStatusBgColor(status)} font-mono text-xs ${className || ""}`}
    >
      {showFull ? status : getStatusAbbreviation(status)}
    </Badge>
  );
}
