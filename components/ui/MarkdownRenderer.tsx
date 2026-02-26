"use client";

import { Check, Copy } from "lucide-react";
import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

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
          // biome-ignore lint/suspicious/noExplicitAny: ReactMarkdown componentsの型定義
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            // biome-ignore lint/correctness/useHookAtTopLevel: ReactMarkdown components内で使用
            const [copied, setCopied] = useState(false);

            const handleCopy = async () => {
              const code = String(children).replace(/\n$/, "");
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            };

            if (!inline && language) {
              return (
                <div className="my-4 rounded-lg overflow-hidden bg-gray-900 border border-gray-700 group">
                  <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d30] border-b border-[#3e3e42]">
                    <span className="text-xs text-gray-400 font-mono">
                      {language.toUpperCase()}
                    </span>
                    <button
                      type="button"
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
                  "bg-gray-100 text-amber-700",
                  "border border-gray-600",
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
              <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4 pb-2 border-b border-gray-200">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-xl font-bold text-gray-900 mt-5 mb-3 pb-1 border-b border-gray-200/50">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="text-base font-semibold text-gray-700 mt-3 mb-2">{children}</h4>;
          },

          // 段落 - リスト内の段落はマージンを削除
          p({ children }) {
            return (
              <p className="text-gray-700 leading-relaxed mb-3 last:mb-0 [&:is(li_*)]:mb-0 [&:is(li_*)]:inline">
                {children}
              </p>
            );
          },

          // リスト - list-outsideを使用してより自然な表示に
          ul({ children }) {
            return (
              <ul className="list-disc list-outside space-y-1.5 mb-3 text-gray-700 pl-5">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal list-outside space-y-1.5 mb-3 text-gray-700 pl-5">
                {children}
              </ol>
            );
          },
          li({ children, node }) {
            // 子要素が段落の場合はインライン表示にする
            const hasParagraph = node?.children?.some(
              // biome-ignore lint/suspicious/noExplicitAny: ReactMarkdown node型
              (child: any) => child.type === "element" && child.tagName === "p",
            );

            if (hasParagraph) {
              return (
                <li className="leading-relaxed pl-1">
                  <span className="text-gray-700">{children}</span>
                </li>
              );
            }

            return <li className="leading-relaxed pl-1">{children}</li>;
          },

          // テーブル
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-gray-100 text-gray-800">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 text-left font-semibold border border-gray-200">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="px-4 py-2 border border-gray-200 text-gray-700">{children}</td>;
          },

          // 引用
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-amber-700 pl-4 py-1 my-3 bg-gray-50 rounded-r italic text-gray-600">
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
                className="text-amber-700 hover:underline hover:text-orange-700 transition-colors"
              >
                {children}
              </a>
            );
          },

          // 水平線
          hr() {
            return <hr className="my-6 border-t border-gray-200" />;
          },

          // 強調
          strong({ children }) {
            return <strong className="font-bold text-gray-900">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-gray-600">{children}</em>;
          },

          // 改行
          br() {
            return <br />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
