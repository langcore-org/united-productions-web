/**
 * Prisma Client インスタンス
 *
 * 開発環境でのホットリロード時の複数インスタンス生成を防止するため、
 * グローバルにキャッシュして使用します。
 *
 * 推奨: DATABASE_URLに接続プールパラメータを追加
 *   postgresql://user:pass@host/db?connection_limit=5&pool_timeout=10
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 接続プール設定付きのPrismaClient作成
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
  return client;
}

// PrismaClientが存在しない場合（@prisma/clientが生成されていない場合）のフォールバック
function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  try {
    const client = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = client;
    }
    return client;
  } catch (error) {
    console.error("Prisma Client initialization failed:", error);
    throw new Error("Prisma Clientの初期化に失敗しました。DATABASE_URLを確認してください。");
  }
}

export const prisma = getPrismaClient();
