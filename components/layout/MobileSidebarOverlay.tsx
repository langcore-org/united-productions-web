"use client";

import { cn } from "@/lib/utils";

interface MobileSidebarOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function MobileSidebarOverlay({ open, onOpenChange, children }: MobileSidebarOverlayProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        "transition-opacity duration-300 ease-in-out",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="サイドバーを閉じる"
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-300 ease-in-out",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Panel */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-full max-w-full",
          "bg-[#f9f9f9]",
          "shadow-xl",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default MobileSidebarOverlay;
