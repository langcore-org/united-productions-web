/**
 * 検索結果カードコンポーネント
 *
 * 画像のような検索結果表示を部分的に実現
 * - ファビコン付きドメイン表示
 * - タイトルはドメイン名で代替（APIがページタイトルを返さないため）
 * - スニペット/日付は非表示（APIから取得不可）
 *
 * @created 2026-03-16
 */

import { ExternalLink } from "lucide-react";

import type { CitationInfo } from "@/hooks/useLLMStream/types";

interface SearchResultsCardProps {
  citations: CitationInfo[];
  searchQuery?: string;
}

/**
 * URLからドメイン名を抽出
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * ファビコンURLを生成（Google Favicon API使用）
 */
export function getFaviconUrl(url: string): string {
  try {
    const domain = getDomain(url);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "";
  }
}

/**
 * 表示用タイトルを生成
 * APIはページタイトルを返さないため、ドメインを表示
 */
export function getDisplayTitle(url: string): string {
  const domain = getDomain(url);
  // ドメインの先頭を大文字に（見た目の調整）
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

export function SearchResultsCard({
  citations,
  searchQuery: _searchQuery,
}: SearchResultsCardProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="max-h-48 overflow-y-auto pr-1 space-y-0.5">
      {/* 検索結果リンク一覧（1行表示） */}
      {citations.map((citation, index) => {
        const domain = getDomain(citation.url);
        const faviconUrl = getFaviconUrl(citation.url);

        return (
          <a
            key={`${citation.url}-${index}`}
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-blue-100/50 transition-colors group text-xs"
          >
            {/* ファビコン（小さめ） */}
            <div className="flex-shrink-0 w-3.5 h-3.5">
              {faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-3.5 h-3.5 rounded-sm bg-gray-200" />
              )}
            </div>

            {/* ドメイン名（1行） */}
            <span className="flex-1 min-w-0 truncate text-blue-800">{domain}</span>

            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
          </a>
        );
      })}
    </div>
  );
}

export default SearchResultsCard;
