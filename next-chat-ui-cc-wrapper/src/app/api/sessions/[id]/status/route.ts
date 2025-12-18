import { NextRequest, NextResponse } from 'next/server';

const WRAPPER_URL = process.env.CLIPROXY_URL?.replace('/v1', '') || 'http://localhost:8000';

/**
 * GET /api/sessions/[id]/status
 * Proxy to wrapper's session status endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    const response = await fetch(`${WRAPPER_URL}/v1/sessions/${sessionId}/status`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If session not found, return idle status
      if (response.status === 404) {
        return NextResponse.json({
          session_id: sessionId,
          status: 'idle',
          started_at: null,
          completed_at: null,
          buffered_events_count: 0,
        });
      }
      throw new Error(`Wrapper returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get session status:', error);
    // Return idle status on error (wrapper may not be running)
    return NextResponse.json({
      session_id: sessionId,
      status: 'idle',
      started_at: null,
      completed_at: null,
      buffered_events_count: 0,
    });
  }
}
