// Chat components - 統合版StreamingMessageを再エクスポート
export { StreamingMessage } from "@/components/ui/StreamingMessage";
export type { ToolOptions } from "@/components/ui/StreamingMessage";

// 型定義（types.tsが削除されたため、ここで定義）
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  llmProvider?: string;
  thinking?: string;
  citations?: string[];
}

// 後方互換性のための型エイリアス
export type ChatMessageType = ChatMessage;
