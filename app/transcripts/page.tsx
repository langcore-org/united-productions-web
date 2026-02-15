"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { LLMSelector, type LLMProvider } from "@/components/ui/LLMSelector";
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
} from "lucide-react";

type ProcessingStatus = "idle" | "streaming" | "completed" | "error";

const SUPPORTED_PROVIDERS: LLMProvider[] = [
  "gemini-2.5-flash-lite",
  "gemini-3.0-flash",
  "grok-4.1-fast",
  "grok-4",
];

const DEFAULT_PROVIDER: LLMProvider = "gemini-2.5-flash-lite";

export default function TranscriptsPage() {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<LLMProvider>(DEFAULT_PROVIDER);
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
          provider: provider,
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
  }, [transcript, provider]);

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

  return (
    <div className="min-h-screen bg-[#0d0d12] text-gray-100">
      {/* Header */}
      <header className="border-b border-[#2a2a35] bg-[#1a1a24]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center">
                <Mic className="w-5 h-5 text-[#ff6b00]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">起こし・NA原稿</h1>
                <p className="text-sm text-gray-500">Premiere Pro書き起こしをAIで整形</p>
              </div>
            </div>
            <LLMSelector
              value={provider}
              onChange={setProvider}
              supportedProviders={SUPPORTED_PROVIDERS}
              recommendedProvider={DEFAULT_PROVIDER}
            />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Speaker Labels Info */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
            対応話者ラベル
          </h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "櫻井", desc: "櫻井翔", color: "bg-blue-500/20 text-blue-400" },
              { label: "末澤", desc: "末澤誠也", color: "bg-green-500/20 text-green-400" },
              { label: "N", desc: "ナレーション", color: "bg-purple-500/20 text-purple-400" },
              { label: "その他", desc: "その他出演者", color: "bg-gray-500/20 text-gray-400" },
            ].map((speaker) => (
              <div
                key={speaker.label}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a24] border border-[#2a2a35]"
              >
                <span className={cn("text-xs px-2 py-0.5 rounded font-medium", speaker.color)}>
                  {speaker.label}
                </span>
                <span className="text-sm text-gray-500">{speaker.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Input Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Premiere Pro書き起こしテキスト
            </h2>
            {transcript && (
              <button
                onClick={() => setTranscript("")}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                クリア
              </button>
            )}
          </div>
          <div className="relative">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={`ここにPremiere Proの書き起こしテキストを貼り付けてください...\n\n【入力例】\n00:00:05 Speaker 1: えー、今日はよろしくお願いします。\n00:00:08 Speaker 2: こちらこそ。\n00:00:10 Speaker 1: あの、初めてお会いした時のことなんですけど...\n\n※タイムコード、Speaker ID、フィラーなどは自動で整形されます。`}
              className={cn(
                "w-full h-[400px] p-5 rounded-xl resize-none",
                "bg-[#1a1a24] border border-[#2a2a35]",
                "text-gray-200 placeholder-gray-600",
                "focus:outline-none focus:border-[#ff6b00]/50 focus:ring-1 focus:ring-[#ff6b00]/20",
                "transition-all duration-200",
                "text-sm leading-relaxed"
              )}
            />
            <div className="absolute bottom-4 right-4 text-xs text-gray-600">
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
                  ? "bg-[#2a2a35] text-gray-500 cursor-not-allowed"
                  : "bg-[#ff6b00] text-white hover:bg-[#ff8533] shadow-lg shadow-[#ff6b00]/20 hover:shadow-xl hover:shadow-[#ff6b00]/30"
              )}
            >
              <Sparkles className="w-5 h-5" />
              AIで整形する
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Result Section */}
        {(result || status === "streaming") && (
          <section ref={resultRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                整形結果（NA原稿）
                {status === "streaming" && (
                  <span className="ml-2 inline-flex items-center gap-1 text-green-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    生成中...
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!result}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                    copied
                      ? "bg-green-500/20 text-green-400"
                      : "bg-[#2a2a35] text-gray-400 hover:text-gray-200 hover:bg-[#3a3a45]"
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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-[#2a2a35] text-gray-400 hover:text-gray-200 hover:bg-[#3a3a45] transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4" />
                  新規作成
                </button>
              </div>
            </div>
            <div className="bg-[#1a1a24] border border-[#2a2a35] rounded-xl overflow-hidden">
              <div className="prose prose-invert max-w-none p-6">
                <div
                  className="text-gray-200 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: result
                      .replace(/\*\*櫻井\*\*:/g, '<span class="inline-block px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-sm font-medium mr-2">櫻井</span>')
                      .replace(/\*\*末澤\*\*:/g, '<span class="inline-block px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-sm font-medium mr-2">末澤</span>')
                      .replace(/\*\*N\*\*:/g, '<span class="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-sm font-medium mr-2">N</span>')
                      .replace(/\*\*その他\*\*:/g, '<span class="inline-block px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 text-sm font-medium mr-2">その他</span>')
                      .replace(/\*\*(.+?)\*\*:/g, '<span class="inline-block px-2 py-0.5 rounded bg-[#ff6b00]/20 text-[#ff6b00] text-sm font-medium mr-2">$1</span>')
                      .replace(/### (.*)/g, '<h3 class="text-lg font-semibold text-white mt-6 mb-3">$1</h3>')
                      .replace(/## (.*)/g, '<h2 class="text-xl font-semibold text-white mt-8 mb-4">$1</h2>')
                      .replace(/# (.*)/g, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>')
                      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
                      .replace(/- (.*)/g, '<li class="ml-4 text-gray-300">$1</li>')
                  }}
                />
                {status === "streaming" && (
                  <span className="inline-block w-1.5 h-4 bg-[#ff6b00] ml-0.5 animate-pulse" />
                )}
              </div>
            </div>
          </section>
        )}

        {/* Feature Preview */}
        {!result && status === "idle" && (
          <section className="mt-12 border-t border-[#2a2a35] pt-8">
            <h2 className="text-sm font-medium text-gray-400 mb-6 uppercase tracking-wider">
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
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-[#1a1a24] border border-[#2a2a35]">
      <div className="w-10 h-10 rounded-lg bg-[#ff6b00]/10 flex items-center justify-center text-[#ff6b00] mb-3">
        {icon}
      </div>
      <h3 className="font-medium text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}


