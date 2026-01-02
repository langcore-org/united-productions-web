import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AGENT_API_URL = process.env.AGENT_API_URL || "http://localhost:8230";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agent/sessions/[sessionId]/stream
 * SSE proxy for session reconnection - streams events from Agent API
 *
 * This replaces polling with a single SSE connection that:
 * - First sends buffered events since `since_id`
 * - Then streams real-time events as they occur
 * - Sends keep-alive every 30 seconds
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const sinceId = searchParams.get("since_id") || "0";

    console.log(`[sessions/stream] Connecting to session ${sessionId} from event ${sinceId}`);

    // Forward SSE request to agent
    const agentResponse = await fetch(
      `${AGENT_API_URL}/v1/sessions/${sessionId}/stream?since_id=${sinceId}`,
      {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
      }
    );

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      console.error("[sessions/stream] Agent error:", errorText);
      return NextResponse.json(
        { error: "Agent API error", details: errorText },
        { status: agentResponse.status }
      );
    }

    // Stream SSE response back to client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = agentResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log(`[sessions/stream] Stream ended for session ${sessionId}`);
              break;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          console.error("[sessions/stream] Stream error:", error);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[sessions/stream] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: String(error) },
      { status: 500 }
    );
  }
}
