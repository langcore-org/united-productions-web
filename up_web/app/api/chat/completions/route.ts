import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AGENT_API_URL = process.env.AGENT_API_URL || "http://localhost:8230";
const AGENT_API_TIMEOUT = parseInt(process.env.AGENT_API_TIMEOUT || "600000");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/chat/completions
 * Proxy SSE streaming requests to Claude Code Agent API
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const timings: Record<string, number> = {};

  const logTiming = (label: string) => {
    const elapsed = Date.now() - startTime;
    timings[label] = elapsed;
    console.log(`[PERF] ${label}: ${elapsed}ms (total)`);
  };

  try {
    logTiming("request_received");

    // Auth check
    const supabase = await createClient();
    logTiming("supabase_client_created");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    logTiming("auth_check_complete");

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    logTiming("body_parsed");

    // Transform AI SDK v6 message format to OpenAI format
    // AI SDK v6 sends: { parts: [{ type: "text", text: "..." }], role: "user" }
    // Agent API expects: { content: "...", role: "user" }
    const transformMessages = (messages: Array<Record<string, unknown>>) => {
      if (!messages || !Array.isArray(messages)) return messages;

      return messages.map((msg) => {
        // If message already has content, keep it
        if (msg.content) return msg;

        // Transform parts to content
        if (msg.parts && Array.isArray(msg.parts)) {
          const textParts = (msg.parts as Array<{ type: string; text?: string }>)
            .filter((p) => p.type === "text" && p.text)
            .map((p) => p.text)
            .join("");

          return {
            role: msg.role,
            content: textParts,
          };
        }

        return msg;
      });
    };

    // Ensure streaming is enabled and tools are enabled
    const agentRequest = {
      ...body,
      model: body.model || "claude-sonnet-4-20250514", // Default model if not provided
      messages: transformMessages(body.messages),
      stream: true,
      enable_tools: body.enable_tools ?? true,
    };

    // Remove AI SDK v6 specific fields that Agent API doesn't understand
    delete agentRequest.id;
    delete agentRequest.trigger;

    // Forward to agent
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AGENT_API_TIMEOUT);

    console.log(`[PERF] Calling agent at ${AGENT_API_URL}/v1/chat/completions`);
    const agentResponse = await fetch(`${AGENT_API_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(agentRequest),
      signal: controller.signal,
    });
    logTiming("agent_response_received");

    clearTimeout(timeoutId);

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      console.error("[chat/completions] Agent error:", errorText);
      return NextResponse.json(
        { error: "Agent API error", details: errorText },
        { status: agentResponse.status }
      );
    }

    logTiming("starting_stream");

    // Transform SSE to Vercel AI SDK Data Stream format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let firstChunkReceived = false;
    let buffer = "";

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        if (!firstChunkReceived) {
          firstChunkReceived = true;
          console.log(`[PERF] first_chunk_received: ${Date.now() - startTime}ms (total)`);
        }

        const text = decoder.decode(chunk, { stream: true });
        buffer += text;

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

          const data = trimmedLine.slice(6);
          if (data === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // Handle custom todo_update events
            if (parsed.type === "todo_update" && parsed.todos) {
              console.log(`[chat/completions] Transforming todo_update:`, parsed.todos.length, "todos");
              const todoData = JSON.stringify([{ type: "todo_update", todos: parsed.todos }]);
              controller.enqueue(encoder.encode(`2:${todoData}\n`));
              continue;
            }

            // Handle file_created events
            if (parsed.type === "file_created" && parsed.path) {
              console.log(`[chat/completions] Transforming file_created:`, parsed.path);
              const fileData = JSON.stringify([{ type: "file_created", path: parsed.path }]);
              controller.enqueue(encoder.encode(`2:${fileData}\n`));
              continue;
            }

            // Handle gdrive_file_created events
            if (parsed.type === "gdrive_file_created") {
              console.log(`[chat/completions] Transforming gdrive_file_created:`, parsed.file_name);
              const driveData = JSON.stringify([{
                type: "gdrive_file_created",
                file_name: parsed.file_name,
                folder_id: parsed.folder_id,
                status: parsed.status,
                drive_id: parsed.drive_id,
                web_view_link: parsed.web_view_link,
              }]);
              controller.enqueue(encoder.encode(`2:${driveData}\n`));
              continue;
            }

            // Handle error events
            if (parsed.type === "error" && parsed.message) {
              console.error(`[chat/completions] Error event:`, parsed.message);
              const errorData = JSON.stringify([{ type: "error", message: parsed.message }]);
              controller.enqueue(encoder.encode(`2:${errorData}\n`));
              continue;
            }

            // Handle standard OpenAI streaming format (choices[0].delta.content)
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
              continue;
            }

            // Handle wrapper's content format (type: "content")
            if (parsed.type === "content" && parsed.content) {
              controller.enqueue(encoder.encode(`0:${JSON.stringify(parsed.content)}\n`));
              continue;
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      },

      flush(controller) {
        // Process any remaining buffer
        if (buffer.trim()) {
          const trimmedLine = buffer.trim();
          if (trimmedLine.startsWith("data: ")) {
            const data = trimmedLine.slice(6);
            if (data !== "[DONE]") {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || parsed.content;
                if (content) {
                  controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
                }
              } catch {
                // Ignore
              }
            }
          }
        }
        console.log(`[PERF] stream_complete: ${Date.now() - startTime}ms (total)`);
      }
    });

    // Pipe the response through our transform
    const stream = agentResponse.body?.pipeThrough(transformStream);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    console.error("[chat/completions] Error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timeout" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", message: String(error) },
      { status: 500 }
    );
  }
}
