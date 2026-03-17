"use client";

import { Menu } from "lucide-react";

interface MobileChatHeaderProps {
  onOpenSidebar: () => void;
}

export function MobileChatHeader({ onOpenSidebar }: MobileChatHeaderProps) {
  return (
    <header className="md:hidden flex items-center h-12 px-3 border-b border-[#e5e5e5] bg-white/90 backdrop-blur-sm">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="メニューを開く"
        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      <div className="ml-2 text-sm font-medium text-gray-800 truncate">Teddy</div>
    </header>
  );
}

export default MobileChatHeader;
