import { FeatureChat } from "@/components/ui/FeatureChat";
import { RESEARCH_LOCATION_SYSTEM_PROMPT } from "@/lib/prompts/research-location";

export const metadata = {
  title: "場所リサーチ - ADコパイロット",
};

export default function ResearchLocationPage() {
  return (
    <FeatureChat
      featureId="research-location"
      title="場所リサーチ"
      systemPrompt={RESEARCH_LOCATION_SYSTEM_PROMPT}
      placeholder="企画内容・テーマを入力してください"
      outputFormat="markdown"
    />
  );
}
