/**
 * Prompt Enhancement Types
 */

export interface EnhancePromptRequest {
  text: string;
  files: {
    id: string;
    name: string;
    mimeType: string;
  }[];
  workspaceId: string;
}

export interface EnhancePromptResponse {
  enhancedPrompt: string;
  originalLength: number;
  enhancedLength: number;
}
