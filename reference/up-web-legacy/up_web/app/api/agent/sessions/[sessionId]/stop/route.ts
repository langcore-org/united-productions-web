import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AGENT_API_URL = process.env.AGENT_API_URL || "http://localhost:8230";

/**
 * POST /api/agent/sessions/[sessionId]/stop
 * Stop a running session in Agent API
 */
export async function POST(
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

    // Forward to agent
    const agentResponse = await fetch(
      `${AGENT_API_URL}/v1/sessions/${sessionId}/stop`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      console.error("[sessions/stop] Agent error:", errorText);
      return NextResponse.json(
        { error: "Agent API error", details: errorText },
        { status: agentResponse.status }
      );
    }

    const data = await agentResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[sessions/stop] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: String(error) },
      { status: 500 }
    );
  }
}
