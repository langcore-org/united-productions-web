'use client';

import { useState } from 'react';
import { MarkdownPreview } from './MarkdownPreview';

interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

interface GeneratedFile {
  path: string;
  createdAt: Date;
}

interface TaskPanelProps {
  todos: TodoItem[];
  generatedFiles: GeneratedFile[];
  onFileClick?: (path: string) => void;
}

export function TaskPanel({ todos, generatedFiles, onFileClick }: TaskPanelProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'files'>('tasks');
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '●';
      case 'pending':
      default:
        return '○';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'pending':
      default:
        return 'text-gray-400 dark:text-gray-500';
    }
  };

  const getBgColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'in_progress':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'pending':
      default:
        return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
    }
  };

  const getFileIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return '🖼️';
    }
    if (['md', 'txt'].includes(ext || '')) {
      return '📄';
    }
    return '📁';
  };

  const getFileName = (path: string) => {
    return path.split('/').pop() || path;
  };

  const getRelativePath = (path: string) => {
    // Convert absolute path to relative path from data/files
    const dataFilesIndex = path.indexOf('data/files/');
    if (dataFilesIndex !== -1) {
      return path.substring(dataFilesIndex + 'data/files/'.length);
    }
    return path;
  };

  const isImageFile = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '');
  };

  const isMarkdownFile = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    return ext === 'md' || ext === 'markdown';
  };

  const handleFileClick = async (path: string) => {
    const relativePath = getRelativePath(path);

    if (isImageFile(path)) {
      // For images, show in preview modal
      setPreviewFile(path);
      setPreviewContent(null);
    } else {
      // For text files, fetch and show content
      setPreviewLoading(true);
      setPreviewFile(path);
      try {
        const res = await fetch(`/api/files/${encodeURIComponent(relativePath)}`);
        const data = await res.json();
        setPreviewContent(data.content || 'Unable to load file content');
      } catch {
        setPreviewContent('Error loading file');
      }
      setPreviewLoading(false);
    }

    onFileClick?.(path);
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewContent(null);
  };

  // Task stats
  const completedCount = todos.filter((t) => t.status === 'completed').length;
  const totalCount = todos.length;
  const activeTask = todos.find((t) => t.status === 'in_progress');

  return (
    <>
      <div className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 mx-4 mb-2 rounded-lg overflow-hidden">
        {/* Tab content */}
        <div className="px-3 py-2">
          {activeTab === 'tasks' && (
            <div>
              {/* Progress bar */}
              {totalCount > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 dark:bg-green-400 transition-all duration-300"
                      style={{ width: `${(completedCount / totalCount) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Active task highlight */}
              {activeTask && (
                <div className="mb-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400 animate-pulse">●</span>
                    <span className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                      {activeTask.activeForm}
                    </span>
                  </div>
                </div>
              )}

              {/* Todo list */}
              {todos.length > 0 ? (
                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
                  {todos.map((todo, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${getBgColor(todo.status)}`}
                    >
                      <span className={`font-bold ${getStatusColor(todo.status)}`}>
                        {getStatusIcon(todo.status)}
                      </span>
                      <span
                        className={`${
                          todo.status === 'completed'
                            ? 'line-through text-gray-500 dark:text-gray-500'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {todo.content}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  タスクはまだありません
                </div>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="max-h-[180px] overflow-y-auto">
              {generatedFiles.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {generatedFiles.map((file, index) => (
                    <button
                      key={index}
                      onClick={() => handleFileClick(file.path)}
                      className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <span className="text-lg">{getFileIcon(file.path)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {getFileName(file.path)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {getRelativePath(file.path)}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(file.createdAt).toLocaleTimeString()}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  ファイルはまだありません
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab footer - moved to bottom */}
        <div className="flex border-t dark:border-gray-700">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t-2 border-blue-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            タスク {totalCount > 0 && `(${completedCount}/${totalCount})`}
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'files'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t-2 border-blue-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            ファイル {generatedFiles.length > 0 && `(${generatedFiles.length})`}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closePreview}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span>{getFileIcon(previewFile)}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {getFileName(previewFile)}
                </span>
              </div>
              <button
                onClick={closePreview}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {previewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="animate-spin">⏳</span>
                  <span className="ml-2 text-gray-500">Loading...</span>
                </div>
              ) : isImageFile(previewFile) ? (
                <img
                  src={`/api/files/${encodeURIComponent(getRelativePath(previewFile))}?raw=true`}
                  alt={getFileName(previewFile)}
                  className="max-w-full h-auto mx-auto"
                />
              ) : isMarkdownFile(previewFile) && previewContent ? (
                <MarkdownPreview
                  content={previewContent}
                  basePath={getRelativePath(previewFile)}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                  {previewContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
