/**
 * StreamingMessage Component & useLLMStream Hook
 * 
 * ストリーミングレスポンスを表示するコンポーネントとフック
 * usage情報をサーバーから受信して表示
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
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
  provider?: LLMProvider;
  /** メッセージ内容 */
  content: string;
  /** 思考プロセス内容 */
  thinking?: string;
  /** 完了フラグ */
  isComplete: boolean;
  /** 追加クラス */
  className?: string;
  /** Usage情報 */
  usage?: UsageInfo | null;
}

/**
 * StreamingMessage Component
 * 
 * ストリーミングレスポンスを表示するコンポーネント
 */
export function StreamingMessage({
  provider,
  content,
  thinking,
  isComplete,
  className,
  usage: externalUsage,
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

  return (
    <div className={cn('space-y-3', className)}>
      {/* 思考プロセス（Grok対応） */}
      {hasThinking && (
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
