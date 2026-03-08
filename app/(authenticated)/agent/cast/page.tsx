import { ChatPage } from "@/components/chat/ChatPage";

export const metadata = {
  title: "出演者リサーチ - Teddy",
};

export default function AgentCastPage() {
  return <ChatPage featureId="research-cast" />;
}
