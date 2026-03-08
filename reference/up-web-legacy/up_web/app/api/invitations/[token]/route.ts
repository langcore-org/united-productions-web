import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { InvitationDetails } from '@/lib/types/database';

type RouteContext = {
  params: Promise<{ token: string }>;
};

// Helper to extract first item from potential array
function getFirst<T>(data: T | T[] | null): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
}

interface InviterData {
  display_name: string | null;
}

interface InvitationRecord {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  status: string;
  invited_at: string;
  invitation_expires_at: string;
  workspace: WorkspaceData | WorkspaceData[] | null;
  inviter: InviterData | InviterData[] | null;
}

/**
 * GET /api/invitations/[token]
 * Get invitation details by token (public endpoint for invitation page)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;
    const supabase = await createClient();

    // Validate token format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 });
    }

    // Fetch invitation by token
    const { data: invitation, error } = await supabase
      .from('workspace_members')
      .select(`
        id,
        workspace_id,
        email,
        role,
        status,
        invited_at,
        invitation_expires_at,
        workspace:workspaces!workspace_members_workspace_id_fkey (
          id,
          name,
          slug
        ),
        inviter:users!workspace_members_invited_by_fkey (
          display_name
        )
      `)
      .eq('invitation_token', token)
      .eq('status', 'invited')
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 });
    }

    const record = invitation as InvitationRecord;

    // Check expiration
    const isExpired = new Date(record.invitation_expires_at) < new Date();
    if (isExpired) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    // Extract workspace and inviter data
    const workspace = getFirst(record.workspace);
    const inviter = getFirst(record.inviter);

    const result: InvitationDetails = {
      id: record.id,
      workspace_id: record.workspace_id,
      workspace_name: workspace?.name || 'Unknown Workspace',
      workspace_slug: workspace?.slug || '',
      email: record.email,
      role: record.role as InvitationDetails['role'],
      inviter_name: inviter?.display_name || null,
      invited_at: record.invited_at,
      expires_at: record.invitation_expires_at,
      is_expired: isExpired,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Get invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
