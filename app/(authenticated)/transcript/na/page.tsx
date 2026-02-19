import { FeatureChat } from "@/components/ui/FeatureChat";
import { NA_SCRIPT_SYSTEM_PROMPT } from "@/lib/prompts/na-script";

export const metadata = {
  title: "NA原稿作成 - ADコパイロット",
};

export default function TranscriptNaPage() {
  return (
    <FeatureChat
      featureId="transcript-na"
      title="NA原稿作成"
      systemPrompt={NA_SCRIPT_SYSTEM_PROMPT}
      placeholder="文字起こしテキストを貼り付けてください"
      inputLabel="文字起こし入力"
      outputFormat="plaintext"
    />
  );
}
