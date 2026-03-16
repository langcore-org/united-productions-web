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

export function SearchResultsCard({ citations, searchQuery }: SearchResultsCardProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* 検索クエリ表示 */}
      {searchQuery && (
        <div className="text-xs text-blue-800/70 font-medium mb-2">検索クエリ: {searchQuery}</div>
      )}

      {/* 検索結果カード一覧 */}
      <div className="space-y-3">
        {citations.map((citation, index) => {
          const domain = getDomain(citation.url);
          const faviconUrl = getFaviconUrl(citation.url);
          const displayTitle = getDisplayTitle(citation.url);

          return (
            <a
              key={`${citation.url}-${index}`}
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/50 hover:bg-white/80 transition-colors border border-blue-200/50 hover:border-blue-300">
                {/* ファビコン */}
                <div className="flex-shrink-0 w-6 h-6 mt-0.5">
                  {faviconUrl ? (
                    <img
                      src={faviconUrl}
                      alt=""
                      className="w-6 h-6 rounded"
                      onError={(e) => {
                        // ファビコン取得失敗時は非表示
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded bg-gray-200" />
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  {/* タイトル（ドメイン名で代替） */}
                  <div className="text-sm font-medium text-blue-900 group-hover:text-blue-700 truncate">
                    {displayTitle}
                  </div>

                  {/* ドメイン名 */}
                  <div className="flex items-center gap-1 text-xs text-blue-600/70 mt-0.5">
                    <span className="truncate">{domain}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* 注記：スニペットはAPIから取得できないため非表示 */}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default SearchResultsCard;
