import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/user/profile - Get current user profile
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile from users table
    const { data: profile, error } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url, created_at, updated_at')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Failed to fetch user profile:', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/user/profile - Update current user profile
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Build update object with only allowed fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.display_name === 'string') {
      updates.display_name = body.display_name.trim() || null;
    }

    // Update user profile
    const { data: profile, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select('id, email, display_name, avatar_url, created_at, updated_at')
      .single();

    if (error) {
      console.error('Failed to update user profile:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
