/**
 * 引用URLリストコンポーネント
 * Web検索結果の引用URLを折りたたみ式で表示
 */

import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";

export interface Citation {
  url: string;
  title: string;
}

interface CitationsListProps {
  citations: Citation[];
}

/**
 * URLを短縮表示する（長すぎる場合は省略）
 */
function formatUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url;
  // 先頭30文字 + ... + 末尾10文字
  return `${url.slice(0, 30)}...${url.slice(-10)}`;
}

/**
 * 表示テキストを取得（titleが無効な場合はURLを使用）
 */
function getDisplayText(citation: Citation): string {
  // titleが存在し、数字だけでなく、かつ空でない場合はtitleを使用
  if (citation.title && citation.title.trim() && !/^\d+$/.test(citation.title.trim())) {
    return citation.title;
  }
  // それ以外はURLを短縮して表示
  return formatUrl(citation.url);
}

export function CitationsList({ citations }: CitationsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 mb-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        <span>引用 ({citations.length}件)</span>
      </button>

      {isExpanded && (
        <div className="mt-2 pl-2 border-l-2 border-gray-200">
          <ul className="space-y-1.5">
            {citations.map((citation, index) => (
              <li key={`${citation.url}-${index}`} className="flex items-start gap-1.5">
                <span className="text-xs text-gray-400 mt-0.5">{index + 1}.</span>
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 break-all"
                  title={citation.url}
                >
                  {getDisplayText(citation)}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
