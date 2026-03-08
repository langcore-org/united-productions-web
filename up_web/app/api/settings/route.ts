import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UserSettings, DarkMode, ThemePreset, NotificationFrequency } from '@/lib/settings/types';

const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  darkmode: 'system',
  theme: 'default',
  email_notifications: true,
  push_notifications: true,
  notification_frequency: 'realtime',
};

/**
 * GET /api/settings - Get user settings
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get existing settings
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // If no settings exist, create default settings
    if (!settings) {
      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          ...DEFAULT_SETTINGS,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create default settings:', insertError);
        return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
      }

      return NextResponse.json(newSettings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/settings - Update user settings
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate incoming data
    const updates: Partial<UserSettings> = {};

    if (body.darkmode && ['light', 'dark', 'system'].includes(body.darkmode)) {
      updates.darkmode = body.darkmode as DarkMode;
    }

    if (body.theme && ['default', 'ocean', 'sunset', 'forest', 'lavender', 'rose', 'slate', 'amber'].includes(body.theme)) {
      updates.theme = body.theme as ThemePreset;
    }

    if (typeof body.email_notifications === 'boolean') {
      updates.email_notifications = body.email_notifications;
    }

    if (typeof body.push_notifications === 'boolean') {
      updates.push_notifications = body.push_notifications;
    }

    if (body.notification_frequency && ['realtime', 'daily', 'none'].includes(body.notification_frequency)) {
      updates.notification_frequency = body.notification_frequency as NotificationFrequency;
    }

    // Update settings
    const { data: settings, error } = await supabase
      .from('user_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      // If no row found, create new settings
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            ...DEFAULT_SETTINGS,
            ...updates,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create settings:', insertError);
          return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
        }

        return NextResponse.json(newSettings);
      }

      console.error('Failed to update settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
