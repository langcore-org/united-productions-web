import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/workspace - Create a new workspace
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, slug, description } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // Validate slug format
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    if (slug.length < 3 || slug.length > 30) {
      return NextResponse.json(
        { error: 'Slug must be between 3 and 30 characters' },
        { status: 400 }
      );
    }

    // Use service role client for workspace creation (bypasses RLS)
    const serviceClient = await createServiceRoleClient();

    // Check if slug already exists
    const { data: existingWorkspace } = await serviceClient
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingWorkspace) {
      return NextResponse.json(
        { error: 'A workspace with this slug already exists' },
        { status: 409 }
      );
    }

    // Create workspace
    const { data: workspace, error: createError } = await serviceClient
      .from('workspaces')
      .insert({
        name: name.trim(),
        slug: slug.trim(),
        description: description?.trim() || null,
      })
      .select('id, name, slug, description')
      .single();

    if (createError) {
      console.error('Workspace creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      );
    }

    // Add creator as owner
    const { error: memberError } = await serviceClient
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('Member creation error:', memberError);
      // Rollback: delete the workspace
      await serviceClient.from('workspaces').delete().eq('id', workspace.id);
      return NextResponse.json(
        { error: 'Failed to set up workspace membership' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error('Workspace POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
