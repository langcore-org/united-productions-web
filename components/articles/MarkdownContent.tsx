"use client";

import { Check, Copy, Link2 } from "lucide-react";
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
    <div className="relative group my-6 rounded-xl overflow-hidden bg-gray-900 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono uppercase">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
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
  level: number;
  children: React.ReactNode;
  id?: string;
}) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const sizes: Record<number, string> = {
    1: "text-3xl mt-12 mb-6",
    2: "text-2xl mt-10 mb-5 pb-2 border-b border-gray-100",
    3: "text-xl mt-8 mb-4",
    4: "text-lg mt-6 mb-3",
  };
  const sizeClass = sizes[level] || "text-base";

  return (
    <Tag
      id={id}
      className={`group flex items-center gap-3 font-bold tracking-tight text-gray-900 ${sizeClass}`}
    >
      <span>{children}</span>
      {id && (
        <a
          href={`#${id}`}
          className="opacity-0 group-hover:opacity-100 transition-all text-gray-300 hover:text-gray-500 p-1 rounded hover:bg-gray-100"
          aria-label="リンクをコピー"
        >
          <Link2 className="w-4 h-4" />
        </a>
      )}
    </Tag>
  );
}

const components = {
  code({
    inline,
    className,
    children,
  }: {
    inline?: boolean;
    className?: string;
    children: React.ReactNode;
  }) {
    const match = /language-(\w+)/.exec(className || "");
    const content = String(children).replace(/\n$/, "");

    if (!inline && match) {
      return <CodeBlock className={className}>{content}</CodeBlock>;
    }

    return (
      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200">
        {children}
      </code>
    );
  },
  h1: ({ children }: { children: React.ReactNode }) => {
    const id = String(children)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
    return (
      <Heading level={1} id={id}>
        {children}
      </Heading>
    );
  },
  h2: ({ children }: { children: React.ReactNode }) => {
    const id = String(children)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
    return (
      <Heading level={2} id={id}>
        {children}
      </Heading>
    );
  },
  h3: ({ children }: { children: React.ReactNode }) => {
    const id = String(children)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
    return (
      <Heading level={3} id={id}>
        {children}
      </Heading>
    );
  },
  h4: ({ children }: { children: React.ReactNode }) => {
    const id = String(children)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
    return (
      <Heading level={4} id={id}>
        {children}
      </Heading>
    );
  },
  table: ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-x-auto my-6 rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-gray-50">{children}</thead>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <th className="font-semibold text-gray-700 px-4 py-3 text-left border-b border-gray-200">
      {children}
    </th>
  ),
  td: ({ children }: { children: React.ReactNode }) => (
    <td className="px-4 py-3 text-gray-700 border-b border-gray-100 last:border-b-0">{children}</td>
  ),
  tr: ({ children }: { children: React.ReactNode }) => (
    <tr className="hover:bg-gray-50/50 transition-colors">{children}</tr>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="my-4 space-y-2 list-disc list-inside text-gray-700 marker:text-gray-400">
      {children}
    </ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="my-4 space-y-2 list-decimal list-inside text-gray-700 marker:text-gray-400">
      {children}
    </ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="my-6 pl-4 border-l-4 border-gray-300 italic text-gray-600 bg-gray-50 py-3 pr-4 rounded-r-lg">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-gray-200" />,
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a
      href={href}
      className="text-blue-600 font-medium hover:underline decoration-2 underline-offset-2"
    >
      {children}
    </a>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="my-4 text-gray-700 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-bold text-gray-900">{children}</strong>
  ),
};

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <article className="prose prose-gray max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
