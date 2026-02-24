/**
 * プロンプトバージョン管理
 *
 * @created 2026-02-24 18:05
 */

import type { SystemPromptVersion } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * 最新のプロンプトを取得
 */
export async function getLatestPrompt(key: string): Promise<{
  content: string;
  version: number;
  id: string;
} | null> {
  const latest = await prisma.systemPromptVersion.findFirst({
    where: { prompt: { key } },
    orderBy: { version: "desc" },
  });

  if (!latest) return null;

  return {
    content: latest.content,
    version: latest.version,
    id: latest.id,
  };
}

/**
 * 新しいバージョンを作成
 */
export async function createPromptVersion(
  key: string,
  data: {
    content: string;
    changeNote?: string;
    changedBy?: string;
  },
): Promise<SystemPromptVersion> {
  // プロンプトを取得または作成
  const prompt = await prisma.systemPrompt.findUnique({
    where: { key },
  });

  if (!prompt) {
    throw new Error(`Prompt with key "${key}" not found`);
  }

  // 最新バージョンを取得
  const latestVersion = await prisma.systemPromptVersion.findFirst({
    where: { promptId: prompt.id },
    orderBy: { version: "desc" },
  });

  const newVersion = (latestVersion?.version ?? 0) + 1;

  // 新しいバージョンを作成
  const version = await prisma.systemPromptVersion.create({
    data: {
      promptId: prompt.id,
      version: newVersion,
      content: data.content,
      changedBy: data.changedBy,
      changeNote: data.changeNote,
    },
  });

  // SystemPromptのメタデータを更新
  await prisma.systemPrompt.update({
    where: { id: prompt.id },
    data: {
      currentVersion: newVersion,
      updatedAt: new Date(),
    },
  });

  return version;
}

/**
 * バージョン履歴を取得
 */
export async function getPromptVersions(
  key: string,
  options?: {
    limit?: number;
    offset?: number;
  },
): Promise<
  Array<{
    version: number;
    changeNote: string | null;
    changedBy: string | null;
    createdAt: Date;
  }>
> {
  const prompt = await prisma.systemPrompt.findUnique({
    where: { key },
  });

  if (!prompt) {
    throw new Error(`Prompt with key "${key}" not found`);
  }

  const versions = await prisma.systemPromptVersion.findMany({
    where: { promptId: prompt.id },
    orderBy: { version: "desc" },
    take: options?.limit,
    skip: options?.offset,
    select: {
      version: true,
      changeNote: true,
      changedBy: true,
      createdAt: true,
    },
  });

  return versions;
}

/**
 * 特定のバージョンを取得
 */
export async function getPromptVersion(
  key: string,
  version: number,
): Promise<SystemPromptVersion | null> {
  const prompt = await prisma.systemPrompt.findUnique({
    where: { key },
  });

  if (!prompt) {
    throw new Error(`Prompt with key "${key}" not found`);
  }

  return prisma.systemPromptVersion.findFirst({
    where: {
      promptId: prompt.id,
      version,
    },
  });
}

/**
 * ロールバック（過去のバージョンを新しいバージョンとして複製）
 */
export async function rollbackPrompt(
  key: string,
  targetVersion: number,
  options?: {
    changeNote?: string;
    changedBy?: string;
  },
): Promise<SystemPromptVersion> {
  // 対象バージョンを取得
  const target = await getPromptVersion(key, targetVersion);

  if (!target) {
    throw new Error(`Version ${targetVersion} not found for prompt "${key}"`);
  }

  // 新しいバージョンとして作成
  return createPromptVersion(key, {
    content: target.content,
    changeNote: options?.changeNote || `ロールバック: バージョン${targetVersion}に戻す`,
    changedBy: options?.changedBy,
  });
}
