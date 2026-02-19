import { ChatPage } from "@/components/chat/ChatPage";

export const metadata = {
  title: "チャット - ADコパイロット",
};

/**
 * 通常チャットページ
 * 
 * 汎用的なチャット機能を提供
 */
export default function GeneralChatPage() {
  return <ChatPage featureId="general-chat" />;
}
