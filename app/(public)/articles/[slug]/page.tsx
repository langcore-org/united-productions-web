import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type ArticleType, getAllSlugs, getArticleBySlug } from "@/lib/articles";

type Props = {
  params: Promise<{ slug: string }>;
};

const TYPE_LABEL: Record<ArticleType, string> = {
  release: "リリース",
  guide: "ガイド",
  update: "アップデート",
};

const TYPE_COLOR: Record<ArticleType, string> = {
  release: "bg-blue-50 text-blue-700",
  guide: "bg-green-50 text-green-700",
  update: "bg-orange-50 text-orange-700",
};

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: `${article.title} - Teddy`,
    description: article.description,
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* パンくず */}
        <nav className="mb-10">
          <Link
            href="/articles"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← ガイド一覧
          </Link>
        </nav>

        {/* ヘッダー */}
        <header className="mb-10 pb-8 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLOR[article.type]}`}
            >
              {TYPE_LABEL[article.type]}
            </span>
            <time className="text-xs text-gray-400">{article.date}</time>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-3">
            {article.title}
          </h1>
          <p className="text-gray-500">{article.description}</p>
        </header>

        {/* 本文 */}
        <article
          className="prose prose-gray max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-gray-900
          prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
          prose-p:text-gray-700 prose-p:leading-relaxed
          prose-strong:text-gray-900 prose-strong:font-semibold
          prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-xl
          prose-table:text-sm
          prose-th:bg-gray-50 prose-th:font-semibold prose-th:text-gray-700
          prose-td:text-gray-700
          prose-blockquote:border-l-gray-300 prose-blockquote:text-gray-500
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        "
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
        </article>

        {/* CTA */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors"
          >
            アプリを開く
          </Link>
        </div>
      </div>
    </div>
  );
}
