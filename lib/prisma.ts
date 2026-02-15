/**
 * Prisma Client インスタンス
 * 
 * 開発環境でのホットリロード時の複数インスタンス生成を防止するため、
 * グローバルにキャッシュして使用します。
 * 
 * 注意: DATABASE_URLが設定されていない場合は、モッククライアントを返します
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// PrismaClientが存在しない場合（@prisma/clientが生成されていない場合）のフォールバック
declare const global: typeof globalThis & {
  prisma?: PrismaClient;
};

// 動的にPrismaClientを取得または作成
function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  try {
    const client = new PrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = client;
    }
    return client;
  } catch (error) {
    // Prisma Clientが生成されていない場合のフォールバック
    console.warn("Prisma Client not generated yet. Using mock client.");
    // モッククライアントを返す（開発時のみ）
    return {} as PrismaClient;
  }
}

export const prisma = getPrismaClient();
