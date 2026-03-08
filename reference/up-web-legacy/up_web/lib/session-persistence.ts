/**
 * Session Persistence Library
 * Handles saving and loading session todos and generated files to/from the database
 */

import type { Todo, GeneratedFile } from "@/lib/agent/types";

/**
 * Save todos to database
 */
export async function saveTodos(sessionId: string, todos: Todo[]): Promise<boolean> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}/todos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todos }),
    });

    if (!response.ok) {
      console.error("[session-persistence] Failed to save todos:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("[session-persistence] Error saving todos:", error);
    return false;
  }
}

/**
 * Load todos from database
 */
export async function loadTodos(sessionId: string): Promise<Todo[]> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}/todos`);

    if (!response.ok) {
      console.error("[session-persistence] Failed to load todos:", await response.text());
      return [];
    }

    const data = await response.json();
    return data.todos || [];
  } catch (error) {
    console.error("[session-persistence] Error loading todos:", error);
    return [];
  }
}

/**
 * Save a generated file to database
 */
export async function saveGeneratedFile(
  sessionId: string,
  file: GeneratedFile
): Promise<string | null> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file }),
    });

    if (!response.ok) {
      console.error("[session-persistence] Failed to save file:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("[session-persistence] Error saving file:", error);
    return null;
  }
}

/**
 * Update a generated file in database (e.g., after Drive upload)
 */
export async function updateGeneratedFile(
  sessionId: string,
  fileId: string,
  updates: {
    driveId?: string;
    driveUrl?: string;
    uploadStatus?: "pending" | "uploading" | "completed" | "error";
  }
): Promise<boolean> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}/files`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId, ...updates }),
    });

    if (!response.ok) {
      console.error("[session-persistence] Failed to update file:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("[session-persistence] Error updating file:", error);
    return false;
  }
}

/**
 * Load generated files from database
 */
export async function loadGeneratedFiles(sessionId: string): Promise<GeneratedFile[]> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}/files`);

    if (!response.ok) {
      console.error("[session-persistence] Failed to load files:", await response.text());
      return [];
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("[session-persistence] Error loading files:", error);
    return [];
  }
}

/**
 * Load all session data (todos and files) from database
 */
export async function loadSessionData(sessionId: string): Promise<{
  todos: Todo[];
  files: GeneratedFile[];
}> {
  const [todos, files] = await Promise.all([
    loadTodos(sessionId),
    loadGeneratedFiles(sessionId),
  ]);

  return { todos, files };
}
