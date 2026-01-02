import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Todo {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

/**
 * GET /api/sessions/[sessionId]/todos
 * Get all todos for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get todos for session
    const { data: todos, error } = await supabase
      .from("session_todos")
      .select("id, content, status, active_form, sort_order")
      .eq("session_id", sessionId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[sessions/todos] Error fetching todos:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to frontend format
    const formattedTodos = (todos || []).map((todo, index) => ({
      id: todo.id,
      content: todo.content,
      status: todo.status,
      activeForm: todo.active_form,
      sortOrder: todo.sort_order ?? index,
    }));

    return NextResponse.json({ todos: formattedTodos });
  } catch (error) {
    console.error("[sessions/todos] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sessions/[sessionId]/todos
 * Replace all todos for a session (bulk update)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const todos: Todo[] = body.todos || [];

    // Delete existing todos for this session
    const { error: deleteError } = await supabase
      .from("session_todos")
      .delete()
      .eq("session_id", sessionId);

    if (deleteError) {
      console.error("[sessions/todos] Error deleting todos:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Insert new todos if any
    if (todos.length > 0) {
      const todosToInsert = todos.map((todo, index) => ({
        session_id: sessionId,
        content: todo.content,
        status: todo.status,
        active_form: todo.activeForm,
        sort_order: index,
      }));

      const { error: insertError } = await supabase
        .from("session_todos")
        .insert(todosToInsert);

      if (insertError) {
        console.error("[sessions/todos] Error inserting todos:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, count: todos.length });
  } catch (error) {
    console.error("[sessions/todos] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
