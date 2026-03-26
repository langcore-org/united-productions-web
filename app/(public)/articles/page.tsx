import type { Metadata } from "next";
import Link from "next/link";
import { type ArticleType, getAllArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "記事一覧 - Teddy",
  description: "Teddyのリリース情報・利用ガイド",
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

export default function ArticlesPage() {
  const articles = getAllArticles();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <header className="mb-12">
          <Link
            href="/auth/signin"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8 inline-block"
          >
            ← アプリに戻る
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">お知らせ</h1>
          <p className="text-gray-500">リリース情報・利用ガイド</p>
        </header>

        {articles.length === 0 ? (
          <p className="text-gray-400">記事はまだありません。</p>
        ) : (
          <ul className="space-y-px border border-gray-200 rounded-2xl overflow-hidden">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/articles/${article.slug}`}
                  className="flex flex-col gap-2 px-6 py-5 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLOR[article.type]}`}
                    >
                      {TYPE_LABEL[article.type]}
                    </span>
                    <time className="text-xs text-gray-400">{article.date}</time>
                  </div>
                  <p className="font-medium text-gray-900">{article.title}</p>
                  <p className="text-sm text-gray-500 line-clamp-2">{article.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
