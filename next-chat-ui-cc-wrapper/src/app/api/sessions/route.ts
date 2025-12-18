import { NextResponse } from 'next/server';
import { createSession, listSessions, deleteSession } from '@/lib/db';
import { randomUUID } from 'crypto';

// GET /api/sessions - List all sessions
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  const sessions = listSessions(limit, offset);
  return NextResponse.json({ sessions });
}

// POST /api/sessions - Create new session
export async function POST(req: Request) {
  const { title, mode, systemPrompt } = await req.json().catch(() => ({}));
  const id = randomUUID();
  const session = createSession(id, title, mode, systemPrompt);
  return NextResponse.json({ session });
}

// DELETE /api/sessions - Delete session by id (query param)
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  deleteSession(id);
  return NextResponse.json({ success: true });
}
