import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/articles/MarkdownContent";
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
  release: "bg-blue-100 text-blue-700",
  guide: "bg-emerald-100 text-emerald-700",
  update: "bg-amber-100 text-amber-700",
};

const TYPE_ICON: Record<ArticleType, string> = {
  release: "🚀",
  guide: "📖",
  update: "✨",
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-white">
      {/* トップナビゲーション */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/80">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            ガイド一覧
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* ヘッダーカード */}
        <header className="mb-12">
          {/* タグと日付 */}
          <div className="flex items-center gap-3 mb-6">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${TYPE_COLOR[article.type]}`}
            >
              <span>{TYPE_ICON[article.type]}</span>
              {TYPE_LABEL[article.type]}
            </span>
            <time className="text-sm text-gray-500 font-medium">
              {new Date(article.date).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </div>

          {/* タイトル */}
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4 leading-tight">
            {article.title}
          </h1>

          {/* 説明文 */}
          <p className="text-xl text-gray-600 leading-relaxed">{article.description}</p>

          {/* 区切り線 */}
          <div className="mt-8 h-1 w-20 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" />
        </header>

        {/* 本文 */}
        <MarkdownContent content={article.content} />

        {/* フッターCTA */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="bg-gray-900 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-3">Teddyを使ってみましょう</h2>
            <p className="text-gray-400 mb-6">制作業務をAIで効率化します</p>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 bg-white text-gray-900 text-sm font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              アプリを開く
            </Link>
          </div>
        </div>

        {/* 前へ戻る */}
        <div className="mt-8 text-center">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            ガイド一覧に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
