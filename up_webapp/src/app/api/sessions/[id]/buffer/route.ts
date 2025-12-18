import { NextRequest, NextResponse } from 'next/server';
import { addGeneratedFile } from '@/lib/db';

const WRAPPER_URL = process.env.CLIPROXY_URL?.replace('/v1', '') || 'http://localhost:8000';

interface BufferedEvent {
  id: number;
  type: string;
  data: {
    path?: string;
    [key: string]: unknown;
  } | null;
}

/**
 * GET /api/sessions/[id]/buffer?since_id=0
 * Proxy to wrapper's session buffer endpoint
 * Returns buffered SSE events for reconnection
 * Also saves file_created events to database
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const { searchParams } = new URL(request.url);
  const sinceId = searchParams.get('since_id') || '0';
  const limit = searchParams.get('limit') || '1000';

  try {
    const response = await fetch(
      `${WRAPPER_URL}/v1/sessions/${sessionId}/buffer?since_id=${sinceId}&limit=${limit}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // If session not found, return empty buffer
      if (response.status === 404) {
        return NextResponse.json({
          events: [],
          last_id: 0,
          has_more: false,
        });
      }
      throw new Error(`Wrapper returned ${response.status}`);
    }

    const data = await response.json();

    // Save file_created events to database
    if (data.events && Array.isArray(data.events)) {
      for (const event of data.events as BufferedEvent[]) {
        if (event.type === 'file_created' && event.data?.path) {
          addGeneratedFile(sessionId, event.data.path);
        }
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get session buffer:', error);
    // Return empty buffer on error
    return NextResponse.json({
      events: [],
      last_id: 0,
      has_more: false,
    });
  }
}
