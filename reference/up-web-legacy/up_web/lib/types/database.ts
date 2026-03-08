/**
 * Database types for T-Agent
 * Generated from Supabase schema
 */

// ===========================================
// ENUM Types
// ===========================================

export type AuthProvider = 'email' | 'google' | 'azure' | 'github';
export type NotificationFrequency = 'realtime' | 'hourly' | 'daily' | 'never';
export type WorkspaceRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'active' | 'inactive' | 'invited';
export type ProgramStatus = 'active' | 'archived' | 'completed';
export type AgentType = 'research' | 'idea_finder' | 'planning' | 'structure' | 'custom';
export type MessageRole = 'user' | 'assistant' | 'system';
export type SessionStatus = 'active' | 'archived' | 'deleted';
export type FileRefType = 'file' | 'folder';
export type OutputStatus = 'draft' | 'exported' | 'deleted';

// ===========================================
// Core Types
// ===========================================

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_system_admin: boolean;
  auth_provider: AuthProvider;
  auth_provider_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  darkmode: string;
  theme: string;
  email_notifications: boolean;
  push_notifications: boolean;
  notification_frequency: NotificationFrequency;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  google_drive_connected: boolean;
  google_refresh_token: string | null;
  google_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string | null;
  email: string | null;
  invited_by: string | null;
  invited_at: string | null;
  role: WorkspaceRole;
  status: MemberStatus;
  joined_at: string | null;
  // Invitation token fields (added 2026-01-03)
  invitation_token: string | null;
  invitation_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: ProgramStatus;
  google_drive_root_id: string | null;
  google_drive_root_name: string | null;
  google_drive_root_url: string | null;
  cover_image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  program_id: string;
  name: string;
  description: string | null;
  agent_type: AgentType;
  system_prompt: string | null;
  output_format_template: string | null;
  output_directory_id: string | null;
  output_directory_name: string | null;
  output_directory_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamFileRef {
  id: string;
  team_id: string;
  ref_type: FileRefType;
  drive_id: string;
  drive_name: string;
  drive_path: string | null;
  drive_url: string | null;
  mime_type: string | null;
  include_subfolders: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  team_id: string;
  title: string | null;
  status: SessionStatus;
  claude_session_id: string | null;
  message_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  file_attachments: unknown[];
  tool_calls: unknown[];
  model: string | null;
  token_usage: unknown | null;
  created_at: string;
}

export interface SessionOutput {
  id: string;
  session_id: string;
  message_id: string | null;
  title: string;
  content: string;
  status: OutputStatus;
  exported_drive_id: string | null;
  exported_drive_url: string | null;
  exported_at: string | null;
  output_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriveFileCache {
  id: string;
  workspace_id: string;
  drive_id: string;
  parent_id: string | null;
  name: string;
  mime_type: string;
  is_folder: boolean;
  size_bytes: number | null;
  web_view_link: string | null;
  icon_link: string | null;
  content_hash: string | null;
  content_cached_at: string | null;
  drive_modified_at: string | null;
  synced_at: string;
}

// ===========================================
// Extended Types with Relations
// ===========================================

export interface WorkspaceMemberWithUser extends WorkspaceMember {
  user?: User | null;
  inviter?: User | null;
}

export interface WorkspaceWithMembers extends Workspace {
  members?: WorkspaceMemberWithUser[];
  member_count?: number;
  program_count?: number;
}

export interface ProgramWithTeams extends Program {
  teams?: Team[];
  team_count?: number;
  session_count?: number;
}

export interface TeamWithProgram extends Team {
  program?: Program;
  file_refs?: TeamFileRef[];
  session_count?: number;
}

// ===========================================
// Form Types
// ===========================================

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  description?: string;
  website_url?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  website_url?: string;
}

export interface CreateProgramInput {
  name: string;
  description?: string;
  status?: ProgramStatus;
  google_drive_root_id?: string;
  google_drive_root_name?: string;
  google_drive_root_url?: string;
  cover_image_url?: string;
  start_date?: string;
  end_date?: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  agent_type: AgentType;
  system_prompt?: string;
  output_format_template?: string;
  output_directory_id?: string;
  output_directory_name?: string;
  output_directory_url?: string;
  file_refs?: {
    ref_type: FileRefType;
    drive_id: string;
    drive_name: string;
    include_subfolders: boolean;
  }[];
}

export interface InviteMemberInput {
  email: string;
  role: WorkspaceRole;
  message?: string;
}

export interface UpdateProfileInput {
  display_name?: string;
  avatar_url?: string;
}

export interface UpdateSettingsInput {
  darkmode?: string;
  theme?: string;
  email_notifications?: boolean;
  push_notifications?: boolean;
  notification_frequency?: NotificationFrequency;
}

// ===========================================
// Invitation Types (added 2026-01-03)
// ===========================================

/**
 * Input for creating a workspace invitation
 * Note: 'owner' role cannot be invited, only assigned during workspace creation
 */
export interface CreateInvitationInput {
  email: string;
  role: Exclude<WorkspaceRole, 'owner'>;
}

/**
 * Detailed invitation information returned when validating an invitation token
 */
export interface InvitationDetails {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  email: string;
  role: WorkspaceRole;
  inviter_name: string | null;
  invited_at: string;
  expires_at: string;
  is_expired: boolean;
}

/**
 * Result returned after successfully creating an invitation
 */
export interface InvitationLinkResult {
  invitation_id: string;
  invitation_token: string;
  invitation_url: string;
  expires_at: string;
}

/**
 * Result returned after accepting an invitation
 */
export interface InvitationAcceptResult {
  success: boolean;
  workspace_slug: string;
  email_mismatch: boolean;
  message: string;
}
