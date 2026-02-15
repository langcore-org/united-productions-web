"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { LLMSelector, type LLMProvider } from "@/components/ui/LLMSelector";
import {
  FileText,
  Users,
  Sparkles,
  Copy,
  Download,
  RotateCcw,
  Check,
  Mic,
  Calendar,
  CheckSquare,
  User,
  Briefcase,
  MessageSquare,
  ThumbsUp,
  Square,
  Loader2,
} from "lucide-react";

type MeetingTemplate = "meeting" | "interview";
type ProcessingStatus = "idle" | "streaming" | "completed" | "error";

interface TemplateOption {
  id: MeetingTemplate;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

const templates: TemplateOption[] = [
  {
    id: "meeting",
    name: "会議用",
    description: "議題・発言要旨・決定事項・TODO",
    icon: <Users className="w-5 h-5" />,
    features: ["議題整理", "発言要約", "決定事項抽出", "TODO管理"],
  },
  {
    id: "interview",
    name: "面談用",
    description: "人物名・経歴・話した内容・出演可否",
    icon: <Mic className="w-5 h-5" />,
    features: ["プロフィール整理", "発言記録", "出演意向確認", "フォローアップ"],
  },
];

const SUPPORTED_PROVIDERS: LLMProvider[] = [
  "gemini-25-flash-lite",
  "gemini-30-flash",
  "grok-41-fast",
  "grok-4",
];

const DEFAULT_PROVIDER: LLMProvider = "gemini-25-flash-lite";

// プロバイダーID変換
const convertProvider = (uiProvider: LLMProvider): string => {
  const mapping: Record<LLMProvider, string> = {
    "gemini-25-flash-lite": "gemini-2.5-flash-lite",
    "gemini-30-flash": "gemini-3.0-flash",
    "grok-41-fast": "grok-4.1-fast",
    "grok-4": "grok-4",
    "gpt-4o-mini": "gpt-4o-mini",
    "gpt-5": "gpt-5",
    "claude-sonnet-45": "claude-sonnet-4.5",
    "claude-opus-46": "claude-opus-4.6",
    "perplexity-sonar": "perplexity-sonar",
    "perplexity-sonar-pro": "perplexity-sonar-pro",
  };
  return mapping[uiProvider] || uiProvider;
};

export default function MeetingNotesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<MeetingTemplate>("meeting");
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
              content: getSystemPrompt(selectedTemplate),
            },
            {
              role: "user",
              content: `以下のZoom文字起こしテキストを${selectedTemplate === "meeting" ? "会議用" : "面談用"}テンプレートで整形してください：\n\n${transcript}`,
            },
          ],
          provider: convertProvider(provider),
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
  }, [transcript, selectedTemplate, provider]);

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

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting-notes-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const currentTemplate = templates.find((t) => t.id === selectedTemplate)!;

  return (
    <div className="min-h-screen bg-[#0d0d12] text-gray-100">
      {/* Header */}
      <header className="border-b border-[#2a2a35] bg-[#1a1a24]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#ff6b00]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">議事録・文字起こし</h1>
                <p className="text-sm text-gray-500">Zoom文字起こしをAIで整形</p>
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
        {/* Template Selection */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
            テンプレート選択
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  "relative p-5 rounded-xl border text-left transition-all duration-200",
                  selectedTemplate === template.id
                    ? "border-[#ff6b00] bg-[#ff6b00]/5"
                    : "border-[#2a2a35] bg-[#1a1a24] hover:border-[#3a3a45] hover:bg-[#1f1f2a]"
                )}
              >
                {selectedTemplate === template.id && (
                  <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[#ff6b00] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      selectedTemplate === template.id
                        ? "bg-[#ff6b00]/20 text-[#ff6b00]"
                        : "bg-[#2a2a35] text-gray-400"
                    )}
                  >
                    {template.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {template.features.map((feature) => (
                    <span
                      key={feature}
                      className="text-xs px-2 py-1 rounded-full bg-[#2a2a35] text-gray-400"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Input Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Zoom文字起こしテキスト
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
              placeholder={`ここにZoomの文字起こしテキストを貼り付けてください...\n\n${currentTemplate.id === "meeting" 
                ? "【会議用】議題、発言者、決定事項、TODOなどが含まれるテキストを入力してください。"
                : "【面談用】面談相手の発言、経歴、出演に関する話題などが含まれるテキストを入力してください。"
              }`}
              className={cn(
                "w-full h-[300px] p-5 rounded-xl resize-none",
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
              disabled={!transcript.trim() || status === "streaming"}
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
                整形結果
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
                  onClick={handleDownload}
                  disabled={!result}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-[#2a2a35] text-gray-400 hover:text-gray-200 hover:bg-[#3a3a45] transition-all duration-200 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Markdown保存
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
                      .replace(/### (.*)/g, '<h3 class="text-lg font-semibold text-white mt-6 mb-3">$1</h3>')
                      .replace(/## (.*)/g, '<h2 class="text-xl font-semibold text-white mt-8 mb-4">$1</h2>')
                      .replace(/# (.*)/g, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                      .replace(/- (.*)/g, '<li class="ml-4 text-gray-300">$1</li>')
                      .replace(/\[ \] (.*)/g, '<div class="flex items-center gap-2 my-1"><span class="w-4 h-4 border border-gray-500 rounded"></span><span>$1</span></div>')
                      .replace(/\[x\] (.*)/g, '<div class="flex items-center gap-2 my-1"><span class="w-4 h-4 bg-[#ff6b00] rounded flex items-center justify-center text-white text-xs">✓</span><span class="line-through text-gray-500">$1</span></div>')
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
              出力プレビュー
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentTemplate.id === "meeting" ? (
                <>
                  <FeatureCard
                    icon={<Calendar className="w-5 h-5" />}
                    title="議題整理"
                    description="会議の議題を明確に構造化"
                  />
                  <FeatureCard
                    icon={<MessageSquare className="w-5 h-5" />}
                    title="発言要約"
                    description="誰が何を話したかを整理"
                  />
                  <FeatureCard
                    icon={<CheckSquare className="w-5 h-5" />}
                    title="決定事項"
                    description="会議で決まったことを抽出"
                  />
                  <FeatureCard
                    icon={<CheckSquare className="w-5 h-5" />}
                    title="TODO管理"
                    description="アクションアイテムを明確化"
                  />
                </>
              ) : (
                <>
                  <FeatureCard
                    icon={<User className="w-5 h-5" />}
                    title="プロフィール"
                    description="人物名・経歴を整理"
                  />
                  <FeatureCard
                    icon={<MessageSquare className="w-5 h-5" />}
                    title="発言記録"
                    description="話した内容を要約"
                  />
                  <FeatureCard
                    icon={<ThumbsUp className="w-5 h-5" />}
                    title="出演意向"
                    description="出演可否を明確に記録"
                  />
                  <FeatureCard
                    icon={<Briefcase className="w-5 h-5" />}
                    title="フォローアップ"
                    description="次のアクションを整理"
                  />
                </>
              )}
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

/**
 * テンプレート別システムプロンプト
 */
function getSystemPrompt(template: MeetingTemplate): string {
  if (template === "meeting") {
    return `あなたは議事録作成の専門家です。Zoomの文字起こしテキストを、以下の形式で整形してください：

## 出力形式

### 会議情報
- 日時: [抽出または不明]
- 参加者: [発言者リスト]

### 議題
1. [議題1]
2. [議題2]
...

### 発言要旨
**[発言者名]**: [要約された発言内容]

### 決定事項
- [決定事項1]
- [決定事項2]

### TODO
- [ ] [担当者]: [タスク内容]
- [ ] [担当者]: [タスク内容]

### 次回予定
- 日時: [抽出または不明]
- 議題: [抽出または不明]

## 注意事項
- 発言者名は正確に抽出
- 発言内容は簡潔に要約
- TODOは具体的で実行可能な形に
- 不明な情報は「不明」と記載`;
  } else {
    return `あなたは面談記録の専門家です。Zoomの文字起こしテキストを、以下の形式で整形してください：

## 出力形式

### 基本情報
- 面談日: [抽出または不明]
- 面談相手: [名前を抽出]

### プロフィール
- 氏名: [抽出]
- 職業・肩書: [抽出]
- 所在地: [抽出]
- 連絡先: [抽出]

### 経歴・背景
[面談相手の経歴や背景情報を整理]

### 面談内容
**[トピック]**: [内容の要約]

### 出演に関する意向
- 出演可否: [可/不可/検討中]
- 条件・要望: [抽出]
- 懸念事項: [抽出]

### フォローアップ事項
- [ ] [担当者]: [タスク内容]

### 備考
[その他重要な情報]

## 注意事項
- 個人情報は適切に扱う
- 出演意向は明確に記録
- 次のアクションを具体的に`;
  }
}
