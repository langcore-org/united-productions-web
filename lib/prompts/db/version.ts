/**
 * プロンプトバージョン管理
 * 
 * @created 2026-02-22 12:10
 */

import { prisma } from "@/lib/prisma";
import { SystemPrompt, SystemPromptVersion } from "@prisma/client";
import { PromptWithVersions } from "./types";

/**
 * プロンプトを更新（バージョン自動採番）
 * @param key - プロンプトキー
 * @param content - 新しいプロンプト内容
 * @param changedBy - 変更者ID（オプション）
 * @param changeNote - 変更理由メモ（オプション）
 * @returns 更新されたプロンプト
 */
export async function updatePromptWithVersion(
  key: string,
  content: string,
  changedBy?: string,
  changeNote?: string
): Promise<SystemPrompt> {
  return await prisma.$transaction(async (tx) => {
    const current = await tx.systemPrompt.findUnique({
      where: { key },
    });

    if (!current) {
      throw new Error(`Prompt not found: ${key}`);
    }

    const newVersion = current.currentVersion + 1;

    await tx.systemPromptVersion.create({
      data: {
        promptId: current.id,
        version: newVersion,
        content,
        changedBy: changedBy || null,
        changeNote: changeNote || null,
      },
    });

    const updated = await tx.systemPrompt.update({
      where: { key },
      data: {
        content,
        currentVersion: newVersion,
        changedBy: changedBy || null,
        changeNote: changeNote || null,
        updatedAt: new Date(),
      },
    });

    return updated;
  });
}

/**
 * プロンプトのバージョン履歴を取得
 * @param key - プロンプトキー
 * @returns バージョン履歴一覧
 */
export async function getPromptVersionHistory(
  key: string
): Promise<SystemPromptVersion[]> {
  const prompt = await prisma.systemPrompt.findUnique({
    where: { key },
    include: {
      versions: {
        orderBy: { version: "desc" },
      },
    },
  });

  if (!prompt) {
    throw new Error(`Prompt not found: ${key}`);
  }

  return prompt.versions;
}

/**
 * 特定バージョンのプロンプト内容を取得
 * @param key - プロンプトキー
 * @param version - バージョン番号
 * @returns バージョン情報
 */
export async function getPromptVersion(
  key: string,
  version: number
): Promise<SystemPromptVersion | null> {
  const prompt = await prisma.systemPrompt.findUnique({
    where: { key },
  });

  if (!prompt) {
    return null;
  }

  return await prisma.systemPromptVersion.findFirst({
    where: {
      promptId: prompt.id,
      version,
    },
  });
}

/**
 * 指定バージョンに復元（新バージョンとして記録）
 * @param key - プロンプトキー
 * @param version - 復元元バージョン番号
 * @param changedBy - 変更者ID（オプション）
 * @param changeNote - 変更理由メモ（オプション）
 * @returns 更新されたプロンプト
 */
export async function restorePromptVersion(
  key: string,
  version: number,
  changedBy?: string,
  changeNote?: string
): Promise<SystemPrompt> {
  return await prisma.$transaction(async (tx) => {
    const current = await tx.systemPrompt.findUnique({
      where: { key },
    });

    if (!current) {
      throw new Error(`Prompt not found: ${key}`);
    }

    const targetVersion = await tx.systemPromptVersion.findFirst({
      where: {
        promptId: current.id,
        version,
      },
    });

    if (!targetVersion) {
      throw new Error(`Version ${version} not found for prompt: ${key}`);
    }

    const newVersion = current.currentVersion + 1;
    const restoreNote = changeNote 
      ? `${changeNote}（バージョン${version}から復元）`
      : `バージョン${version}から復元`;

    await tx.systemPromptVersion.create({
      data: {
        promptId: current.id,
        version: newVersion,
        content: targetVersion.content,
        changedBy: changedBy || null,
        changeNote: restoreNote,
      },
    });

    const updated = await tx.systemPrompt.update({
      where: { key },
      data: {
        content: targetVersion.content,
        currentVersion: newVersion,
        changedBy: changedBy || null,
        changeNote: restoreNote,
        updatedAt: new Date(),
      },
    });

    return updated;
  });
}

/**
 * プロンプト詳細を取得（バージョン履歴付き）
 * @param key - プロンプトキー
 * @returns プロンプト詳細
 */
export async function getPromptWithHistory(
  key: string
): Promise<PromptWithVersions | null> {
  return await prisma.systemPrompt.findUnique({
    where: { key },
    include: {
      versions: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          promptId: true,
          version: true,
          content: true,
          changedBy: true,
          changeNote: true,
          createdAt: true,
        },
      },
    },
  });
}
