'use client';

import { Message } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  onSaveToFile?: (content: string) => void;
  onClearChat?: () => void;
}

export function MessageList({ messages, isLoading, onSaveToFile, onClearChat }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearClick = () => {
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onClearChat?.();
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">&#128172;</div>
          <p>Start a conversation with Claude Code</p>
          <p className="text-sm mt-2">Use @ to attach files from data/files/</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 relative">
      {/* Clear chat button with inline confirmation */}
      {messages.length > 0 && onClearChat && (
        <div className="sticky top-0 z-10 flex justify-end mb-2">
          {!showConfirm ? (
            <button
              onClick={handleClearClick}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md transition-colors flex items-center gap-1.5"
              title="Clear chat history"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 px-2 py-1">
              <span className="text-xs text-gray-600 dark:text-gray-300">Delete all?</span>
              <button
                onClick={handleConfirm}
                className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              >
                Yes
              </button>
              <button
                onClick={handleCancel}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors"
              >
                No
              </button>
            </div>
          )}
        </div>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onSaveToFile={onSaveToFile} />
      ))}
      {isLoading && (
        <div className="flex justify-start mb-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
            <div className="text-xs opacity-70 mb-1">Claude</div>
            <div className="flex space-x-1">
              <span className="animate-bounce">&#9679;</span>
              <span className="animate-bounce delay-100">&#9679;</span>
              <span className="animate-bounce delay-200">&#9679;</span>
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
