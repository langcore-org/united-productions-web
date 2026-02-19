import { FeatureChat } from "@/components/ui/FeatureChat";
import { getProposalSystemPrompt } from "@/lib/prompts/proposal";

export const metadata = {
  title: "新企画立案 - ADコパイロット",
};

// サーバーサイドでプロンプトを生成（デフォルト値使用）
const defaultPrompt = getProposalSystemPrompt("", "");

export default function ProposalPage() {
  return (
    <FeatureChat
      featureId="proposal"
      title="新企画立案"
      systemPrompt={defaultPrompt}
      placeholder="企画の方向性・テーマ・条件を入力してください（例：感動系、20代向け、ロケ企画）"
      outputFormat="markdown"
    />
  );
}
