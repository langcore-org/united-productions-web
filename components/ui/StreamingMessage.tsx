/**
 * StreamingMessage Component & useLLMStream Hook
 * 
 * ストリーミングレスポンスを表示するコンポーネントとフック
 * usage情報、ツール使用状況、思考ステップを表示
 * 
 * 統合版: components/chat/StreamingMessage と components/research/message/StreamingMessage を統合
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Bot, Lightbulb, BrainCircuit, CheckCircle2 } from 'lucide-react';
import type { LLMMessage, LLMProvider } from '@/lib/llm/types';
import { streamLLMResponse, LLMApiError } from '@/lib/api/llm-client';
import { getToolConfig, TOOL_CONFIG } from '@/lib/tools/config';

/**
 * ツールオプションの型
 */
export interface ToolOptions {
  enableWebSearch?: boolean;
}

/**
 * Usage情報の型
 */
interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

/**
 * ツール呼び出し情報
 */
export interface ToolCallInfo {
  id: string;
  type: string;
  name?: string;
  input?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * 思考ステップ情報
 */
export interface ReasoningStepInfo {
  step: number;
  content: string;
  tokens?: number;
}

/**
 * ツール使用状況
 */
export interface ToolUsageInfo {
  web_search_calls?: number;
  x_search_calls?: number;
  code_interpreter_calls?: number;
  file_search_calls?: number;
  mcp_calls?: number;
  document_search_calls?: number;
}


/**
 * 思考ステップ情報（新しい形式）
 */
export interface ThinkingStepInfo {
  step: number;
  id: string;
  title: string;
  content?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  type: 'thinking' | 'search' | 'analysis' | 'synthesis' | 'complete';
}

/**
 * useLLMStream Hook
 * 
 * LLMストリーミングAPIとの連携を行うカスタムフック
 * usage情報、ツール使用状況、思考ステップをサーバーから受信して表示
 * 
 * @updated 2026-02-22 11:45
 */
export function useLLMStream() {
  const [content, setContent] = useState('');
  const [thinking, setThinking] = useState('');
  const [isComplete, setIsComplete] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
  const [toolUsage, setToolUsage] = useState<ToolUsageInfo | null>(null);
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStepInfo[]>([]);
  const [reasoningTokens, setReasoningTokens] = useState<number>(0);
  // 新しい状態
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStepInfo[]>([]);
  const [isAccepted, setIsAccepted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * ストリームを開始
   */
  const startStream = useCallback(async (
    messages: LLMMessage[],
    provider: LLMProvider,
    toolOptions?: ToolOptions
  ) => {
    setContent('');
    setThinking('');
    setIsComplete(false);
    setError(null);
    setUsage(null);
    setToolCalls([]);
    setToolUsage(null);
    setReasoningSteps([]);
    setReasoningTokens(0);
    setThinkingSteps([]);
    setIsAccepted(false);

    // 既存のリクエストをキャンセル
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      for await (const event of streamLLMResponse(
        { messages, provider, toolOptions },
        { signal: abortControllerRef.current.signal },
      )) {
        if (event.error) {
          throw new Error(event.error);
        }

        // リクエスト受理イベント
        if (event.accepted) {
          setIsAccepted(true);
        }

        // コンテンツチャンク
        if (event.content) {
          setContent((prev) => prev + event.content);
        }

        // レガシー思考プロセス
        if (event.thinking) {
          setThinking((prev) => prev + event.thinking);
        }

        // レガシーツール呼び出し
        if (event.toolCall) {
          setToolCalls((prev) => {
            const existing = prev.findIndex(t => t.id === event.toolCall!.id);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = { ...updated[existing], ...event.toolCall };
              return updated;
            }
            return [...prev, event.toolCall!];
          });
        }

        // レガシー思考ステップ
        if (event.reasoning) {
          setReasoningSteps((prev) => {
            const existing = prev.findIndex(r => r.step === event.reasoning!.step);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = { ...updated[existing], ...event.reasoning };
              return updated;
            }
            return [...prev, event.reasoning!];
          });
          if (event.reasoning.tokens) {
            setReasoningTokens(event.reasoning.tokens);
          }
        }

        // 新しい思考ステップ開始
        if (event.stepStart) {
          setThinkingSteps((prev) => [...prev, event.stepStart!]);
        }

        // 思考ステップ更新
        if (event.stepUpdate) {
          setThinkingSteps((prev) =>
            prev.map((step) =>
              step.id === event.stepUpdate!.id
                ? { ...step, ...event.stepUpdate }
                : step
            )
          );
        }

        // ツール呼び出しイベント
        if (event.toolCallEvent) {
          setToolCalls((prev) => {
            const existing = prev.findIndex(t => t.id === event.toolCallEvent!.id);
            const toolCallInfo: ToolCallInfo = {
              id: event.toolCallEvent!.id,
              type: event.toolCallEvent!.type,
              name: event.toolCallEvent!.name,
              input: event.toolCallEvent!.input,
              status: event.toolCallEvent!.status,
            };
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = { ...updated[existing], ...toolCallInfo };
              return updated;
            }
            return [...prev, toolCallInfo];
          });
        }

        // ツール使用状況
        if (event.toolUsage) {
          setToolUsage(event.toolUsage);
        }

        // 完了イベント
        if (event.done) {
          setIsComplete(true);
          if (event.usage) {
            setUsage(event.usage);
          }
        }
      }
      setIsComplete(true);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // キャンセルは正常
        setIsComplete(true);
      } else {
        const errorMessage = err instanceof LLMApiError
          ? err.message
          : err instanceof Error ? err.message : '予期しないエラーが発生しました';
        setError(errorMessage);
        setIsComplete(true);
      }
    }
  }, []);

  /**
   * ストリームをキャンセル
   */
  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsComplete(true);
  }, []);

  /**
   * ストリームをリセット
   */
  const resetStream = useCallback(() => {
    setContent('');
    setThinking('');
    setIsComplete(true);
    setError(null);
    setUsage(null);
    setToolCalls([]);
    setToolUsage(null);
    setReasoningSteps([]);
    setReasoningTokens(0);
  }, []);

  return {
    content,
    thinking,
    isComplete,
    error,
    usage,
    toolCalls,
    toolUsage,
    reasoningSteps,
    reasoningTokens,
    // 新しい戻り値
    thinkingSteps,
    isAccepted,
    startStream,
    cancelStream,
    resetStream,
  };
}

/**
 * ToolCallIndicator Component
 */
function ToolCallIndicator({ toolCalls }: { toolCalls: ToolCallInfo[] }) {
  if (toolCalls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {toolCalls.map((tool) => {
        const config = getToolConfig(tool.type, tool.name);
        const Icon = config.icon;
        const label = config.label;
        
        return (
          <div
            key={tool.id}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
              tool.status === 'running' && "bg-blue-50 text-blue-700 border-blue-200 animate-pulse",
              tool.status === 'completed' && "bg-green-50 text-green-700 border-green-200",
              tool.status === 'failed' && "bg-red-50 text-red-700 border-red-200",
              tool.status === 'pending' && "bg-gray-50 text-gray-600 border-gray-200"
            )}
          >
            <Icon className="w-3 h-3" />
            <span>{label}</span>
            {tool.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
            {tool.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
          </div>
        );
      })}
    </div>
  );
}

/**
 * ToolUsageSummary Component
 */
function ToolUsageSummary({ toolUsage }: { toolUsage: ToolUsageInfo | null }) {
  if (!toolUsage) return null;

  const items = [
    { key: 'web_search_calls',       ...TOOL_CONFIG.web_search,       count: toolUsage.web_search_calls },
    { key: 'x_search_calls',         ...TOOL_CONFIG.x_search,         count: toolUsage.x_search_calls },
    { key: 'code_interpreter_calls', ...TOOL_CONFIG.code_interpreter, count: toolUsage.code_interpreter_calls },
    { key: 'file_search_calls',      ...TOOL_CONFIG.file_search,      count: toolUsage.file_search_calls },
  ].filter(item => item.count && item.count > 0);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
      {items.map(({ key, label, count, icon: Icon }) => (
        <div key={key} className="flex items-center gap-1">
          <Icon className="w-3 h-3" />
          <span>{label}: {count}回</span>
        </div>
      ))}
    </div>
  );
}

/**
 * ReasoningSteps Component
 */
function ReasoningSteps({ steps, totalTokens }: { steps: ReasoningStepInfo[]; totalTokens?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (steps.length === 0) return null;

  return (
    <div className="mb-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">思考プロセス</span>
          {totalTokens && totalTokens > 0 && (
            <span className="text-xs text-purple-600">({totalTokens.toLocaleString()} トークン)</span>
          )}
        </div>
        <span className="text-xs text-purple-600">
          {isExpanded ? '折りたたむ' : '展開'}
        </span>
      </button>

      {isExpanded && (
        <div className="px-2.5 pb-2.5 space-y-1.5">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-2 p-2 rounded bg-white/60 border border-purple-100/50">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-xs font-medium text-purple-700">
                {step.step}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{step.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * StreamingMessage Component Props
 */
interface StreamingMessageProps {
  /** プロバイダー（表示用） */
  provider?: LLMProvider | string;
  /** メッセージ内容 */
  content: string;
  /** 思考プロセス内容 */
  thinking?: string;
  /** 完了フラグ */
  isComplete?: boolean;
  /** 追加クラス */
  className?: string;
  /** Usage情報 */
  usage?: UsageInfo | null;
  /** 思考プロセスを表示するか */
  showThinking?: boolean;
  /** アバターを表示するか */
  showAvatar?: boolean;
  /** バリアント（デフォルト or チャット風） */
  variant?: 'default' | 'chat';
  /** ツール呼び出し情報 */
  toolCalls?: ToolCallInfo[];
  /** ツール使用状況 */
  toolUsage?: ToolUsageInfo | null;
  /** 思考ステップ */
  reasoningSteps?: ReasoningStepInfo[];
  /** 推論トークン数 */
  reasoningTokens?: number;
}

/**
 * StreamingMessage Component
 * 
 * ストリーミングレスポンスを表示するコンポーネント（統合版）
 * ツール使用状況と思考ステップを表示
 */
export function StreamingMessage({
  provider,
  content,
  thinking,
  isComplete = false,
  className,
  usage: externalUsage,
  showThinking = true,
  showAvatar = false,
  variant = 'default',
  toolCalls = [],
  toolUsage = null,
  reasoningSteps = [],
  reasoningTokens = 0,
}: StreamingMessageProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showUsage, setShowUsage] = useState(false);

  // 新しいコンテンツが追加されたら自動スクロール
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, thinking]);

  // 完了後にusage表示を有効化
  useEffect(() => {
    if (isComplete && externalUsage) {
      setShowUsage(true);
    }
  }, [isComplete, externalUsage]);

  const hasThinking = thinking && thinking.length > 0;
  const hasToolCalls = toolCalls.length > 0;
  const hasReasoning = reasoningSteps.length > 0;

  // チャット風バリアント
  if (variant === 'chat') {
    return (
      <div className={cn('flex gap-4', className)} ref={contentRef}>
        {/* Avatar */}
        {showAvatar && (
          <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-black to-gray-800 shadow-lg">
            {isComplete ? (
              <Bot className="w-4 h-4 text-white" />
            ) : (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 max-w-[85%] items-start">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-medium text-gray-600">AI Assistant</span>
            {provider && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                {provider}
              </span>
            )}
            {!isComplete && (
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" />
                生成中
              </span>
            )}
          </div>

          {/* Tool Calls */}
          {hasToolCalls && <ToolCallIndicator toolCalls={toolCalls} />}

          {/* Reasoning Steps */}
          {showThinking && hasReasoning && (
            <ReasoningSteps steps={reasoningSteps} totalTokens={reasoningTokens} />
          )}

          {/* Thinking Process (Legacy) */}
          {showThinking && hasThinking && !hasReasoning && (
            <div className="mb-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-amber-600 font-medium">思考プロセス</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">
                {thinking}
              </p>
            </div>
          )}

          {/* Message Bubble */}
          <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-white text-gray-800 border border-gray-200 rounded-tl-sm">
            {content ? (
              <div className="whitespace-pre-wrap">
                {content}
                {!isComplete && (
                  <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
                )}
              </div>
            ) : (
              !isComplete && (
                <div className="flex items-center gap-3 text-gray-400 py-1">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  </div>
                  <span className="text-xs">考え中...</span>
                </div>
              )
            )}
          </div>

          {/* Usage Info & Tool Usage */}
          {(showUsage && externalUsage) || toolUsage ? (
            <div className="mt-2 space-y-1">
              {showUsage && externalUsage && (
                <div className="text-xs text-gray-400">
                  {externalUsage.inputTokens.toLocaleString()} 入力 / {externalUsage.outputTokens.toLocaleString()} 出力
                  {' • '}${externalUsage.cost.toFixed(6)}
                </div>
              )}
              <ToolUsageSummary toolUsage={toolUsage} />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // デフォルトバリアント
  return (
    <div className={cn('space-y-3', className)}>
      {/* ツール呼び出し */}
      {hasToolCalls && <ToolCallIndicator toolCalls={toolCalls} />}

      {/* 思考ステップ */}
      {hasReasoning && showThinking && (
        <ReasoningSteps steps={reasoningSteps} totalTokens={reasoningTokens} />
      )}

      {/* 思考プロセス（Legacy） */}
      {hasThinking && showThinking && !hasReasoning && (
        <div className="rounded-lg bg-muted/50 border border-border/50 p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            思考プロセス
          </div>
          <div
            ref={contentRef}
            className="text-sm text-muted-foreground whitespace-pre-wrap"
          >
            {thinking}
          </div>
        </div>
      )}

      {/* メッセージコンテンツ */}
      <div
        className="prose prose-neutral dark:prose-invert max-w-none"
      >
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {content}
          {!isComplete && (
            <span className="inline-block w-2 h-4 ml-1 bg-foreground/50 animate-pulse" />
          )}
        </div>
      </div>

      {/* ステータス表示 */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {!isComplete ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>生成中...</span>
            {provider && (
              <span className="text-muted-foreground/60">
                • {provider}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="text-green-600 dark:text-green-400">完了</span>
            {showUsage && externalUsage && (
              <span className="text-muted-foreground">
                • {externalUsage.inputTokens.toLocaleString()} 入力 / {externalUsage.outputTokens.toLocaleString()} 出力
                • ${externalUsage.cost.toFixed(6)}
              </span>
            )}
          </>
        )}
      </div>

      {/* ツール使用状況 */}
      <ToolUsageSummary toolUsage={toolUsage} />
    </div>
  );
}
