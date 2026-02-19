import { FeatureChat } from "@/components/ui/FeatureChat";
import { RESEARCH_EVIDENCE_SYSTEM_PROMPT } from "@/lib/prompts/research-evidence";

export const metadata = {
  title: "エビデンスリサーチ - ADコパイロット",
};

export default function ResearchEvidencePage() {
  return (
    <FeatureChat
      featureId="research-evidence"
      title="エビデンスリサーチ"
      systemPrompt={RESEARCH_EVIDENCE_SYSTEM_PROMPT}
      placeholder="検証したい情報・主張を入力してください"
      outputFormat="markdown"
    />
  );
}
