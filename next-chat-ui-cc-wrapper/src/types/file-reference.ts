// File reference types for inline file selector

export interface FileReference {
  id: string;              // Unique ID (uuid)
  type: 'file' | 'directory';
  path: string;            // Relative path from data/files
  absolutePath: string;    // Absolute path
  displayName: string;     // Display name (filename or dirname/)
  size?: number;           // Byte size (for files)
  fileCount?: number;      // File count (for directories)
  isBinary?: boolean;      // Is binary file
  isPdf?: boolean;         // Is PDF file
}

export interface InputSegment {
  type: 'text' | 'reference';
  content: string;         // Text content or reference ID
}

export interface InputState {
  segments: InputSegment[];
  references: Map<string, FileReference>;
}

// Helper to generate unique IDs
export function generateRefId(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get icon for file type
export function getFileIcon(ref: FileReference): string {
  if (ref.type === 'directory') return '📁';
  if (ref.isPdf) return '📕';
  if (ref.isBinary) return '🖼️';
  return '📄';
}

// Get chip color class for file type
export function getChipColorClass(ref: FileReference): string {
  if (ref.type === 'directory') {
    return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
  }
  if (ref.isPdf) {
    return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
  }
  if (ref.isBinary) {
    return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
  }
  return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
}
