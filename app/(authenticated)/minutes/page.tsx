import { ChatPage } from "@/components/chat/ChatPage";

export const metadata = {
  title: "議事録作成 - ADコパイロット",
};

export default function MinutesPage() {
  return <ChatPage featureId="minutes" />;
}
