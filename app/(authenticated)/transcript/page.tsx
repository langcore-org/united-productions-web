import { FeatureChat } from "@/components/ui/FeatureChat";
import { TRANSCRIPT_SYSTEM_PROMPT } from "@/lib/prompts/transcript";

export const metadata = {
  title: "文字起こしフォーマット変換 - ADコパイロット",
};

export default function TranscriptPage() {
  return (
    <FeatureChat
      featureId="transcript"
      title="文字起こしフォーマット変換"
      systemPrompt={TRANSCRIPT_SYSTEM_PROMPT}
      placeholder="動画の文字起こしテキストを貼り付けてください"
      inputLabel="文字起こし入力"
      outputFormat="markdown"
    />
  );
}
