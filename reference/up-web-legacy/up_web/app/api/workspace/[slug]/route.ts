import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * GET /api/workspace/[slug] - Get workspace details
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

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name, slug, description, logo_url, website_url')
      .eq('slug', slug)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check membership
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ workspace, role: membership.role });
  } catch (error) {
    console.error('Workspace GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
