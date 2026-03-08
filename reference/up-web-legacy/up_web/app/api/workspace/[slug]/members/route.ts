import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

// Type for user relation (could be object or array from Supabase)
interface UserData {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface InviterData {
  id: string;
  display_name: string | null;
}

interface MemberRecord {
  id: string;
  role: string;
  status: string;
  joined_at: string | null;
  email: string | null;
  invited_at: string | null;
  user_id: string | null;
  user: UserData | UserData[] | null;
  inviter: InviterData | InviterData[] | null;
}

// Helper to extract first item from potential array
function getFirst<T>(data: T | T[] | null): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

/**
 * GET /api/workspace/[slug]/members - Get workspace members
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace by slug
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user is a member of this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all members with user info (active members)
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select(`
        id,
        role,
        status,
        joined_at,
        email,
        invited_at,
        user_id,
        user:users!workspace_members_user_id_fkey (
          id,
          email,
          display_name,
          avatar_url
        ),
        inviter:users!workspace_members_invited_by_fkey (
          id,
          display_name
        )
      `)
      .eq('workspace_id', workspace.id)
      .order('joined_at', { ascending: true, nullsFirst: false });

    if (membersError) {
      console.error('Failed to fetch members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Transform members data
    const activeMembers = (members as MemberRecord[] | null)
      ?.filter(m => m.status === 'active' && m.user)
      .map(m => {
        const userData = getFirst(m.user);
        return {
          id: m.id,
          user_id: userData?.id || m.user_id,
          name: userData?.display_name || userData?.email?.split('@')[0] || 'Unknown',
          email: userData?.email || m.email,
          avatar_url: userData?.avatar_url,
          role: m.role,
          joined_at: m.joined_at,
        };
      }) || [];

    // Get pending invitations
    const pendingInvitations = (members as MemberRecord[] | null)
      ?.filter(m => m.status === 'invited')
      .map(m => {
        const inviterData = getFirst(m.inviter);
        return {
          id: m.id,
          email: m.email,
          role: m.role,
          inviter_name: inviterData?.display_name || 'Unknown',
          invited_at: m.invited_at,
          // Add 7 days to invited_at for expiration
          expires_at: m.invited_at
            ? new Date(new Date(m.invited_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : null,
        };
      }) || [];

    return NextResponse.json({
      members: activeMembers,
      invitations: pendingInvitations,
      currentUserRole: membership.role,
      currentUserId: user.id,
    });
  } catch (error) {
    console.error('Members GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/workspace/[slug]/members - Update member role
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json({ error: 'Missing memberId or role' }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin or member' }, { status: 400 });
    }

    // Get workspace by slug
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if current user is owner or admin of this workspace
    const { data: currentMembership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !currentMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only owners and admins can change roles
    if (!['owner', 'admin'].includes(currentMembership.role)) {
      return NextResponse.json({ error: 'Only owners and admins can change member roles' }, { status: 403 });
    }

    // Get target member
    const { data: targetMember, error: targetError } = await supabase
      .from('workspace_members')
      .select('id, role, user_id')
      .eq('id', memberId)
      .eq('workspace_id', workspace.id)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot change own role
    if (targetMember.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 });
    }

    // Update role
    const { error: updateError } = await supabase
      .from('workspace_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('workspace_id', workspace.id);

    if (updateError) {
      console.error('Failed to update member role:', updateError);
      return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
    }

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error('Members PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/workspace/[slug]/members - Remove member from workspace
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    // Get workspace by slug
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if current user is owner or admin of this workspace
    const { data: currentMembership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !currentMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only owners and admins can remove members
    if (!['owner', 'admin'].includes(currentMembership.role)) {
      return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 });
    }

    // Get target member
    const { data: targetMember, error: targetError } = await supabase
      .from('workspace_members')
      .select('id, role, user_id')
      .eq('id', memberId)
      .eq('workspace_id', workspace.id)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove yourself
    if (targetMember.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 403 });
    }

    // Delete member
    const { error: deleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId)
      .eq('workspace_id', workspace.id);

    if (deleteError) {
      console.error('Failed to delete member:', deleteError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Members DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
