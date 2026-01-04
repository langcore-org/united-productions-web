import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ slug: string; id: string }>;
};

/**
 * DELETE /api/workspace/[slug]/members/[id]/revoke
 * Revoke (cancel) a pending invitation
 */
export async function DELETE(
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

    // 3. Check permission (only owner/admin can revoke)
    const { data: currentMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single();

    if (!currentMembership || !['owner', 'admin'].includes(currentMembership.role)) {
      return NextResponse.json({ error: 'Only owners and admins can revoke invitations' }, { status: 403 });
    }

    // 4. Get existing invitation to verify it exists and is pending
    const { data: invitation, error: invitationError } = await supabase
      .from('workspace_members')
      .select('id, status')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .eq('status', 'invited')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found or already accepted' }, { status: 404 });
    }

    // 5. Delete the invitation
    const { error: deleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .eq('status', 'invited');

    if (deleteError) {
      console.error('Failed to revoke invitation:', deleteError);
      return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Revoke invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
