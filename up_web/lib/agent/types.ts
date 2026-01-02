/**
 * Agent API Type Definitions
 * Types for Claude Code Agent SSE streaming and session management
 */

// Session status matching agent/src/session_buffer.py
export type SessionStatus = 'idle' | 'running' | 'completed' | 'error' | 'stopped' | 'reconnecting';

// Todo item from todo_update events
export interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
}

// Upload status for generated files
export type FileUploadStatus = 'pending' | 'uploading' | 'completed' | 'error';

// Generated file from file_created events
export interface GeneratedFile {
  id: string;
  path: string;
  name: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
  // Google Drive upload info (added after upload)
  uploadStatus?: FileUploadStatus;
  uploadError?: string;
  driveId?: string;
  driveUrl?: string;
  // Database persistence ID
  dbId?: string;
}

// SSE Event types from agent
export type AgentEventType = 'content' | 'todo_update' | 'file_created' | 'gdrive_file_created' | 'done' | 'error';

// OpenAI-compatible streaming chunk
export interface StreamingChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Custom event types from agent
export interface TodoUpdateEvent {
  type: 'todo_update';
  todos: Todo[];
}

export interface FileCreatedEvent {
  type: 'file_created';
  path: string;
}

export interface GDriveFileCreatedEvent {
  type: 'gdrive_file_created';
  file_name: string;
  folder_id?: string;
  status: 'uploading' | 'completed' | 'error';
  drive_id?: string;      // Snake case from Agent
  web_view_link?: string; // Snake case from Agent
}

export interface ContentEvent {
  type: 'content';
  content: string;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
  code?: string;
}

export interface DoneEvent {
  type: 'done';
}

export type AgentEvent =
  | TodoUpdateEvent
  | FileCreatedEvent
  | GDriveFileCreatedEvent
  | ContentEvent
  | ErrorEvent
  | DoneEvent;

// Session state from /v1/sessions/{id}/status
export interface SessionState {
  session_id: string;
  status: SessionStatus;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  buffered_events_count: number;
}

// Buffered event from /v1/sessions/{id}/buffer
export interface BufferedEvent {
  id: number;
  type: AgentEventType | string;
  data?: unknown;
  created_at: string;
  // Flattened event-specific fields (agent may return them at top level)
  content?: string;
  todos?: Todo[];
  path?: string;
  message?: string;
}

export interface BufferedEventsResponse {
  events: BufferedEvent[];
  last_id: number;
  has_more: boolean;
}

// Request to agent
export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  stream: boolean;
  session_id?: string;
  enable_tools?: boolean;
  show_thinking?: boolean;
}

// Message type for internal use
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
