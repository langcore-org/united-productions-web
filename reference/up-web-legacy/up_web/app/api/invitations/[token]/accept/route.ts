import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { InvitationAcceptResult } from '@/lib/types/database';

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
  slug: string;
}

interface InvitationRecord {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  status: string;
  invitation_expires_at: string;
  workspace: WorkspaceData | WorkspaceData[] | null;
}

/**
 * POST /api/invitations/[token]/accept
 * Accept a workspace invitation
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;
    const supabase = await createClient();

    // 1. Authentication check (must be logged in to accept)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // Return redirect URL for the client to handle
      return NextResponse.json({
        error: 'Authentication required',
        redirect_url: `/auth/login?returnUrl=/invitations/${token}`
      }, { status: 401 });
    }

    // 2. Validate token format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 });
    }

    // 3. Fetch invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('workspace_members')
      .select(`
        id,
        workspace_id,
        email,
        role,
        status,
        invitation_expires_at,
        workspace:workspaces!workspace_members_workspace_id_fkey (
          slug
        )
      `)
      .eq('invitation_token', token)
      .eq('status', 'invited')
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 });
    }

    const record = invitation as InvitationRecord;

    // 4. Check expiration
    if (new Date(record.invitation_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    // 5. Check email match (warning only, don't block)
    const userEmail = user.email?.toLowerCase();
    const invitedEmail = record.email?.toLowerCase();
    const emailMismatch = userEmail !== invitedEmail;

    // 6. Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('workspace_members')
      .select('id, status')
      .eq('workspace_id', record.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (existingMembership && existingMembership.status === 'active') {
      return NextResponse.json({ error: 'You are already a member of this workspace' }, { status: 409 });
    }

    // 7. Accept invitation - update the record
    const { error: updateError } = await supabase
      .from('workspace_members')
      .update({
        user_id: user.id,
        status: 'active',
        joined_at: new Date().toISOString(),
        invitation_token: null, // Clear token after use
        invitation_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    if (updateError) {
      console.error('Failed to accept invitation:', updateError);
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
    }

    const workspace = getFirst(record.workspace);

    const result: InvitationAcceptResult = {
      success: true,
      workspace_slug: workspace?.slug || '',
      email_mismatch: emailMismatch,
      message: emailMismatch
        ? 'Invitation accepted. Note: The invitation was sent to a different email address.'
        : 'Invitation accepted successfully.',
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
