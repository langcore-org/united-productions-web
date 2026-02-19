"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_PROVIDER } from "@/lib/llm/config";
import type { LLMProvider } from "@/lib/llm/types";
import { FeatureCard } from "@/components/ui/FeatureCard";
import {
  Mic,
  Sparkles,
  Copy,
  RotateCcw,
  Check,
  FileText,
  Users,
  Scissors,
  AlignLeft,
  Square,
  Loader2,
  Zap,
  AlertCircle,
} from "lucide-react";

type ProcessingStatus = "idle" | "streaming" | "completed" | "error";

// デフォルトプロバイダーは lib/llm/config.ts の DEFAULT_PROVIDER を使用

// 話者カラーマッピング
const SPEAKER_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  "櫻井": {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/20",
  },
  "末澤": {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/20",
  },
  "N": {
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/30",
    glow: "shadow-purple-500/20",
  },
  "ナレーション": {
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/30",
    glow: "shadow-purple-500/20",
  },
  "その他": {
    bg: "bg-gray-500/15",
    text: "text-gray-500",
    border: "border-gray-500/30",
    glow: "shadow-gray-500/20",
  },
};

const getSpeakerColor = (speaker: string) => {
  return SPEAKER_COLORS[speaker] || {
    bg: "bg-[#ff6b00]/15",
    text: "text-[#ff6b00]",
    border: "border-[#ff6b00]/30",
    glow: "shadow-[#ff6b00]/20",
  };
};

export default function TranscriptsPage() {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleProcess = useCallback(async () => {
    if (!transcript.trim()) return;

    setStatus("streaming");
    setError(null);
    setResult("");

    // AbortControllerの設定
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/llm/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `あなたはテレビ制作のNA（ナレーション）原稿作成の専門家です。
Premiere Proの書き起こしテキストを、放送用のNA原稿形式に整形してください。

## 整形ルール

1. **話者判定**
   - 「Speaker 1」「Speaker 2」などを、文脈から推測して「櫻井」「末澤」「N」などに変換
   - 不明な場合は「Speaker X」のままにする

2. **ノイズ除去**
   - タイムコード（00:00:00形式）を削除
   - フィラー（えー、あの、うーんなど）を適切に処理
   - 重複した発言を削除
   - 「あの」「えーと」などのつなぎ言葉は必要に応じて削除

3. **文整形**
   - 句読点を適切に追加
   - 段落分けを整理（話題の切り替わりで改行）
   - 長文は適切に分割

4. **NA原稿形式**
   - **話者名**: 発言内容
   - ナレーションは **N**: で表記
   - 演出指示は【】で囲む

## 出力例

**N**: 今日のゲストは、俳優の山田太郎さんです。

**山田**: こんにちは。よろしくお願いします。

**N**: 【山田さんの代表作を映しながら】山田さんは昨年、話題のドラマ「サクセス」で主演を務めました。

**山田**: あの作品は本当に勉強になりました。共演者の方々にも恵まれて...`,
            },
            {
              role: "user",
              content: `以下のPremiere Pro書き起こしテキストをNA原稿形式に整形してください：\n\n${transcript}`,
            },
          ],
          provider: DEFAULT_PROVIDER,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data: ")) continue;

          const data = trimmedLine.slice(6);

          if (data === "[DONE]") {
            setStatus("completed");
            break;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.content) {
              fullContent += parsed.content;
              setResult(fullContent);
            }
          } catch {
            continue;
          }
        }
      }

      // 残りのバッファを処理
      if (buffer.trim()) {
        const trimmedLine = buffer.trim();
        if (trimmedLine.startsWith("data: ")) {
          const data = trimmedLine.slice(6);
          if (data !== "[DONE]") {
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setResult(fullContent);
              }
            } catch {
              // Ignore
            }
          }
        }
      }

      setStatus("completed");
      
      // 結果エリアにスクロール
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // ユーザーによるキャンセル
        setStatus("completed");
        return;
      }
      setError(err instanceof Error ? err.message : "不明なエラーが発生しました");
      setStatus("error");
    } finally {
      abortControllerRef.current = null;
    }
  }, [transcript]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("completed");
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setTranscript("");
    setResult("");
    setStatus("idle");
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // 結果をHTMLに変換（話者ラベルをバッジ風に）
  const formatResult = (text: string) => {
    return text
      .replace(/\*\*櫻井\*\*:/g, '<span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-sm font-semibold border border-blue-500/30 shadow-sm shadow-blue-500/10 mr-2">櫻井</span>')
      .replace(/\*\*末澤\*\*:/g, '<span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-semibold border border-emerald-500/30 shadow-sm shadow-emerald-500/10 mr-2">末澤</span>')
      .replace(/\*\*N\*\*:/g, '<span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-400 text-sm font-semibold border border-purple-500/30 shadow-sm shadow-purple-500/10 mr-2">N</span>')
      .replace(/\*\*ナレーション\*\*:/g, '<span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-400 text-sm font-semibold border border-purple-500/30 shadow-sm shadow-purple-500/10 mr-2">ナレーション</span>')
      .replace(/\*\*その他\*\*:/g, '<span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-500/15 text-gray-600 text-sm font-semibold border border-gray-500/30 shadow-sm shadow-gray-500/10 mr-2">その他</span>')
      .replace(/\*\*(.+?)\*\*:/g, '<span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#ff6b00]/15 text-[#ff6b00] text-sm font-semibold border border-[#ff6b00]/30 shadow-sm shadow-[#ff6b00]/10 mr-2">$1</span>')
      .replace(/### (.*)/g, '<h3 class="text-lg font-semibold text-white mt-6 mb-3">$1</h3>')
      .replace(/## (.*)/g, '<h2 class="text-xl font-semibold text-white mt-8 mb-4">$1</h2>')
      .replace(/# (.*)/g, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-900">$1</strong>')
      .replace(/- (.*)/g, '<li class="ml-4 text-gray-300">$1</li>')
      .replace(/【(.+?)】/g, '<span class="text-[#ff6b00] font-medium">【$1】</span>');
  };

  return (
    <div >
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b00]/20 to-[#ff8533]/10 flex items-center justify-center border border-[#ff6b00]/20">
                <Mic className="w-5 h-5 text-[#ff6b00]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">起こし・NA原稿</h1>
                <p className="text-sm text-gray-500">Premiere Pro書き起こしをAIで整形</p>
              </div>
            </div>

          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Speaker Labels Info - バッジ風に改善 */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-600 mb-4 uppercase tracking-wider">
            対応話者ラベル
          </h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "櫻井", desc: "櫻井翔", color: getSpeakerColor("櫻井") },
              { label: "末澤", desc: "末澤誠也", color: getSpeakerColor("末澤") },
              { label: "N", desc: "ナレーション", color: getSpeakerColor("N") },
              { label: "その他", desc: "その他出演者", color: getSpeakerColor("その他") },
            ].map((speaker) => (
              <div
                key={speaker.label}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <span className={cn(
                  "text-xs px-2.5 py-1 rounded-lg font-semibold border shadow-sm",
                  speaker.color.bg,
                  speaker.color.text,
                  speaker.color.border,
                  speaker.color.glow
                )}>
                  {speaker.label}
                </span>
                <span className="text-sm text-gray-500">{speaker.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Input Section - 角丸大きく、フォーカスアクセント強化 */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wider">
              Premiere Pro書き起こしテキスト
            </h2>
            {transcript && (
              <button
                onClick={() => setTranscript("")}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                クリア
              </button>
            )}
          </div>
          <div className="relative group">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={`ここにPremiere Proの書き起こしテキストを貼り付けてください...\n\n【入力例】\n00:00:05 Speaker 1: えー、今日はよろしくお願いします。\n00:00:08 Speaker 2: こちらこそ。\n00:00:10 Speaker 1: あの、初めてお会いした時のことなんですけど...\n\n※タイムコード、Speaker ID、フィラーなどは自動で整形されます。`}
              className={cn(
                "w-full h-[400px] p-5 rounded-2xl resize-none",
                "bg-white border-2 border-gray-200",
                "text-gray-800 placeholder-gray-400",
                "focus:outline-none focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/10",
                "transition-all duration-300 ease-out",
                "text-sm leading-relaxed"
              )}
            />
            {/* フォーカス時のグロー効果 */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#ff6b00]/0 via-[#ff6b00]/0 to-[#ff6b00]/0 group-focus-within:from-[#ff6b00]/5 group-focus-within:via-[#ff8533]/5 group-focus-within:to-[#ff6b00]/5 pointer-events-none transition-all duration-300" />
            <div className="absolute bottom-4 right-4 text-xs text-gray-600 bg-[#0d0d12]/80 px-2 py-1 rounded-md">
              {transcript.length.toLocaleString()} 文字
            </div>
          </div>
        </section>

        {/* Process Button */}
        <div className="flex justify-center mb-12">
          {status === "streaming" ? (
            <button
              onClick={handleCancel}
              className={cn(
                "flex items-center gap-3 px-8 py-4 rounded-xl font-medium transition-all duration-200",
                "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20"
              )}
            >
              <Square className="w-5 h-5" />
              生成を停止
            </button>
          ) : (
            <button
              onClick={handleProcess}
              disabled={!transcript.trim()}
              className={cn(
                "flex items-center gap-3 px-8 py-4 rounded-xl font-medium transition-all duration-200",
                !transcript.trim()
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                  : "bg-[#ff6b00] text-white hover:bg-[#ff8533] shadow-lg shadow-[#ff6b00]/20 hover:shadow-xl hover:shadow-[#ff6b00]/30 hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              <Sparkles className="w-5 h-5" />
              AIで整形する
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">エラーが発生しました</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Result Section - 話者ラベルの色分け強化 */}
        {(result || status === "streaming") && (
          <section ref={resultRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wider">
                  整形結果（NA原稿）
                </h2>
                {status === "streaming" && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6b00]/10 border border-[#ff6b00]/20 text-[#ff6b00] text-xs font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6b00] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6b00]"></span>
                    </span>
                    生成中...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!result}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                    copied
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-[#3a3a45] border border-transparent"
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      コピー
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-[#3a3a45] transition-all duration-200 border border-transparent"
                >
                  <RotateCcw className="w-4 h-4" />
                  新規作成
                </button>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
              <div className="prose prose-invert max-w-none p-6">
                <div
                  className="text-gray-800 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: formatResult(result),
                  }}
                />
                {status === "streaming" && (
                  <span className="inline-block w-0.5 h-5 bg-[#ff6b00] ml-1 animate-pulse" />
                )}
              </div>
            </div>
          </section>
        )}

        {/* Grok風ローディング表示 */}
        {status === "streaming" && !result && (
          <div className="mb-12 animate-in fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <div className="flex flex-col items-center justify-center gap-6">
                {/* アニメーションアイコン */}
                <div className="relative">
                  <div className="absolute inset-0 bg-[#ff6b00]/20 blur-xl rounded-full animate-pulse" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b00] to-[#ff8533] flex items-center justify-center shadow-lg shadow-[#ff6b00]/30">
                    <Zap className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
                
                {/* テキスト */}
                <div className="text-center">
                  <p className="text-lg font-medium text-white mb-2">AIが原稿を整形しています</p>
                  <p className="text-sm text-gray-500">話者判定、ノイズ除去、文整形を実行中...</p>
                </div>
                
                {/* プログレスインジケーター */}
                <div className="w-full max-w-xs">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#ff6b00] to-[#ff8533] rounded-full animate-[shimmer_2s_infinite]" 
                         style={{
                           backgroundSize: '200% 100%',
                           animation: 'shimmer 2s linear infinite',
                         }} />
                  </div>
                </div>
                
                {/* 処理ステップ */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    解析中
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00] animate-pulse" />
                    整形中
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    完了
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Preview */}
        {!result && status === "idle" && (
          <section className="mt-12 border-t border-gray-200 pt-8">
            <h2 className="text-sm font-medium text-gray-600 mb-6 uppercase tracking-wider">
              整形機能
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FeatureCard
                icon={<Users className="w-5 h-5" />}
                title="話者判定"
                description="コンテキストから話者を自動推定"
              />
              <FeatureCard
                icon={<Scissors className="w-5 h-5" />}
                title="ノイズ除去"
                description="タイムコード・フィラー・重複を削除"
              />
              <FeatureCard
                icon={<AlignLeft className="w-5 h-5" />}
                title="文整形"
                description="句読点追加・段落分けを整理"
              />
              <FeatureCard
                icon={<FileText className="w-5 h-5" />}
                title="NA原稿形式"
                description="テレビ制作用に最適化された出力"
              />
            </div>
          </section>
        )}
      </div>
      
      {/* グローバルスタイル */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

