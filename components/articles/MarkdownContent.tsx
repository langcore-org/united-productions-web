"use client";

import type { Components } from "react-markdown";
import { Check, Copy, Link2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark.css";

// コードブロックコンポーネント
function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") || "text";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6 rounded-xl overflow-hidden bg-[#0d1117] shadow-lg border border-gray-800">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <span className="ml-3 text-xs text-gray-500 font-mono uppercase">{language}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-gray-800"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed text-gray-300">
        <code>{children}</code>
      </pre>
    </div>
  );
}

// 見出しコンポーネント
function Heading({
  level,
  children,
  id,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  id?: string;
}) {
  const sizes: Record<number, { class: string; icon: string }> = {
    1: { class: "text-3xl mt-8 mb-6", icon: "w-5 h-5" },
    2: { class: "text-2xl mt-10 mb-5 pb-3 border-b border-gray-200", icon: "w-4 h-4" },
    3: { class: "text-xl mt-8 mb-4 text-gray-800", icon: "w-4 h-4" },
    4: { class: "text-lg mt-6 mb-3 text-gray-800", icon: "w-3.5 h-3.5" },
    5: { class: "text-base mt-5 mb-2 text-gray-800", icon: "w-3.5 h-3.5" },
    6: { class: "text-sm mt-4 mb-2 text-gray-800", icon: "w-3 h-3" },
  };
  const config = sizes[level] || { class: "text-base", icon: "w-4 h-4" };

  const HeadingTag = `h${level}` as const;

  return (
    <HeadingTag
      id={id}
      className={`group flex items-center gap-2 font-bold tracking-tight text-gray-900 scroll-mt-24 ${config.class}`}
    >
      <span>{children}</span>
      {id && (
        <a
          href={`#${id}`}
          className="opacity-0 group-hover:opacity-100 transition-all text-gray-400 hover:text-blue-500 p-1 rounded"
          aria-label="アンカーリンク"
          onClick={(e) => {
            e.preventDefault();
            navigator.clipboard.writeText(
              `${window.location.origin}${window.location.pathname}#${id}`,
            );
          }}
        >
          <Link2 className={config.icon} />
        </a>
      )}
    </HeadingTag>
  );
}

// ID生成ヘルパー
const makeId = (children: ReactNode) =>
  String(children)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-\u3000-\u9fff]/g, "");

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}

const components: Components = {
  code({ inline, className, children }: CodeProps) {
    const match = /language-(\w+)/.exec(className || "");
    const content = String(children).replace(/\n$/, "");

    if (!inline && match) {
      return <CodeBlock className={className}>{content}</CodeBlock>;
    }

    return (
      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded-md text-sm font-mono border border-gray-200">
        {children}
      </code>
    );
  },

  h1: ({ children }) => <Heading level={1} id={makeId(children)}>{children}</Heading>,
  h2: ({ children }) => <Heading level={2} id={makeId(children)}>{children}</Heading>,
  h3: ({ children }) => <Heading level={3} id={makeId(children)}>{children}</Heading>,
  h4: ({ children }) => <Heading level={4} id={makeId(children)}>{children}</Heading>,

  table: ({ children }) => (
    <div className="overflow-x-auto my-8 rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),

  thead: ({ children }) => <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>,

  th: ({ children }) => (
    <th className="font-semibold text-gray-700 px-4 py-3.5 text-left">{children}</th>
  ),

  td: ({ children }) => (
    <td className="px-4 py-3.5 text-gray-700 border-b border-gray-100 last:border-b-0">{children}</td>
  ),

  tr: ({ children }) => (
    <tr className="border-b border-gray-100 last:border-b-0 even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
      {children}
    </tr>
  ),

  tbody: ({ children }) => <tbody className="bg-white">{children}</tbody>,

  ul: ({ children }) => (
    <ul className="my-5 space-y-2 text-gray-700 list-disc pl-5 marker:text-gray-400">{children}</ul>
  ),

  ol: ({ children }) => (
    <ol className="my-5 space-y-2 text-gray-700 list-decimal pl-5 marker:text-gray-500">{children}</ol>
  ),

  li: ({ children }) => <li className="leading-7 pl-1">{children}</li>,

  blockquote: ({ children }) => (
    <blockquote className="my-6 pl-5 border-l-4 border-blue-400 bg-blue-50/50 py-4 pr-4 rounded-r-lg">
      <div className="text-gray-700 italic">{children}</div>
    </blockquote>
  ),

  hr: () => (
    <div className="my-10 flex items-center gap-4">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      <span className="text-gray-400 text-xs">•</span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
    </div>
  ),

  a: ({ href, children }) => {
    const isExternal = href?.startsWith("http");
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="text-blue-600 font-medium hover:underline decoration-2 underline-offset-2 hover:text-blue-700 transition-colors"
      >
        {children}
        {isExternal && <span className="text-xs ml-0.5">↗</span>}
      </a>
    );
  },

  p: ({ children }) => <p className="my-4 text-gray-700 leading-7">{children}</p>,

  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,

  em: ({ children }) => <em className="italic text-gray-800">{children}</em>,

  del: ({ children }) => <del className="line-through text-gray-500">{children}</del>,

  img: ({ src, alt }) => (
    <figure className="my-8">
      <img src={src} alt={alt} className="w-full rounded-xl border border-gray-200 shadow-sm" />
      {alt && <figcaption className="mt-2 text-center text-sm text-gray-500">{alt}</figcaption>}
    </figure>
  ),
};

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <article className="prose prose-gray max-w-none prose-a:no-underline">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
