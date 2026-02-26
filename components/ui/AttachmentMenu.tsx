"use client";

import {
  ChevronRight,
  Cloud,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  History,
  MoreHorizontal,
  Palette,
  Paperclip,
  Pencil,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AttachmentMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (action: string) => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  hasSubmenu?: boolean;
  submenuItems?: SubMenuItem[];
}

interface SubMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  timestamp?: string;
}

const menuItems: MenuItem[] = [
  {
    id: "upload-file",
    label: "ファイルをアップロード",
    icon: <Paperclip className="w-5 h-5" />,
    description: "ローカルファイルから選択",
  },
  {
    id: "add-text",
    label: "テキストコンテンツを追加",
    icon: <FileText className="w-5 h-5" />,
    description: "テキストファイルを追加",
  },
  {
    id: "draw-sketch",
    label: "スケッチを描く",
    icon: <Pencil className="w-5 h-5" />,
    description: "手書きスケッチを作成",
  },
  {
    id: "google-drive",
    label: "Googleドライブから追加",
    icon: <Palette className="w-5 h-5" />,
    description: "Googleドライブに接続",
  },
  {
    id: "onedrive",
    label: "Microsoft OneDriveに接続",
    icon: <Cloud className="w-5 h-5" />,
    description: "OneDriveに接続",
  },
  {
    id: "recent",
    label: "最近の",
    icon: <History className="w-5 h-5" />,
    hasSubmenu: true,
    submenuItems: [
      {
        id: "recent-1",
        label: "document.pdf",
        icon: <FileText className="w-4 h-4" />,
        timestamp: "2分前",
      },
      {
        id: "recent-2",
        label: "image.png",
        icon: <FileImage className="w-4 h-4" />,
        timestamp: "1時間前",
      },
      {
        id: "recent-3",
        label: "data.csv",
        icon: <FileSpreadsheet className="w-4 h-4" />,
        timestamp: "昨日",
      },
      {
        id: "recent-4",
        label: "script.js",
        icon: <FileCode className="w-4 h-4" />,
        timestamp: "2日前",
      },
    ],
  },
];

export function AttachmentMenu({ isOpen, onClose, onSelect, triggerRef }: AttachmentMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // トリガー要素の位置に基づいてメニュー位置を計算
  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [isOpen, triggerRef]);

  // 外部クリックで閉じる
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      const target = event.target as Node;

      // メニュー自体またはトリガーボタンのクリックは無視
      if (menuRef.current?.contains(target) || triggerRef?.current?.contains(target)) {
        return;
      }

      onClose();
      setActiveSubmenu(null);
    },
    [onClose, triggerRef],
  );

  // Escapeキーで閉じる
  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        setActiveSubmenu(null);
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, handleClickOutside, handleEscapeKey]);

  // メニューが閉じたときにサブメニューもリセット
  useEffect(() => {
    if (!isOpen) {
      setActiveSubmenu(null);
    }
  }, [isOpen]);

  const handleItemClick = (itemId: string, hasSubmenu?: boolean) => {
    if (hasSubmenu) {
      setActiveSubmenu(activeSubmenu === itemId ? null : itemId);
    } else {
      onSelect(itemId);
      onClose();
      setActiveSubmenu(null);
    }
  };

  const handleSubmenuItemClick = (subItemId: string) => {
    onSelect(subItemId);
    onClose();
    setActiveSubmenu(null);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-50 min-w-[280px] max-w-[320px]",
        "bg-white rounded-xl",
        "shadow-[0_4px_20px_rgba(0,0,0,0.15)]",
        "border border-gray-200",
        "animate-in fade-in zoom-in-95 duration-150",
        "origin-top-left",
      )}
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
      }}
    >
      {/* メニューヘッダー */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">アタッチメント</p>
        <p className="text-xs text-gray-500 mt-0.5">ファイルやコンテンツを追加</p>
      </div>

      {/* メニュー項目リスト */}
      <div className="p-2">
        {menuItems.map((item, index) => (
          <div key={item.id}>
            {/* 区切り線（特定の項目の後） */}
            {index === 3 && <div className="my-2 border-t border-gray-100" />}

            {/* メニュー項目 */}
            <button
              type="button"
              onClick={() => handleItemClick(item.id, item.hasSubmenu)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
                "text-left transition-all duration-150",
                "hover:bg-gray-100 focus:bg-gray-100",
                "focus:outline-none focus:ring-2 focus:ring-gray-200",
                activeSubmenu === item.id && "bg-gray-100",
              )}
            >
              {/* アイコン */}
              <div
                className={cn(
                  "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                  "bg-gray-50 text-gray-600",
                  "group-hover:bg-gray-100",
                )}
              >
                {item.icon}
              </div>

              {/* テキストコンテンツ */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
                {item.description && (
                  <p className="text-xs text-gray-500 truncate">{item.description}</p>
                )}
              </div>

              {/* サブメニュー矢印 */}
              {item.hasSubmenu && (
                <ChevronRight
                  className={cn(
                    "w-4 h-4 text-gray-400 transition-transform duration-200",
                    activeSubmenu === item.id && "rotate-90",
                  )}
                />
              )}
            </button>

            {/* サブメニュー */}
            {item.hasSubmenu && activeSubmenu === item.id && item.submenuItems && (
              <div
                className={cn(
                  "mt-1 ml-4 pl-4 border-l-2 border-gray-100",
                  "animate-in slide-in-from-top-1 duration-150",
                )}
              >
                {item.submenuItems.map((subItem) => (
                  <button
                    type="button"
                    key={subItem.id}
                    onClick={() => handleSubmenuItemClick(subItem.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg",
                      "text-left transition-all duration-150",
                      "hover:bg-gray-100 focus:bg-gray-100",
                      "focus:outline-none",
                    )}
                  >
                    <div className="flex-shrink-0 text-gray-500">{subItem.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{subItem.label}</p>
                    </div>
                    {subItem.timestamp && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {subItem.timestamp}
                      </span>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onSelect("recent-more")}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg",
                    "text-left transition-all duration-150",
                    "hover:bg-gray-100 focus:bg-gray-100",
                    "focus:outline-none text-gray-500",
                  )}
                >
                  <MoreHorizontal className="w-4 h-4" />
                  <span className="text-sm">もっと見る</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* メニューフッター */}
      <div className="px-4 py-2.5 bg-gray-50 rounded-b-xl border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          サポート形式: PDF, PNG, JPG, TXT, MD, CSV
        </p>
      </div>
    </div>
  );
}

export default AttachmentMenu;
