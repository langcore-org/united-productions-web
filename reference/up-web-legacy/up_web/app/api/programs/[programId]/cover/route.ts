import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ programId: string }>;
};

/**
 * POST /api/programs/[programId]/cover - Upload program cover image
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { programId } = await context.params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get program and its workspace
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id, workspace_id')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Check if user has access to this program's workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', program.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user is admin or program member with appropriate role
    const isWorkspaceAdmin = ['admin', 'owner'].includes(membership.role);

    if (!isWorkspaceAdmin) {
      // Check program membership
      const { data: programMembership, error: pmError } = await supabase
        .from('program_members')
        .select('role')
        .eq('program_id', programId)
        .eq('user_id', user.id)
        .single();

      if (pmError || !programMembership || !['admin', 'lead'].includes(programMembership.role)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
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

    // Validate file size (10MB for program covers)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Generate unique file path with UUID
    const ext = file.type.split('/')[1] || 'png';
    const fileId = crypto.randomUUID();
    const filePath = `${programId}/${fileId}.${ext}`;

    // Convert File to ArrayBuffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('program-covers')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 });
    }

    // Store relative path (without domain) for portability
    const coverUrl = `/storage/v1/object/public/program-covers/${filePath}`;

    // Update program cover_image_url
    const { error: updateError } = await supabase
      .from('programs')
      .update({ cover_image_url: coverUrl })
      .eq('id', programId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update program' }, { status: 500 });
    }

    return NextResponse.json({ cover_image_url: coverUrl });
  } catch (error) {
    console.error('Cover upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/programs/[programId]/cover - Delete program cover image
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { programId } = await context.params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get program and its workspace
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id, workspace_id, cover_image_url')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Check if user has admin access
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', program.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const isWorkspaceAdmin = ['admin', 'owner'].includes(membership.role);

    if (!isWorkspaceAdmin) {
      const { data: programMembership, error: pmError } = await supabase
        .from('program_members')
        .select('role')
        .eq('program_id', programId)
        .eq('user_id', user.id)
        .single();

      if (pmError || !programMembership || !['admin', 'lead'].includes(programMembership.role)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    // Delete file from storage if exists
    if (program.cover_image_url) {
      const filePath = `${programId}/cover.png`;
      await supabase.storage.from('program-covers').remove([filePath]);
    }

    // Update program cover_image_url to null
    const { error: updateError } = await supabase
      .from('programs')
      .update({ cover_image_url: null })
      .eq('id', programId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update program' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cover delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
