import { FeatureChat } from "@/components/ui/FeatureChat";
import { TRANSCRIPT_SYSTEM_PROMPT } from "@/lib/prompts/transcript";

export const metadata = {
  title: "NA原稿作成 - ADコパイロット",
};

export default function NaScriptPage() {
  return (
    <FeatureChat
      featureId="na-script"
      title="NA原稿作成"
      systemPrompt={TRANSCRIPT_SYSTEM_PROMPT}
      placeholder="動画の文字起こしテキストを貼り付けてください。「整形して」や「NA原稿にして」など指示してください"
      inputLabel="文字起こし入力"
      outputFormat="plaintext"
    />
  );
}
