"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks with syntax highlighting
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !className?.includes("block");

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="relative group">
                {match && (
                  <div className="absolute right-2 top-2 text-xs text-muted-foreground opacity-50">
                    {match[1]}
                  </div>
                )}
                <pre className="overflow-x-auto p-4 bg-muted rounded-lg">
                  <code className={cn("text-sm font-mono", className)} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          // Tables with proper styling
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full divide-y divide-border">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-muted">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-3 py-2 text-left text-sm font-semibold">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-3 py-2 text-sm border-t border-border">
                {children}
              </td>
            );
          },
          // Links open in new tab
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            );
          },
          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                {children}
              </blockquote>
            );
          },
          // Lists
          ul({ children }) {
            return <ul className="list-disc pl-6 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-6 space-y-1">{children}</ol>;
          },
          // Headings
          h1({ children }) {
            return <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mt-5 mb-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>;
          },
          // Horizontal rule
          hr() {
            return <hr className="my-4 border-border" />;
          },
          // Paragraphs
          p({ children }) {
            return <p className="my-2 leading-relaxed">{children}</p>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
