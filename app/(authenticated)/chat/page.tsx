import { FeatureChat } from "@/components/ui/FeatureChat";
import { GENERAL_CHAT_SYSTEM_PROMPT } from "@/lib/prompts/general-chat";

export const metadata = {
  title: "チャット - ADコパイロット",
};

export default function ChatPage() {
  return (
    <FeatureChat
      featureId="general-chat"
      title="チャット"
      systemPrompt={GENERAL_CHAT_SYSTEM_PROMPT}
      placeholder="何か質問や相談があれば、お気軽にどうぞ"
      outputFormat="markdown"
    />
  );
}
