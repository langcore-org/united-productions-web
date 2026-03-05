/**
 * チャットナビゲーション関数
 *
 * URL構築とナビゲーションアイテムの生成を一元化
 */

import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  FileText,
  Lightbulb,
  MessageSquare,
  Shield,
  Users,
} from "lucide-react";
import type { ChatFeatureId } from "./chat-config";
import { chatFeatureConfigs } from "./chat-config";

/** Lucideアイコン型 */
type LucideIcon = ComponentType<LucideProps>;

// アイコン名からコンポーネントへのマッピング
const iconMap: Record<string, LucideIcon> = {
  MessageSquare,
  Users,
  Shield,
  FileText,
  Lightbulb,
};

interface NavigateToChatOptions {
  /** 機能ID（指定なしは一般チャット） */
  featureId?: ChatFeatureId;
  /** 初期メッセージ（トップページからの入力など） */
  message?: string;
  /** 番組ID（番組選択をスキップ） */
  programId?: string;
  /** 既存チャットID（履歴から開く場合） */
  chatId?: string;
  /** 新規チャットとして開始 */
  isNew?: boolean;
}

/** ナビゲーションアイテム */
export interface NavigationItem {
  id: ChatFeatureId;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

/**
 * チャットページのURLを構築
 */
export function buildChatUrl(options: NavigateToChatOptions = {}): string {
  const params = new URLSearchParams();

  // 新規チャットフラグ
  if (options.isNew) {
    params.set("new", "1");
  }

  // 機能指定（一般チャット以外）
  if (options.featureId && options.featureId !== "general-chat") {
    params.set("agent", options.featureId);
  }

  // 初期メッセージ
  if (options.message?.trim()) {
    params.set("message", options.message.trim());
  }

  // 番組指定
  if (options.programId) {
    params.set("program", options.programId);
  }

  // 既存チャット
  if (options.chatId) {
    params.set("chatId", options.chatId);
  }

  const queryString = params.toString();
  return queryString ? `/chat?${queryString}` : "/chat";
}

/**
 * Next.js router用のナビゲーション関数
 */
export function navigateToChat(
  router: { push: (url: string) => void },
  options: NavigateToChatOptions,
): void {
  router.push(buildChatUrl(options));
}

/**
 * 機能別の新規チャットURLを取得
 */
export function getNewChatUrl(featureId: ChatFeatureId, programId?: string): string {
  return buildChatUrl({ featureId, programId, isNew: true });
}

/**
 * 機能別の初期メッセージ付きチャットURLを取得
 */
export function getChatUrlWithMessage(
  message: string,
  featureId?: ChatFeatureId,
): string {
  return buildChatUrl({ featureId, message, isNew: true });
}

/**
 * サイドバー・トップページ用のナビゲーションアイテムを生成
 */
export function getChatNavigationItems(): NavigationItem[] {
  return (Object.keys(chatFeatureConfigs) as ChatFeatureId[]).map((featureId) => {
    const config = chatFeatureConfigs[featureId];
    const IconComponent = iconMap[config.icon || ""] || MessageSquare;

    return {
      id: featureId,
      label: config.title,
      description: config.description || "",
      icon: IconComponent,
      href: buildChatUrl({ featureId, isNew: true }),
    };
  });
}

/**
 * 特定の機能のナビゲーションアイテムを取得
 */
export function getChatNavigationItem(featureId: ChatFeatureId): NavigationItem {
  const config = chatFeatureConfigs[featureId];
  const IconComponent = iconMap[config.icon || ""] || MessageSquare;

  return {
    id: featureId,
    label: config.title,
    description: config.description || "",
    icon: IconComponent,
    href: buildChatUrl({ featureId, isNew: true }),
  };
}
