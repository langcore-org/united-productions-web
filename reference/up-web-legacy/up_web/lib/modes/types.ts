/**
 * Agent mode definition
 */
export interface AgentMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
}

/**
 * Google Drive file reference passed from frontend
 */
export interface DriveFileRef {
  name: string;
  mimeType: string;
  fileId: string;
}

/**
 * Context variables for system prompt generation
 */
export interface SystemPromptContext {
  workspaceId: string;
  outputFolderId: string;
  files?: DriveFileRef[];
}
