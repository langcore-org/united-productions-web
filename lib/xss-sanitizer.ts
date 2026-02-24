/**
 * XSSサニタイザー
 *
 * LLM出力などのユーザー入力を安全なHTMLに変換するユーティリティ
 * DOMPurifyを使用してXSS攻撃を防止
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * MarkdownをHTMLに変換してサニタイズ
 * @param text - Markdownテキスト
 * @returns 安全なHTML
 */
export function sanitizeAndFormatMarkdown(text: string): string {
  // MarkdownをHTMLに変換
  const html = text
    // Headers
    .replace(/### (.*)/g, '<h3 class="text-lg font-bold text-black mt-6 mb-3">$1</h3>')
    .replace(/## (.*)/g, '<h2 class="text-xl font-bold text-black mt-8 mb-4">$1</h2>')
    .replace(/# (.*)/g, '<h1 class="text-2xl font-bold text-black mt-8 mb-4">$1</h1>')
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="bg-gray-100 px-1 rounded">$1</strong>')
    // List items
    .replace(
      /^- (.*)/gm,
      '<li class="ml-4 text-gray-700 flex items-start gap-2"><span class="text-gray-400 mt-1.5">•</span><span>$1</span></li>',
    )
    // Checkboxes
    .replace(
      /\[ \] (.*)/g,
      '<div class="flex items-center gap-2 my-1"><span class="w-4 h-4 border-2 border-gray-300 rounded flex items-center justify-center"></span><span class="text-gray-700">$1</span></div>',
    )
    .replace(
      /\[x\] (.*)/g,
      '<div class="flex items-center gap-2 my-1"><span class="w-4 h-4 bg-green-500 rounded flex items-center justify-center text-white text-xs">✓</span><span class="line-through text-gray-400">$1</span></div>',
    );

  // DOMPurifyでサニタイズ
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["h1", "h2", "h3", "strong", "li", "span", "div", "br"],
    ALLOWED_ATTR: ["class"],
  });
}

/**
 * プレーンテキストをサニタイズ
 * @param text - 入力テキスト
 * @returns 安全なテキスト（HTMLタグ除去）
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * URLをサニタイズ
 * @param url - URL文字列
 * @returns 安全なURLまたは空文字列
 */
export function sanitizeUrl(url: string): string {
  const sanitized = DOMPurify.sanitize(url, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // javascript: プロトコルなどをブロック
  if (/^(javascript|data|vbscript):/i.test(sanitized)) {
    return "";
  }

  return sanitized;
}
