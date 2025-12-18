'use client';

import { FormEvent, useRef, useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileReference, generateRefId, getFileIcon, getChipColorClass } from '@/types/file-reference';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: string;
  fileCount?: number;
  isSelectable?: boolean;
}

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
  onFilesAttached?: (files: FileReference[]) => void;
  showThinking?: boolean;
  onShowThinkingChange?: (show: boolean) => void;
  onStop?: () => void;
}

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  onFilesAttached,
  showThinking = false,
  onShowThinkingChange,
  onStop,
}: ChatInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // File references state (object-based management)
  const [fileReferences, setFileReferences] = useState<Map<string, FileReference>>(new Map());

  // @ mention state
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);

  // Preview modal state
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'text' | 'image' | 'pdf' | 'markdown' | 'directory'>('text');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Track if we're in mention mode
  const mentionRangeRef = useRef<Range | null>(null);

  // Fetch files from API
  const fetchFiles = useCallback(async (query?: string) => {
    try {
      const url = query ? `/api/files?search=${encodeURIComponent(query)}` : '/api/files';
      const res = await fetch(url);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Notify parent when file references change
  useEffect(() => {
    onFilesAttached?.(Array.from(fileReferences.values()));
  }, [fileReferences, onFilesAttached]);

  // Filter files based on search (include directories)
  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredFiles(
        files.filter(
          (f) =>
            (f.name.toLowerCase().includes(query) || f.path.toLowerCase().includes(query)) && f.isSelectable !== false // Exclude non-selectable directories
        )
      );
    } else {
      setFilteredFiles(files.filter((f) => f.isSelectable !== false));
    }
    setSelectedIndex(0);
  }, [searchQuery, files]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowFilePicker(false);
        setSearchQuery('');
        mentionRangeRef.current = null;
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (showFilePicker && dropdownRef.current) {
      const selectedItem = dropdownRef.current.querySelector(`li:nth-child(${selectedIndex + 1})`);
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, showFilePicker]);

  // Global ESC key handler for stopping generation
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLoading && onStop) {
        e.preventDefault();
        onStop();
      }
    };
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isLoading, onStop]);

  // Sync external input with editor (for controlled component)
  useEffect(() => {
    if (editorRef.current && input === '' && fileReferences.size === 0) {
      editorRef.current.innerHTML = '';
    }
  }, [input, fileReferences.size]);

  // Get plain text content from editor
  const getPlainText = useCallback(() => {
    if (!editorRef.current) return '';

    let text = '';
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.dataset.refId) {
          // This is a file chip - add a placeholder or the display name
          text += `@${el.dataset.displayName || ''}`;
        } else if (el.tagName === 'BR') {
          text += '\n';
        } else {
          el.childNodes.forEach(walk);
        }
      }
    };
    editorRef.current.childNodes.forEach(walk);
    return text;
  }, []);

  // Handle input changes
  const handleInput = useCallback(() => {
    const text = getPlainText();

    // Create synthetic event for parent component
    const syntheticEvent = {
      target: { value: text },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    handleInputChange(syntheticEvent);

    // Check for @ trigger
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE) {
      const textContent = textNode.textContent || '';
      const cursorPos = range.startOffset;

      // Look backwards for @
      let atPos = -1;
      for (let i = cursorPos - 1; i >= 0; i--) {
        const char = textContent[i];
        if (char === '@') {
          // Check if @ is at start or preceded by space/newline
          if (i === 0 || textContent[i - 1] === ' ' || textContent[i - 1] === '\n') {
            atPos = i;
            break;
          }
        }
        if (char === ' ' || char === '\n') break;
      }

      if (atPos >= 0) {
        const query = textContent.slice(atPos + 1, cursorPos);
        // Only show picker if query doesn't contain space
        if (!query.includes(' ') && !query.includes('\n')) {
          setShowFilePicker(true);
          setSearchQuery(query);
          // Save range for later replacement
          const newRange = document.createRange();
          newRange.setStart(textNode, atPos);
          newRange.setEnd(textNode, cursorPos);
          mentionRangeRef.current = newRange;
          fetchFiles();
          return;
        }
      }
    }

    // Close picker if no @ context
    if (showFilePicker) {
      setShowFilePicker(false);
      setSearchQuery('');
      mentionRangeRef.current = null;
    }
  }, [getPlainText, handleInputChange, showFilePicker, fetchFiles]);

  // Create file chip element
  const createChipElement = (ref: FileReference): HTMLSpanElement => {
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset.refId = ref.id;
    chip.dataset.displayName = ref.displayName;
    chip.className = `inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded text-sm ${getChipColorClass(ref)}`;

    const icon = document.createElement('span');
    icon.textContent = getFileIcon(ref);

    const name = document.createElement('span');
    name.textContent = ref.displayName;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ml-1 hover:text-red-500 font-bold';
    removeBtn.textContent = '×';
    removeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      chip.remove();
      setFileReferences((prev) => {
        const next = new Map(prev);
        next.delete(ref.id);
        return next;
      });
      // Update parent input
      const text = getPlainText();
      const syntheticEvent = {
        target: { value: text },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      handleInputChange(syntheticEvent);
    };

    chip.appendChild(icon);
    chip.appendChild(name);
    chip.appendChild(removeBtn);

    return chip;
  };

  // Select a file/directory from the picker
  const selectFile = async (file: FileInfo) => {
    try {
      setFileError(null);

      let fileData: {
        content?: string;
        absolutePath: string;
        isBinary?: boolean;
        isPdf?: boolean;
        files?: { path: string; name: string; size: number }[];
      };

      if (file.isDirectory) {
        // Fetch directory contents
        const res = await fetch(`/api/files/directory/${encodeURIComponent(file.path)}`);
        const data = await res.json();

        if (!data.isSelectable) {
          setFileError(data.error || `Directory has too many files (max 100)`);
          setTimeout(() => setFileError(null), 5000);
          setShowFilePicker(false);
          return;
        }

        fileData = {
          absolutePath: data.absolutePath,
          files: data.files,
        };
      } else {
        // Fetch file content
        const res = await fetch(`/api/files/${encodeURIComponent(file.path)}`);
        const data = await res.json();

        if (data.fileTooLarge || res.status === 413) {
          setFileError(data.error || 'File too large (max 100MB)');
          setTimeout(() => setFileError(null), 5000);
          setShowFilePicker(false);
          return;
        }

        if (data.error) {
          setFileError(data.error);
          setTimeout(() => setFileError(null), 5000);
          setShowFilePicker(false);
          return;
        }

        fileData = {
          content: data.content,
          absolutePath: data.absolutePath,
          isBinary: data.isBinary,
          isPdf: data.isPdf,
        };
      }

      // Create file reference
      const ref: FileReference = {
        id: generateRefId(),
        type: file.isDirectory ? 'directory' : 'file',
        path: file.path,
        absolutePath: fileData.absolutePath,
        displayName: file.isDirectory ? `${file.name}/` : file.name,
        size: file.size,
        fileCount: file.fileCount,
        isBinary: fileData.isBinary,
        isPdf: fileData.isPdf,
      };

      // Update references
      setFileReferences((prev) => {
        const next = new Map(prev);
        next.set(ref.id, ref);
        return next;
      });

      // Insert chip into editor
      if (mentionRangeRef.current && editorRef.current) {
        const chip = createChipElement(ref);

        // Delete the @query text
        mentionRangeRef.current.deleteContents();

        // Insert chip
        mentionRangeRef.current.insertNode(chip);

        // Add space after chip and move cursor
        const space = document.createTextNode(' ');
        chip.after(space);

        // Move cursor after space
        const selection = window.getSelection();
        if (selection) {
          const newRange = document.createRange();
          newRange.setStartAfter(space);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }

        // Update parent input
        const text = getPlainText();
        const syntheticEvent = {
          target: { value: text },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        handleInputChange(syntheticEvent);
      }
    } catch (error) {
      console.error('Failed to load file:', error);
      setFileError('Failed to load file');
      setTimeout(() => setFileError(null), 5000);
    }

    setShowFilePicker(false);
    setSearchQuery('');
    mentionRangeRef.current = null;
  };

  // Helper to detect file type from name
  const getFileType = (fileName: string): 'text' | 'image' | 'pdf' | 'markdown' | 'binary' => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'md' || ext === 'markdown') return 'markdown';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
    if (['zip', 'tar', 'gz', 'rar', '7z', 'exe', 'dll', 'so', 'dylib', 'bin'].includes(ext)) return 'binary';
    return 'text';
  };

  // Open file preview
  const openPreview = async (file: FileInfo) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewContent(null);

    if (file.isDirectory) {
      // For directories, show file list
      setPreviewType('directory');
      try {
        const res = await fetch(`/api/files/directory/${encodeURIComponent(file.path)}`);
        const data = await res.json();
        if (data.error) {
          setPreviewError(data.error);
        } else {
          const fileList =
            data.files
              ?.map((f: { name: string; size: number }) => `${f.name} (${(f.size / 1024).toFixed(1)}KB)`)
              .join('\n') || 'Empty directory';
          setPreviewContent(`${data.files?.length || 0} files\n\n${fileList}`);
        }
      } catch {
        setPreviewError('Failed to load directory');
      }
    } else {
      const fileType = getFileType(file.name);

      if (fileType === 'image') {
        // For images, use raw API endpoint
        setPreviewType('image');
        setPreviewContent(`/api/files/${encodeURIComponent(file.path)}?raw=true`);
      } else if (fileType === 'pdf') {
        // For PDFs, use raw API endpoint
        setPreviewType('pdf');
        setPreviewContent(`/api/files/${encodeURIComponent(file.path)}?raw=true`);
      } else if (fileType === 'binary') {
        // Binary files cannot be previewed
        setPreviewType('text');
        setPreviewContent('[Binary file - cannot preview]');
      } else if (fileType === 'markdown') {
        // For markdown files, fetch content and render
        setPreviewType('markdown');
        try {
          const res = await fetch(`/api/files/${encodeURIComponent(file.path)}`);
          const data = await res.json();
          if (data.error) {
            setPreviewError(data.error);
          } else {
            setPreviewContent(data.content || '');
          }
        } catch {
          setPreviewError('Failed to load file');
        }
      } else {
        // For text files, fetch content
        setPreviewType('text');
        try {
          const res = await fetch(`/api/files/${encodeURIComponent(file.path)}`);
          const data = await res.json();
          if (data.error) {
            setPreviewError(data.error);
          } else if (data.isBinary) {
            setPreviewContent('[Binary file - cannot preview]');
          } else {
            setPreviewContent(data.content || '');
          }
        } catch {
          setPreviewError('Failed to load file');
        }
      }
    }
    setPreviewLoading(false);
  };

  // Close preview modal
  const closePreview = () => {
    setPreviewFile(null);
    setPreviewContent(null);
    setPreviewType('text');
    setPreviewError(null);
    // Restore focus to editor
    editorRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (showFilePicker) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (filteredFiles[selectedIndex] && !previewFile) {
          openPreview(filteredFiles[selectedIndex]);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (previewFile) {
          closePreview();
        }
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (previewFile) {
          selectFile(previewFile);
          closePreview();
        } else if (filteredFiles[selectedIndex]) {
          selectFile(filteredFiles[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (previewFile) {
          closePreview();
        } else {
          setShowFilePicker(false);
          setSearchQuery('');
          mentionRangeRef.current = null;
        }
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (formRef.current && (input.trim() || fileReferences.size > 0)) {
        formRef.current.requestSubmit();
      }
    }
  };

  // Handle form submission
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Build message content with file references
    const refs = Array.from(fileReferences.values());

    // Pass to parent
    handleSubmit(e);

    // Clear editor and references
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setFileReferences(new Map());
  };

  // Handle paste to strip formatting
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className="border-t dark:border-gray-700 p-4">
      {/* File error display */}
      {fileError && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg text-sm">
          <span>⚠️</span>
          <span>{fileError}</span>
          <button type="button" onClick={() => setFileError(null)} className="ml-auto hover:text-red-500">
            &times;
          </button>
        </div>
      )}

      <div className="relative">
        <div className="flex gap-2">
          {/* Contenteditable input with inline chips */}
          <div
            ref={editorRef}
            contentEditable={!isLoading}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            data-placeholder="Message Claude Code... (@ to attach files/folders)"
            className={`flex-1 min-h-[40px] max-h-[200px] overflow-y-auto rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            } empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none`}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          />
          {/* Thinking toggle button */}
          <button
            type="button"
            onClick={() => onShowThinkingChange?.(!showThinking)}
            title={showThinking ? 'Hide agent thinking' : 'Show agent thinking'}
            className={`px-3 py-2 rounded-lg border transition-colors self-end ${
              showThinking
                ? 'bg-purple-100 dark:bg-purple-900 border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300'
                : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}>
            💭
          </button>
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors self-end"
              title="Stop generation (ESC)">
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() && fileReferences.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end">
              <span>Send</span>
            </button>
          )}
        </div>

        {/* File picker dropdown */}
        {showFilePicker && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full left-0 mb-2 w-96 max-h-72 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg z-50">
            <div className="p-2 border-b dark:border-gray-600 text-sm text-gray-500">
              Select a file or folder to attach
            </div>
            {filteredFiles.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">
                {files.length === 0 ? 'No files in data/files/' : 'No matching files'}
              </div>
            ) : (
              <ul>
                {filteredFiles.map((file, index) => {
                  // Calculate indent level based on path depth
                  const depth = file.path.split('/').length - 1;
                  const indentPx = depth * 16; // 16px per level

                  // Get icon based on file type
                  const getFileIcon = (f: FileInfo): string => {
                    if (f.isDirectory) return '📁';
                    const ext = f.name.split('.').pop()?.toLowerCase() || '';
                    // PDF
                    if (ext === 'pdf') return '📕';
                    // Images
                    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return '🖼️';
                    // Code files
                    if (
                      [
                        'js',
                        'ts',
                        'jsx',
                        'tsx',
                        'py',
                        'rb',
                        'go',
                        'rs',
                        'java',
                        'c',
                        'cpp',
                        'h',
                        'cs',
                        'php',
                        'swift',
                        'kt',
                      ].includes(ext)
                    )
                      return '💻';
                    // Data files
                    if (['json', 'yaml', 'yml', 'xml', 'csv', 'toml'].includes(ext)) return '📊';
                    // Markdown/Text
                    if (['md', 'txt', 'rtf'].includes(ext)) return '📝';
                    // Config files
                    if (['env', 'ini', 'conf', 'config'].includes(ext) || f.name.startsWith('.')) return '⚙️';
                    // Archive
                    if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return '📦';
                    // Video
                    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return '🎬';
                    // Audio
                    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return '🎵';
                    // Documents
                    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return '📄';
                    return '📄';
                  };

                  return (
                    <li
                      key={file.path}
                      onClick={() => file.isSelectable !== false && selectFile(file)}
                      className={`py-2 pr-3 flex items-center gap-2 ${
                        file.isSelectable === false
                          ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900'
                          : index === selectedIndex
                          ? 'bg-blue-100 dark:bg-blue-900 cursor-pointer'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                      }`}
                      style={{ paddingLeft: `${12 + indentPx}px` }}>
                      <span className="text-lg">{getFileIcon(file)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {file.name}
                          {file.isDirectory ? '/' : ''}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{file.path}</div>
                      </div>
                      <div className="text-xs text-gray-400 text-right">
                        {file.isDirectory ? (
                          file.isSelectable === false ? (
                            <span className="text-orange-500">⚠️ {file.fileCount}+ files</span>
                          ) : (
                            <span className="text-green-600">{file.fileCount} files</span>
                          )
                        ) : (
                          `${(file.size / 1024).toFixed(1)}KB`
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 mt-2">
        Enter to send, Shift+Enter for new line, @ to attach files/folders, → to preview, ESC to stop
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={closePreview}>
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[80vw] max-w-4xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {previewFile.isDirectory
                    ? '📁'
                    : previewType === 'image'
                    ? '🖼️'
                    : previewType === 'pdf'
                    ? '📕'
                    : previewType === 'markdown'
                    ? '📝'
                    : '📄'}
                </span>
                <div>
                  <h3 className="font-medium">{previewFile.name}</h3>
                  <p className="text-sm text-gray-500">{previewFile.path}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {previewFile.isDirectory
                    ? `${previewFile.fileCount || 0} files`
                    : `${(previewFile.size / 1024).toFixed(1)}KB`}
                </span>
                <button
                  onClick={closePreview}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Close (ESC or ←)">
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {previewLoading ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <span className="animate-pulse">Loading...</span>
                </div>
              ) : previewError ? (
                <div className="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded">{previewError}</div>
              ) : previewType === 'image' && previewContent ? (
                <div className="flex items-center justify-center h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewContent}
                    alt={previewFile?.name || 'Preview'}
                    className="max-w-full max-h-full object-contain"
                    onError={() => setPreviewError('Failed to load image')}
                  />
                </div>
              ) : previewType === 'pdf' && previewContent ? (
                <iframe
                  src={previewContent}
                  title={previewFile?.name || 'PDF Preview'}
                  className="w-full h-full min-h-[60vh] border-0"
                />
              ) : previewType === 'markdown' && previewContent ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewContent}</ReactMarkdown>
                </div>
              ) : previewType === 'directory' ? (
                <pre className="text-sm font-mono whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                  {previewContent}
                </pre>
              ) : (
                <pre className="text-sm font-mono whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                  {previewContent}
                </pre>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t dark:border-gray-700 flex justify-between items-center text-sm text-gray-500">
              <span>← で戻る, Enter で添付</span>
              <button
                onClick={() => {
                  if (previewFile) {
                    selectFile(previewFile);
                    closePreview();
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Attach
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
