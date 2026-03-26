import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ArticleType, getAllSlugs, getArticleBySlug } from "@/lib/articles";
import { MarkdownContent } from "@/components/articles/MarkdownContent";

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
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* パンくず */}
        <nav className="mb-10">
          <Link
            href="/articles"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1"
          >
            ← ガイド一覧
          </Link>
        </nav>

        {/* ヘッダー */}
        <header className="mb-12 pb-8 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_COLOR[article.type]}`}>
              {TYPE_LABEL[article.type]}
            </span>
            <time className="text-xs text-gray-400">{article.date}</time>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-3 leading-tight">
            {article.title}
          </h1>
          <p className="text-gray-500 text-lg">{article.description}</p>
        </header>

        {/* 本文 */}
        <MarkdownContent content={article.content} />

        {/* CTA */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors shadow-sm"
          >
            アプリを開く
          </Link>
        </div>
      </div>
    </div>
  );
}
