'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
  basePath?: string; // Base path for resolving relative image paths
}

export function MarkdownPreview({ content, basePath }: MarkdownPreviewProps) {
  // Resolve relative image paths to API paths
  const resolveImagePath = (src: string) => {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/api/')) {
      return src;
    }

    // If basePath is provided, resolve relative paths
    if (basePath) {
      // Get the directory part of basePath
      const baseDir = basePath.split('/').slice(0, -1).join('/');
      const fullPath = src.startsWith('/') ? src.slice(1) : `${baseDir}/${src}`;
      return `/api/files/${encodeURIComponent(fullPath)}?raw=true`;
    }

    // Default: assume it's a path in data/files
    return `/api/files/${encodeURIComponent(src)}?raw=true`;
  };

  return (
    <div className="markdown-preview prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom link renderer with target="_blank" for external links
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-blue-600 dark:text-blue-400 hover:underline"
                {...props}
              >
                {children}
                {isExternal && (
                  <span className="inline-block ml-1 text-xs opacity-60">↗</span>
                )}
              </a>
            );
          },
          // Custom image renderer with resolved paths
          img: ({ src, alt, ...props }) => {
            const srcString = typeof src === 'string' ? src : '';
            const resolvedSrc = srcString ? resolveImagePath(srcString) : '';
            return (
              <span className="block my-4">
                <img
                  src={resolvedSrc}
                  alt={alt || 'Image'}
                  className="max-w-full h-auto rounded-lg shadow-md"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    // Show error placeholder
                    const placeholder = document.createElement('div');
                    placeholder.className = 'text-gray-500 text-sm italic p-4 bg-gray-100 dark:bg-gray-800 rounded';
                    placeholder.textContent = `Image not found: ${alt || src}`;
                    target.parentNode?.appendChild(placeholder);
                  }}
                  {...props}
                />
                {alt && (
                  <span className="block text-center text-sm text-gray-500 mt-2 italic">
                    {alt}
                  </span>
                )}
              </span>
            );
          },
          // Custom code block styling
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={`${className} block overflow-x-auto`} {...props}>
                {children}
              </code>
            );
          },
          // Custom pre block styling
          pre: ({ children, ...props }) => (
            <pre
              className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm"
              {...props}
            >
              {children}
            </pre>
          ),
          // Custom table styling
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table
                className="min-w-full border-collapse border border-gray-300 dark:border-gray-600"
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left font-semibold"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="border border-gray-300 dark:border-gray-600 px-4 py-2"
              {...props}
            >
              {children}
            </td>
          ),
          // Custom blockquote styling
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 italic"
              {...props}
            >
              {children}
            </blockquote>
          ),
          // Custom heading styling with IDs for anchor links
          h1: ({ children, ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b dark:border-gray-700" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-xl font-bold mt-5 mb-3" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2" {...props}>
              {children}
            </h3>
          ),
          // Custom list styling
          ul: ({ children, ...props }) => (
            <ul className="list-disc pl-6 my-2 space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-6 my-2 space-y-1" {...props}>
              {children}
            </ol>
          ),
          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-gray-300 dark:border-gray-600" />
          ),
          // Checkbox for task lists (GFM)
          input: ({ type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-2 rounded"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
