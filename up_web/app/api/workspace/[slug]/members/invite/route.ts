import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import type { InvitationLinkResult } from '@/lib/types/database';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Invitation expiration (7 days)
const INVITATION_EXPIRY_DAYS = 7;

/**
 * POST /api/workspace/[slug]/members/invite
 * Create a new workspace invitation and return the invitation link
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;
    const supabase = await createClient();

    // 1. Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { email, role } = body;

    // 3. Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // 4. Validate role
    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin or member' }, { status: 400 });
    }

    // 5. Get workspace by slug
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // 6. Check permission (only owner/admin can invite)
    const { data: currentMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single();

    if (!currentMembership || !['owner', 'admin'].includes(currentMembership.role)) {
      return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 });
    }

    // 7. Check for existing member with this email
    // First check if there's a user with this email who's already a member
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      const { data: existingMembership } = await supabase
        .from('workspace_members')
        .select('id, status')
        .eq('workspace_id', workspace.id)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMembership) {
        if (existingMembership.status === 'active') {
          return NextResponse.json({ error: 'User is already a member of this workspace' }, { status: 409 });
        }
      }
    }

    // 8. Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('workspace_members')
      .select('id, status')
      .eq('workspace_id', workspace.id)
      .eq('email', normalizedEmail)
      .eq('status', 'invited')
      .single();

    if (existingInvitation) {
      return NextResponse.json({ error: 'Pending invitation already exists for this email' }, { status: 409 });
    }

    // 9. Generate invitation token and expiration
    const invitationToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    // 10. Create invitation record
    const { data: invitation, error: insertError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        email: normalizedEmail,
        role,
        status: 'invited',
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        invitation_token: invitationToken,
        invitation_expires_at: expiresAt.toISOString(),
      })
      .select('id, invitation_token, invitation_expires_at')
      .single();

    if (insertError) {
      console.error('Failed to create invitation:', insertError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // 11. Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const invitationUrl = `${baseUrl}/invitations/${invitationToken}`;

    const result: InvitationLinkResult = {
      invitation_id: invitation.id,
      invitation_token: invitation.invitation_token,
      invitation_url: invitationUrl,
      expires_at: invitation.invitation_expires_at,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
