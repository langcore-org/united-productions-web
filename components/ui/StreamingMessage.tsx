/**
 * StreamingMessage Component & useLLMStream Hook
 * 
 * ストリーミングレスポンスを表示するコンポーネントとフック
 * usage情報をサーバーから受信して表示
 * 
 * 統合版: components/chat/StreamingMessage と components/research/message/StreamingMessage を統合
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Bot, Lightbulb } from 'lucide-react';
import type { LLMMessage, LLMProvider } from '@/lib/llm/types';

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
 * useLLMStream Hook
 * 
 * LLMストリーミングAPIとの連携を行うカスタムフック
 * usage情報をサーバーから受信して表示
 */
export function useLLMStream() {
  const [content, setContent] = useState('');
  const [thinking, setThinking] = useState('');
  const [isComplete, setIsComplete] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
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

    // 既存のリクエストをキャンセル
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/llm/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          provider,
          toolOptions,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('レスポンスボディを読み取れません');
      }

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;

            const dataStr = line.slice(6); // Remove 'data: ' prefix
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);

              // コンテンツチャンク
              if (data.content) {
                setContent((prev) => prev + data.content);
              }

              // 思考プロセス（Grok対応）
              if (data.thinking) {
                setThinking((prev) => prev + data.thinking);
              }

              // 完了時のusage情報
              if (data.done) {
                setIsComplete(true);
                if (data.usage) {
                  setUsage(data.usage);
                }
              }

              // エラー
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // JSONパースエラーは無視
              if (!(parseError instanceof SyntaxError)) {
                throw parseError;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      setIsComplete(true);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // キャンセルは正常
        setIsComplete(true);
      } else {
        const errorMessage = err instanceof Error ? err.message : '予期しないエラーが発生しました';
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
  }, []);

  return {
    content,
    thinking,
    isComplete,
    error,
    usage,
    startStream,
    cancelStream,
    resetStream,
  };
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
}

/**
 * StreamingMessage Component
 * 
 * ストリーミングレスポンスを表示するコンポーネント（統合版）
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

          {/* Thinking Process */}
          {showThinking && hasThinking && (
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

          {/* Usage Info */}
          {showUsage && externalUsage && (
            <div className="mt-2 text-xs text-gray-400">
              {externalUsage.inputTokens.toLocaleString()} 入力 / {externalUsage.outputTokens.toLocaleString()} 出力
              {' • '}${externalUsage.cost.toFixed(6)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // デフォルトバリアント
  return (
    <div className={cn('space-y-3', className)}>
      {/* 思考プロセス（Grok対応） */}
      {hasThinking && showThinking && (
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
    </div>
  );
}
