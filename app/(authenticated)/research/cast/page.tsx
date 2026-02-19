import { FeatureChat } from "@/components/ui/FeatureChat";
import { RESEARCH_CAST_SYSTEM_PROMPT } from "@/lib/prompts/research-cast";

export const metadata = {
  title: "出演者リサーチ - ADコパイロット",
};

export default function ResearchCastPage() {
  return (
    <FeatureChat
      featureId="research-cast"
      title="出演者リサーチ"
      systemPrompt={RESEARCH_CAST_SYSTEM_PROMPT}
      placeholder="企画内容・テーマを入力してください"
      outputFormat="markdown"
    />
  );
}
