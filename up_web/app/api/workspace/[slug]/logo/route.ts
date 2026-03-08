import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * POST /api/workspace/[slug]/logo - Upload workspace logo
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;
    const supabase = await createClient();

    // Check authentication
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

    // Check if user has admin role in this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only admin and owner can change logo
    if (!['admin', 'owner'].includes(membership.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Generate unique file path with UUID
    const ext = file.type.split('/')[1] || 'png';
    const fileId = crypto.randomUUID();
    const filePath = `${workspace.id}/${fileId}.${ext}`;

    // Convert File to ArrayBuffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('workspace-logos')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 });
    }

    // Store relative path (without domain) for portability
    const logoUrl = `/storage/v1/object/public/workspace-logos/${filePath}`;

    // Update workspace logo_url
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ logo_url: logoUrl })
      .eq('id', workspace.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
    }

    return NextResponse.json({ logo_url: logoUrl });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/workspace/[slug]/logo - Delete workspace logo
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace by slug
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, logo_url')
      .eq('slug', slug)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user has admin role
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership || !['admin', 'owner'].includes(membership.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Delete file from storage if exists
    if (workspace.logo_url) {
      const filePath = `${workspace.id}/logo.png`;
      await supabase.storage.from('workspace-logos').remove([filePath]);
    }

    // Update workspace logo_url to null
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ logo_url: null })
      .eq('id', workspace.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logo delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
