import { NextResponse } from 'next/server';
import { clearMessages } from '@/lib/db';

// DELETE /api/sessions/[id]/messages - Clear all messages for a session
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  clearMessages(id);
  return NextResponse.json({ success: true });
}
