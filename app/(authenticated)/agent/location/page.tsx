import { ChatPage } from "@/components/chat/ChatPage";

export const metadata = {
  title: "場所リサーチ - Teddy",
};

export default function AgentLocationPage() {
  return <ChatPage featureId="research-location" />;
}
