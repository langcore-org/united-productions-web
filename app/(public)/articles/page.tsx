import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { type ArticleType, getAllArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "ガイド - Teddy",
  description: "Teddyの使い方・活用ガイド",
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

export default function ArticlesPage() {
  const articles = getAllArticles();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-white">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
          >
            ← アプリに戻る
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">
            ガイド
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl">
            Teddyの使い方・活用ガイド
          </p>
        </div>
      </div>

      {/* 記事一覧 */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {articles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">記事はまだありません。</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="group block bg-white rounded-2xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* タグと日付 */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLOR[article.type]}`}>
                        <span>{TYPE_ICON[article.type]}</span>
                        {TYPE_LABEL[article.type]}
                      </span>
                      <time className="text-xs text-gray-500">
                        {new Date(article.date).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>

                    {/* タイトル */}
                    <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h2>

                    {/* 説明 */}
                    <p className="text-gray-600 line-clamp-2 leading-relaxed">
                      {article.description}
                    </p>
                  </div>

                  {/* アイコン */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* フッター */}
        <div className="mt-12 text-center">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
          >
            アプリを開く
          </Link>
        </div>
      </div>
    </div>
  );
}
