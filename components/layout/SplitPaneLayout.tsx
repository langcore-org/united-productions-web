"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SplitPaneLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultRatio?: number; // 左パネルの割合 (0-100)
  minLeftWidth?: number; // 最小幅 (px)
  minRightWidth?: number; // 最小幅 (px)
}

export function SplitPaneLayout({
  leftPanel,
  rightPanel,
  defaultRatio = 50,
  minLeftWidth = 300,
  minRightWidth = 300,
}: SplitPaneLayoutProps) {
  const [ratio, setRatio] = useState(defaultRatio);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newRatio = (x / rect.width) * 100;

      // 最小幅の制約
      const containerWidth = rect.width;
      const minLeftRatio = (minLeftWidth / containerWidth) * 100;
      const minRightRatio = (minRightWidth / containerWidth) * 100;

      if (newRatio >= minLeftRatio && newRatio <= 100 - minRightRatio) {
        setRatio(newRatio);
      }
    },
    [isDragging, minLeftWidth, minRightWidth]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden"
    >
      {/* Left Panel */}
      <div
        className="h-full overflow-hidden"
        style={{ width: `${ratio}%` }}
      >
        {leftPanel}
      </div>

      {/* Resizer */}
      <div
        className={cn(
          "w-1 bg-white/10 hover:bg-[#ff6b00]/50 cursor-col-resize transition-colors relative",
          isDragging && "bg-[#ff6b00]"
        )}
        onMouseDown={handleMouseDown}
      >
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-4 h-8 rounded-full bg-[#2a2a35] border border-white/10",
            "flex items-center justify-center",
            "hover:border-[#ff6b00]/50 transition-colors"
          )}
        >
          <div className="flex gap-0.5">
            <div className="w-0.5 h-3 bg-white/30 rounded-full" />
            <div className="w-0.5 h-3 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div
        className="h-full overflow-hidden flex-1"
        style={{ width: `${100 - ratio}%` }}
      >
        {rightPanel}
      </div>
    </div>
  );
}
