import { FeatureChat } from "@/components/ui/FeatureChat";
import { MINUTES_SYSTEM_PROMPT } from "@/lib/prompts/minutes";

export const metadata = {
  title: "議事録作成 - ADコパイロット",
};

export default function MinutesPage() {
  return (
    <FeatureChat
      featureId="minutes"
      title="議事録作成"
      systemPrompt={MINUTES_SYSTEM_PROMPT}
      placeholder="文字起こしテキストを貼り付けてください"
      inputLabel="文字起こし入力"
      outputFormat="markdown"
    />
  );
}
