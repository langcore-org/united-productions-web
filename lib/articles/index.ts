import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ARTICLES_DIR = path.join(process.cwd(), "content/articles");

export type ArticleType = "release" | "guide" | "update";

export type ArticleMeta = {
  title: string;
  slug: string;
  date: string;
  type: ArticleType;
  description: string;
  published: boolean;
};

export type Article = ArticleMeta & {
  content: string;
};

export function getAllArticles(): ArticleMeta[] {
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".md"));

  return files
    .map((filename) => {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, filename), "utf-8");
      const { data } = matter(raw);
      return data as ArticleMeta;
    })
    .filter((a) => a.published)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticleBySlug(slug: string): Article | null {
  const filepath = path.join(ARTICLES_DIR, `${slug}.md`);
  if (!fs.existsSync(filepath)) return null;

  const raw = fs.readFileSync(filepath, "utf-8");
  const { data, content } = matter(raw);
  const meta = data as ArticleMeta;

  if (!meta.published) return null;

  return { ...meta, content };
}

export function getAllSlugs(): string[] {
  return getAllArticles().map((a) => a.slug);
}
