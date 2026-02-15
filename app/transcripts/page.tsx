"use client";

import { useState, useRef } from "react";
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
  MessageSquare,
  Scissors,
  AlignLeft,
} from "lucide-react";

type ProcessingStatus = "idle" | "processing" | "completed" | "error";

const SUPPORTED_PROVIDERS: LLMProvider[] = [
  "gemini-25-flash-lite",
  "gemini-30-flash",
];

const DEFAULT_PROVIDER: LLMProvider = "gemini-25-flash-lite";

export default function TranscriptsPage() {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<LLMProvider>(DEFAULT_PROVIDER);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleProcess = async () => {
    if (!transcript.trim()) return;

    setStatus("processing");
    setError(null);

    try {
      const response = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          provider: provider === "gemini-25-flash-lite" ? "gemini-2.5-flash-lite" : "gemini-3.0-flash",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "処理中にエラーが発生しました");
      }

      const data = await response.json();
      setResult(data.content);
      setStatus("completed");
      
      // 結果エリアにスクロール
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラーが発生しました");
      setStatus("error");
    }
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
          <button
            onClick={handleProcess}
            disabled={!transcript.trim() || status === "processing"}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-xl font-medium transition-all duration-200",
              !transcript.trim() || status === "processing"
                ? "bg-[#2a2a35] text-gray-500 cursor-not-allowed"
                : "bg-[#ff6b00] text-white hover:bg-[#ff8533] shadow-lg shadow-[#ff6b00]/20 hover:shadow-xl hover:shadow-[#ff6b00]/30"
            )}
          >
            {status === "processing" ? (
              <>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                </div>
                整形中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                AIで整形する
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Result Section */}
        {result && (
          <section ref={resultRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                整形結果（NA原稿）
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
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
