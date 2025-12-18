'use client';

import { Message } from 'ai';
import { useState } from 'react';

interface MessageBubbleProps {
  message: Message;
  onSaveToFile?: (content: string) => void;
}

export function MessageBubble({ message, onSaveToFile }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSaveToFile?.(message.content);
  };

  // Clean up display content - hide file context for user messages
  const displayContent = isUser
    ? message.content.replace(/<file[^>]*>[\s\S]*?<\/file>\s*/g, '')
    : message.content;

  // Check if user message has file attachments
  const hasFileAttachments = isUser && message.content.includes('<file');
  const fileMatches = message.content.match(/<file name="([^"]+)"/g);
  const attachedFileNames = fileMatches?.map((m) => m.match(/name="([^"]+)"/)?.[1]) || [];

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}
      >
        <div className="text-xs opacity-70 mb-1">{isUser ? 'You' : 'Claude'}</div>

        {/* Show attached files indicator for user messages */}
        {hasFileAttachments && attachedFileNames.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {attachedFileNames.map((name, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded"
              >
                &#128196; {name}
              </span>
            ))}
          </div>
        )}

        <div className="whitespace-pre-wrap break-words">{displayContent}</div>

        {/* Action buttons for assistant messages */}
        {!isUser && showActions && (
          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCopy}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
            >
              {copied ? (
                <>
                  <span>&#10003;</span> Copied
                </>
              ) : (
                <>
                  <span>&#128203;</span> Copy
                </>
              )}
            </button>
            <button
              onClick={handleSave}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
            >
              <span>&#128190;</span> Save to File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
