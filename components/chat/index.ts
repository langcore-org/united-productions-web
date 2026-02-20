// Chat components - 統合版StreamingMessageを再エクスポート
export { StreamingMessage } from "@/components/ui/StreamingMessage";
export type { ToolOptions } from "@/components/ui/StreamingMessage";

// 型定義
export * from "./types";

// 後方互換性のための型エイリアス
export type ChatMessageType = import("./types").ChatMessage;
