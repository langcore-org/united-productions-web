"use client";

import {
  AlertCircle,
  Brain,
  Briefcase,
  Calendar,
  Check,
  CheckSquare,
  Copy,
  Download,
  FileText,
  MessageSquare,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  Terminal,
  ThumbsUp,
  User,
  Users,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { DriveUploadButton } from "@/components/meeting-notes/GoogleDriveButtons";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { FileUpload } from "@/components/ui/FileUpload";
import { ProgramSelector } from "@/components/ui/ProgramSelector";
import { DEFAULT_PROVIDER } from "@/lib/llm/config";
import { cn } from "@/lib/utils";
import { sanitizeAndFormatMarkdown } from "@/lib/xss-sanitizer";

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

// デフォルトプロバイダーは lib/llm/config.ts の DEFAULT_PROVIDER を使用

export default function MeetingNotesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<MeetingTemplate>("meeting");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("all");

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
          provider: DEFAULT_PROVIDER,
          programId: selectedProgramId,
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
          } catch {}
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
  }, [transcript, selectedTemplate, selectedProgramId]);

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

  const currentTemplate = templates.find((t) => t.id === selectedTemplate);
  if (!currentTemplate) {
    return null;
  }

  return (
    <div>
      {/* Header - Sticky */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-200 to-gray-100 flex items-center justify-center border border-gray-200">
                <FileText className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">議事録・文字起こし</h1>
                <p className="text-sm text-gray-500">Zoom文字起こしをAIで整形</p>
              </div>
            </div>
            <ProgramSelector
              value={selectedProgramId}
              onChange={setSelectedProgramId}
              disabled={status === "streaming"}
            />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Template Selection */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-600 mb-4 uppercase tracking-wider">
            テンプレート選択
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <button
                type="button"
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  "relative p-5 rounded-xl border text-left transition-all duration-300",
                  "hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20",
                  selectedTemplate === template.id
                    ? "border-black bg-gray-50 shadow-lg"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                )}
              >
                {selectedTemplate === template.id && (
                  <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-black flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                      selectedTemplate === template.id
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {template.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {template.features.map((feature) => (
                    <span
                      key={feature}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full transition-colors duration-300",
                        selectedTemplate === template.id
                          ? "bg-black text-white border border-black"
                          : "bg-gray-100 text-gray-500",
                      )}
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
            <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wider">
              Zoom文字起こしテキスト
            </h2>
            {transcript && (
              <button
                type="button"
                onClick={() => setTranscript("")}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                クリア
              </button>
            )}
          </div>

          {/* File Upload */}
          <div className="mb-4">
            <FileUpload
              onUpload={(text, _filename) => setTranscript(text)}
              accept={{
                "text/plain": [".txt"],
                "text/vtt": [".vtt"],
              }}
            />
          </div>

          {/* サジェスト例 */}
          {!transcript && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">例:</p>
              <div className="flex flex-wrap gap-2">
                {(currentTemplate.id === "meeting"
                  ? [
                      "Zoom文字起こしを議事録に整形して",
                      "会議の決定事項を抽出して",
                      "TODOリストを作成して",
                    ]
                  : ["面談の内容を整理して", "出演意向をまとめて", "フォローアップ事項を抽出して"]
                ).map((suggestion) => (
                  <button
                    type="button"
                    key={`suggestion-${suggestion}`}
                    onClick={() => setTranscript(suggestion)}
                    className="px-3 py-1.5 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-full transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative group">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={`ここにZoomの文字起こしテキストを貼り付けてください...\n\n${
                currentTemplate.id === "meeting"
                  ? "【会議用】議題、発言者、決定事項、TODOなどが含まれるテキストを入力してください。"
                  : "【面談用】面談相手の発言、経歴、出演に関する話題などが含まれるテキストを入力してください。"
              }`}
              className={cn(
                "w-full h-[300px] p-5 rounded-2xl resize-none",
                "bg-white border-2 border-gray-200",
                "text-gray-800 placeholder-gray-400",
                "focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5",
                "transition-all duration-300",
                "text-sm leading-relaxed",
              )}
            />
            <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
              {transcript.length.toLocaleString()} 文字
            </div>
          </div>
        </section>

        {/* Process Button */}
        <div className="flex justify-center mb-12">
          {status === "streaming" ? (
            <button
              type="button"
              onClick={handleCancel}
              className={cn(
                "flex items-center gap-3 px-8 py-4 rounded-xl font-medium transition-all duration-200",
                "bg-gray-700 text-white hover:bg-gray-800 shadow-lg shadow-gray-500/20 hover:shadow-gray-500/30",
              )}
            >
              <Square className="w-5 h-5 fill-current" />
              生成を停止
            </button>
          ) : (
            <button
              type="button"
              onClick={handleProcess}
              disabled={!transcript.trim()}
              className={cn(
                "flex items-center gap-3 px-8 py-4 rounded-xl font-medium transition-all duration-300",
                !transcript.trim()
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                  : "bg-black text-white hover:bg-gray-800 shadow-lg hover:shadow-xl hover:scale-[1.02]",
              )}
            >
              <Sparkles className="w-5 h-5" />
              AIで整形する
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-gray-100 border border-gray-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-800">エラーが発生しました</p>
                <p className="text-sm text-gray-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Result Section */}
        {(result || status === "streaming") && (
          <section
            ref={resultRef}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wider">
                  整形結果
                </h2>
                {status === "streaming" && (
                  <span className="inline-flex items-center gap-2 text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-xs border border-gray-200">
                    <Brain className="w-3.5 h-3.5 animate-pulse" />
                    生成中...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!result}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                    copied
                      ? "bg-gray-100 text-gray-700 border border-gray-200"
                      : "bg-gray-100 text-gray-600 hover:text-black hover:bg-gray-200 border border-transparent",
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
                <DriveUploadButton
                  content={result}
                  filename={`meeting-notes-${new Date().toISOString().split("T")[0]}.md`}
                />
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!result}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:text-black hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 border border-transparent hover:border-gray-300"
                >
                  <Download className="w-4 h-4" />
                  Markdown保存
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:text-black hover:bg-gray-200 transition-all duration-200 border border-transparent hover:border-gray-300"
                >
                  <RotateCcw className="w-4 h-4" />
                  新規作成
                </button>
              </div>
            </div>

            {/* Result */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500 font-mono">meeting-notes.md</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* biome-ignore lint/security/noDangerouslySetInnerHtml: DOMPurifyでサニタイズ済み */}
                <div
                  className="text-gray-800 leading-relaxed whitespace-pre-wrap font-mono text-sm"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeAndFormatMarkdown(result),
                  }}
                />
                {status === "streaming" && (
                  <span className="inline-block w-2 h-5 bg-black ml-1 animate-pulse rounded-sm" />
                )}
              </div>
            </div>
          </section>
        )}

        {/* Feature Preview */}
        {!result && status === "idle" && (
          <section className="mt-12 border-t border-gray-200 pt-8">
            <h2 className="text-sm font-medium text-gray-600 mb-6 uppercase tracking-wider">
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
