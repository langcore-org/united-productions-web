/**
 * LangChain Chat Component
 *
 * LangChainバックエンドと連携するチャットUI
 * ツール呼び出し・思考ステップ表示にも対応
 */

'use client';

import { useLangChainChat } from '@/hooks/useLangChainChat';
import type { LLMProvider } from '@/lib/llm/types';
import { Loader2, CheckCircle2, BrainCircuit } from 'lucide-react';
import { getToolConfig } from '@/lib/tools/config';

interface LangChainChatProps {
  provider?: LLMProvider;
  temperature?: number;
}

export function LangChainChat({ provider, temperature = 0.7 }: LangChainChatProps) {
  const {
    messages,
    input,
    isLoading,
    error,
    toolCalls,
    reasoningSteps,
    streamingContent,
    thinking,
    isComplete,
    setInput,
    handleSubmit,
    stop,
  } = useLangChainChat({
    provider,
    temperature,
  });

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">LangChain Chat ({provider || 'default'})</h2>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {/* メッセージ表示 */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 border rounded-lg p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            Start a conversation by typing a message below.
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="text-sm font-semibold mb-1">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))
        )}

        {/* ツール呼び出し表示 */}
        {isLoading && toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2">
            {toolCalls.map((tool) => {
              const config = getToolConfig(tool.type, tool.name);
              const Icon = config.icon;
              return (
                <div
                  key={tool.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    tool.status === 'running'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                      : tool.status === 'completed'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{config.label}</span>
                  {tool.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {tool.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                </div>
              );
            })}
          </div>
        )}

        {/* 思考ステップ表示 */}
        {isLoading && reasoningSteps.length > 0 && (
          <div className="px-2 space-y-1">
            {reasoningSteps.map((step) => (
              <div key={step.step} className="flex items-start gap-2 p-2 rounded bg-purple-50 border border-purple-100">
                <BrainCircuit className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-purple-900">{step.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* ストリーミング中のコンテンツ表示 */}
        {isLoading && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-white border border-gray-200">
              <div className="text-sm font-semibold mb-1">Assistant</div>
              <div className="whitespace-pre-wrap">
                {streamingContent}
                <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
              </div>
            </div>
          </div>
        )}

        {/* ローディングインジケータ */}
        {isLoading && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
