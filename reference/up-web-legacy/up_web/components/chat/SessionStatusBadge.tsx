"use client";

import { cn } from "@/lib/utils";
import { Loader2, Circle, CheckCircle2, XCircle, StopCircle, RefreshCw } from "lucide-react";
import type { SessionStatus } from "@/lib/agent/types";

interface SessionStatusBadgeProps {
  status: SessionStatus;
  teamName?: string;
  className?: string;
  bufferedCount?: number;
  onStop?: () => void;
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
  bufferedCount,
  onStop,
}: SessionStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isRunning = status === "running";
  const isReconnecting = status === "reconnecting";
  const showBuffered = bufferedCount !== undefined && bufferedCount > 0 && isReconnecting;

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

        {/* Show buffered events count during reconnection */}
        {showBuffered && (
          <span className="ml-1 px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 rounded text-xs font-medium">
            {bufferedCount} 件
          </span>
        )}

        {/* ESC hint when running */}
        {isRunning && onStop && (
          <button
            onClick={onStop}
            className="ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-xs font-mono text-muted-foreground transition-colors"
            title="ESCキーまたはクリックで停止"
          >
            ESC
          </button>
        )}
      </div>
    </div>
  );
}
