import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import type { InvitationLinkResult } from '@/lib/types/database';

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

// Invitation expiration (7 days)
const INVITATION_EXPIRY_DAYS = 7;

/**
 * POST /api/workspace/[slug]/members/[id]/resend
 * Resend invitation with a new token
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { slug, id } = await context.params;
    const supabase = await createClient();

    // 1. Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get workspace by slug
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // 3. Check permission (only owner/admin can resend)
    const { data: currentMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single();

    if (!currentMembership || !['owner', 'admin'].includes(currentMembership.role)) {
      return NextResponse.json({ error: 'Only owners and admins can resend invitations' }, { status: 403 });
    }

    // 4. Get existing invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('workspace_members')
      .select('id, status, email')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .eq('status', 'invited')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found or already accepted' }, { status: 404 });
    }

    // 5. Generate new token and expiration
    const newToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    // 6. Update invitation with new token
    const { data: updated, error: updateError } = await supabase
      .from('workspace_members')
      .update({
        invitation_token: newToken,
        invitation_expires_at: expiresAt.toISOString(),
        invited_at: new Date().toISOString(),
        invited_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, invitation_token, invitation_expires_at')
      .single();

    if (updateError || !updated) {
      console.error('Failed to resend invitation:', updateError);
      return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 });
    }

    // 7. Generate new invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const invitationUrl = `${baseUrl}/invitations/${newToken}`;

    const result: InvitationLinkResult = {
      invitation_id: updated.id,
      invitation_token: updated.invitation_token,
      invitation_url: invitationUrl,
      expires_at: updated.invitation_expires_at,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Resend invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
