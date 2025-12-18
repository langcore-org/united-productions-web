import { NextResponse } from 'next/server';
import { saveTodos, TodoItem } from '@/lib/db';

// POST /api/sessions/[id]/todos - Save todos for session
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { todos } = await req.json();

  if (!Array.isArray(todos)) {
    return NextResponse.json({ error: 'todos must be an array' }, { status: 400 });
  }

  // Validate todo items
  for (const todo of todos) {
    if (!todo.content || !todo.status || !todo.activeForm) {
      return NextResponse.json(
        { error: 'Each todo must have content, status, and activeForm' },
        { status: 400 }
      );
    }
    if (!['pending', 'in_progress', 'completed'].includes(todo.status)) {
      return NextResponse.json(
        { error: 'Invalid todo status' },
        { status: 400 }
      );
    }
  }

  saveTodos(id, todos as TodoItem[]);
  return NextResponse.json({ success: true });
}
