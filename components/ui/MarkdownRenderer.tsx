"use client";

import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // コードブロック
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const [copied, setCopied] = useState(false);

            const handleCopy = async () => {
              const code = String(children).replace(/\n$/, "");
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            };

            if (!inline && language) {
              return (
                <div className="my-4 rounded-lg overflow-hidden bg-[#1e1e1e] border border-[#2a2a35] group">
                  <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d30] border-b border-[#3e3e42]">
                    <span className="text-xs text-gray-400 font-mono">
                      {language.toUpperCase()}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-[#3e3e42] transition-all"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-400">コピー済み</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>コピー</span>
                        </>
                      )}
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={language}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      padding: "1rem",
                      background: "transparent",
                      fontSize: "0.875rem",
                      lineHeight: "1.5",
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                </div>
              );
            }

            // インラインコード
            return (
              <code
                className={cn(
                  "px-1.5 py-0.5 rounded text-sm font-mono",
                  "bg-[#2a2a35] text-[#ff6b00]",
                  "border border-[#3a3a45]"
                )}
                {...props}
              >
                {children}
              </code>
            );
          },

          // 見出し
          h1({ children }) {
            return (
              <h1 className="text-2xl font-bold text-white mt-6 mb-4 pb-2 border-b border-[#2a2a35]">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-xl font-bold text-white mt-5 mb-3 pb-1 border-b border-[#2a2a35]/50">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-lg font-semibold text-gray-200 mt-4 mb-2">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-base font-semibold text-gray-300 mt-3 mb-2">
                {children}
              </h4>
            );
          },

          // 段落
          p({ children }) {
            return (
              <p className="text-gray-200 leading-relaxed mb-3 last:mb-0">
                {children}
              </p>
            );
          },

          // リスト
          ul({ children }) {
            return (
              <ul className="list-disc list-inside space-y-1 mb-3 text-gray-200 ml-1">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal list-inside space-y-1 mb-3 text-gray-200 ml-1">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },

          // テーブル
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead className="bg-[#2a2a35] text-gray-100">
                {children}
              </thead>
            );
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 text-left font-semibold border border-[#3a3a45]">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-2 border border-[#3a3a45] text-gray-200">
                {children}
              </td>
            );
          },

          // 引用
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-[#ff6b00] pl-4 py-1 my-3 bg-[#2a2a35]/30 rounded-r italic text-gray-300">
                {children}
              </blockquote>
            );
          },

          // リンク
          a({ children, href }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#ff6b00] hover:underline hover:text-[#ff8533] transition-colors"
              >
                {children}
              </a>
            );
          },

          // 水平線
          hr() {
            return (
              <hr className="my-6 border-t border-[#2a2a35]" />
            );
          },

          // 強調
          strong({ children }) {
            return <strong className="font-bold text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-gray-300">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
