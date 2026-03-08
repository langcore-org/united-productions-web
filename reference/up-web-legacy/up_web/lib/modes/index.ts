// Types
export type { AgentMode, DriveFileRef, SystemPromptContext } from './types';

// Common instructions
export { CORE_RULES } from './common/core-rules';
export { GOOGLE_DRIVE_MCP_INSTRUCTIONS } from './common/google-drive';
export { INFOGRAPHIC_INSTRUCTIONS } from './common/infographic';

// Individual mode prompts
export { defaultMode } from './prompts/default';
export { deepResearchMode } from './prompts/deep-research';
export { netaResearcherMode } from './prompts/neta-researcher';
export { koseiWriterMode } from './prompts/kosei-writer';

// Import for internal use
import type { AgentMode, DriveFileRef, SystemPromptContext } from './types';
import { CORE_RULES } from './common/core-rules';
import { GOOGLE_DRIVE_MCP_INSTRUCTIONS } from './common/google-drive';
import { INFOGRAPHIC_INSTRUCTIONS } from './common/infographic';
import { defaultMode } from './prompts/default';
import { deepResearchMode } from './prompts/deep-research';
import { netaResearcherMode } from './prompts/neta-researcher';
import { koseiWriterMode } from './prompts/kosei-writer';

/**
 * All available agent modes
 */
export const AGENT_MODES: AgentMode[] = [
  defaultMode,
  deepResearchMode,
  netaResearcherMode,
  koseiWriterMode,
];

/**
 * Get mode by ID
 */
export function getModeById(id: string): AgentMode | undefined {
  return AGENT_MODES.find((mode) => mode.id === id);
}

/**
 * Get default mode
 */
export function getDefaultMode(): AgentMode {
  return AGENT_MODES[0];
}

/**
 * Generate system prompt with context variables
 *
 * Combines in order:
 * 1. CORE_RULES (critical safety rules - no local file editing, task list required)
 * 2. Mode-specific prompt
 * 3. File references (if any)
 * 4. GOOGLE_DRIVE_MCP_INSTRUCTIONS
 * 5. INFOGRAPHIC_INSTRUCTIONS
 */
export function generateSystemPrompt(
  mode: AgentMode,
  context: SystemPromptContext
): string {
  // Build file reference section if files are provided
  let fileReferenceSection = '';
  if (context.files && context.files.length > 0) {
    fileReferenceSection = `

### 利用可能なファイル
以下のファイルがメッセージで参照されています:
${context.files.map((f: DriveFileRef) => `- ${f.name} (${f.mimeType}) [file_id: ${f.fileId}]`).join('\n')}
`;
  }

  // Replace placeholders in common instructions
  const driveInstructions = GOOGLE_DRIVE_MCP_INSTRUCTIONS
    .replace(/\{\{workspace_id\}\}/g, context.workspaceId)
    .replace(/\{\{output_folder_id\}\}/g, context.outputFolderId);

  // Combine all sections:
  // 1. Core rules (CRITICAL - always first)
  // 2. Mode-specific prompt
  // 3. File references
  // 4. Google Drive instructions
  // 5. Infographic instructions
  const combinedPrompt = [
    CORE_RULES,
    mode.systemPrompt,
    fileReferenceSection,
    driveInstructions,
    INFOGRAPHIC_INSTRUCTIONS,
  ].filter(Boolean).join('\n');

  return combinedPrompt;
}
