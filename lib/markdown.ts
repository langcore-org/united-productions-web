/**
 * Markdown変換ユーティリティ
 *
 * MarkdownテキストをHTMLに変換する共通関数
 */

/**
 * MarkdownをHTMLに変換
 * @param markdown - Markdownテキスト
 * @returns HTML文字列
 */
export function markdownToHtml(markdown: string): string {
  return (
    markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-black mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-black mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-black mt-8 mb-4">$1</h1>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="bg-gray-100 px-1 rounded">$1</strong>')
      // List items
      .replace(
        /^- (.*$)/gim,
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
      )
      // Line breaks
      .replace(/\n/g, "<br />")
  );
}

/**
 * Markdownからプレーンテキストを抽出
 * @param markdown - Markdownテキスト
 * @returns プレーンテキスト
 */
export function markdownToPlainText(markdown: string): string {
  return (
    markdown
      // Remove headers
      .replace(/^#+\s*/gm, "")
      // Remove bold/italic
      .replace(/\*\*|__/g, "")
      // Remove links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      // Remove list markers
      .replace(/^[-*+]\s*/gm, "")
      // Remove checkboxes
      .replace(/\[[ x]\]\s*/gi, "")
      // Trim whitespace
      .trim()
  );
}

/**
 * 文字数をカウント（Markdown記法を除く）
 * @param markdown - Markdownテキスト
 * @returns 文字数
 */
export function countMarkdownText(markdown: string): number {
  const plainText = markdownToPlainText(markdown);
  // 空白と改行を除いた文字数
  return plainText.replace(/\s/g, "").length;
}

/**
 * Markdownを指定文字数で切り詰める
 * @param markdown - Markdownテキスト
 * @param maxLength - 最大文字数
 * @returns 切り詰められたテキスト
 */
export function truncateMarkdown(markdown: string, maxLength: number): string {
  const plainText = markdownToPlainText(markdown);

  if (plainText.length <= maxLength) {
    return markdown;
  }

  return `${plainText.substring(0, maxLength)}...`;
}
