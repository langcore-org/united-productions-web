import { FeatureChat } from "@/components/ui/FeatureChat";
import { RESEARCH_INFO_SYSTEM_PROMPT } from "@/lib/prompts/research-info";

export const metadata = {
  title: "情報リサーチ - ADコパイロット",
};

export default function ResearchInfoPage() {
  return (
    <FeatureChat
      featureId="research-info"
      title="情報リサーチ"
      systemPrompt={RESEARCH_INFO_SYSTEM_PROMPT}
      placeholder="リサーチしたいテーマを入力してください"
      outputFormat="markdown"
    />
  );
}
