import { NextResponse } from 'next/server';
import { getSession, updateSessionTitle, deleteSession, getGeneratedFiles, getTodos } from '@/lib/db';

// GET /api/sessions/[id] - Get session with messages and generated files
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = getSession(id);

  if (!result) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Include generated files and todos
  const generatedFiles = getGeneratedFiles(id);
  const todos = getTodos(id);

  return NextResponse.json({ ...result, generatedFiles, todos });
}

// PATCH /api/sessions/[id] - Update session title
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { title } = await req.json();

  if (!title) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  updateSessionTitle(id, title);
  return NextResponse.json({ success: true });
}

// DELETE /api/sessions/[id] - Delete session
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteSession(id);
  return NextResponse.json({ success: true });
}
