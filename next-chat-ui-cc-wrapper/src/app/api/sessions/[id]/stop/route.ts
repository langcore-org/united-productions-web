import { NextRequest, NextResponse } from 'next/server';

const WRAPPER_URL = process.env.CLIPROXY_URL?.replace('/v1', '') || 'http://localhost:8000';

/**
 * POST /api/sessions/[id]/stop
 * Proxy to wrapper's session stop endpoint
 * Stops a running background session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    const response = await fetch(`${WRAPPER_URL}/v1/sessions/${sessionId}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If session not found or not running, still return success
      if (response.status === 404) {
        return NextResponse.json({
          success: false,
          message: 'Session not found',
          status: 'idle',
        });
      }
      throw new Error(`Wrapper returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to stop session:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to stop session',
        error: String(error),
      },
      { status: 500 }
    );
  }
}
