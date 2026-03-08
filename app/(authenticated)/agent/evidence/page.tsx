import { ChatPage } from "@/components/chat/ChatPage";

export const metadata = {
  title: "エビデンスリサーチ - Teddy",
};

export default function AgentEvidencePage() {
  return <ChatPage featureId="research-evidence" />;
}
