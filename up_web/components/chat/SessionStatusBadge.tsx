"use client";

import { cn } from "@/lib/utils";
import { Loader2, Circle, CheckCircle2, XCircle, StopCircle } from "lucide-react";
import type { SessionStatus } from "@/lib/agent/types";

interface SessionStatusBadgeProps {
  status: SessionStatus;
  teamName?: string;
  className?: string;
}

const statusConfig: Record<
  SessionStatus,
  {
    icon: React.ElementType;
    label: string;
    color: string;
    bgColor: string;
    animate?: boolean;
  }
> = {
  idle: {
    icon: Circle,
    label: "アイドル",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  running: {
    icon: Loader2,
    label: "実行中",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    animate: true,
  },
  completed: {
    icon: CheckCircle2,
    label: "完了",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  error: {
    icon: XCircle,
    label: "エラー",
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  stopped: {
    icon: StopCircle,
    label: "停止",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  reconnecting: {
    icon: Loader2,
    label: "再接続中...",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    animate: true,
  },
};

export function SessionStatusBadge({
  status,
  teamName,
  className,
}: SessionStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
        config.bgColor,
        className
      )}
    >
      {teamName && (
        <>
          <span className="font-medium truncate max-w-[200px]">{teamName}</span>
          <span className="text-muted-foreground">•</span>
        </>
      )}
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "h-4 w-4",
            config.color,
            config.animate && "animate-spin"
          )}
        />
        <span className={config.color}>{config.label}</span>
      </div>
    </div>
  );
}
