"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface StreamingMarkdownProps {
  content: string;
  className?: string;
}

/**
 * ストリーミング中専用の軽量Markdownレンダラー。
 * - コードブロックのシンタックスハイライトやコピーUIは省略
 * - レイアウトは通常のMarkdownRendererと近づける
 */
export function StreamingMarkdown({ content, className }: StreamingMarkdownProps) {
  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ children }) {
            return (
              <code
                className={cn(
                  "px-1.5 py-0.5 rounded text-sm font-mono",
                  "bg-gray-100 text-amber-700",
                  "border border-gray-200",
                )}
              >
                {children}
              </code>
            );
          },
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
          p({ children }) {
            return (
              <p className="text-gray-700 leading-relaxed mb-3 last:mb-0 [&:is(li_*)]:mb-0 [&:is(li_*)]:inline">
                {children}
              </p>
            );
          },
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
          li({ children }) {
            return <li className="leading-relaxed pl-1">{children}</li>;
          },
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
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-amber-700 pl-4 py-1 my-3 bg-gray-50 rounded-r italic text-gray-600">
                {children}
              </blockquote>
            );
          },
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
          hr() {
            return <hr className="my-6 border-t border-gray-200" />;
          },
          strong({ children }) {
            return <strong className="font-bold text-gray-900">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-gray-600">{children}</em>;
          },
          br() {
            return <br />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default StreamingMarkdown;
