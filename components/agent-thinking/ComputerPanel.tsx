/**
 * ComputerPanel コンポーネント
 * 
 * 右側の検索結果表示パネル
 * 
 * @updated 2026-02-20 23:50
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Search,
  ExternalLink,
  Monitor,
  ChevronRight,
  Globe,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import type { SearchResultItem, SubStep } from "@/types/agent-thinking";

// 結果タイプに応じたアイコン
const resultTypeIcons = {
  web: Globe,
  document: FileText,
  image: ImageIcon,
};

export interface SearchResultCardProps {
  result: SearchResultItem;
  /** クリック時のコールバック */
  onClick?: (result: SearchResultItem) => void;
  /** 追加クラス */
  className?: string;
}

/**
 * 検索結果カード
 */
export function SearchResultCard({
  result,
  onClick,
  className,
}: SearchResultCardProps) {
  const handleClick = () => {
    if (result.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    }
    onClick?.(result);
  };

  // ドメイン抽出
  const domain = result.url
    ? new URL(result.url).hostname.replace(/^www\./, "")
    : result.source || "Unknown";

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group p-3 rounded-lg border cursor-pointer",
        "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50",
        "transition-all duration-200",
        className
      )}
    >
      {/* ヘッダー：ファビコン + ドメイン */}
      <div className="flex items-center gap-2 mb-2">
        {result.favicon ? (
          <img
            src={result.favicon}
            alt=""
            className="w-4 h-4 rounded"
            onError={(e) => {
              // ファビコン読み込み失敗時はグローブアイコン
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Globe className="w-4 h-4 text-gray-400" />
        )}
        <span className="text-xs text-gray-500 truncate">{domain}</span>
      </div>

      {/* タイトル */}
      <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
        {result.title}
      </h4>

      {/* 説明 */}
      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
        {result.description}
      </p>

      {/* 外部リンクインジケーター */}
      <div className="flex items-center gap-1 mt-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-3 h-3" />
        <span className="text-xs">新しいタブで開く</span>
      </div>
    </div>
  );
}

export interface ComputerPanelProps {
  /** 表示状態 */
  isOpen: boolean;
  /** 閉じるコールバック */
  onClose: () => void;
  /** 現在アクティブなサブステップ */
  activeSubStep?: SubStep | null;
  /** 検索結果一覧 */
  searchResults: SearchResultItem[];
  /** 検索クエリ */
  searchQuery?: string;
  /** 追加クラス */
  className?: string;
}

/**
 * Computerパネル
 * 
 * 検索結果を表示するサイドパネル
 */
export function ComputerPanel({
  isOpen,
  onClose,
  activeSubStep,
  searchResults,
  searchQuery,
  className,
}: ComputerPanelProps) {
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const hasResults = searchResults.length > 0;

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-50",
        "w-full sm:w-[400px] md:w-[450px]",
        "bg-white border-l border-gray-200 shadow-xl",
        "flex flex-col",
        className
      )}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Computer</h2>
            <p className="text-xs text-gray-500">
              {activeSubStep?.type === "search" ? "検索結果" : "ツール実行"}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* アクティブなサブステップ情報 */}
      {activeSubStep && (
        <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center gap-2 text-xs text-blue-700 mb-1">
            <Search className="w-3 h-3" />
            <span>実行中の検索</span>
          </div>
          <p className="text-sm text-gray-900 font-medium truncate">
            {activeSubStep.searchQuery || activeSubStep.label}
          </p>
        </div>
      )}

      {/* 検索クエリ表示 */}
      {searchQuery && (
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Search className="w-3 h-3" />
            <span className="truncate">{searchQuery}</span>
          </div>
        </div>
      )}

      {/* 検索結果リスト */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasResults ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Search className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">検索結果がありません</p>
            <p className="text-xs text-gray-400 mt-1">
              検索が実行されると結果がここに表示されます
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {searchResults.map((result) => (
              <SearchResultCard
                key={result.id}
                result={result}
                onClick={() => setSelectedResultId(result.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* フッター */}
      {hasResults && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {searchResults.length}件の結果
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Computerパネルトグルボタン
 */
export interface ComputerPanelToggleProps {
  /** 表示状態 */
  isOpen: boolean;
  /** クリック時のコールバック */
  onClick: () => void;
  /** 未読の検索結果数 */
  unreadCount?: number;
  /** 追加クラス */
  className?: string;
}

export function ComputerPanelToggle({
  isOpen,
  onClick,
  unreadCount = 0,
  className,
}: ComputerPanelToggleProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed right-4 bottom-4 z-40",
        "flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-gray-900 text-white shadow-lg hover:bg-gray-800",
        "transition-all duration-200",
        isOpen && "opacity-0 pointer-events-none",
        className
      )}
    >
      <Monitor className="w-4 h-4" />
      <span className="text-sm font-medium">Computer</span>
      {unreadCount > 0 && (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-xs font-medium">
          {unreadCount}
        </span>
      )}
    </button>
  );
}

/**
 * モバイル用オーバーレイ
 */
export interface ComputerPanelOverlayProps {
  /** 表示状態 */
  isOpen: boolean;
  /** 閉じるコールバック */
  onClose: () => void;
}

export function ComputerPanelOverlay({
  isOpen,
  onClose,
}: ComputerPanelOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 sm:hidden"
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

export default ComputerPanel;
