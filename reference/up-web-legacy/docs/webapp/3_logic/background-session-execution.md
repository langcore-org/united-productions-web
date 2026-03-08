# Background Session Execution

## Overview

Background session execution allows the Claude Agent to continue running tasks even when the user reloads the page, switches to a different session, or closes the browser tab. When the user returns, the UI automatically reconnects to the running session and displays the accumulated results.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           up_web (Next.js)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  chat/page.tsx                                                               │
│  ├── currentSessionId (Supabase chat_sessions.id)                           │
│  ├── claudeSessionId  (Agent session ID, persisted to chat_sessions)        │
│  ├── lastEventIdRef   (Tracks last processed event for deduplication)       │
│  │                                                                           │
│  └── useEffect (checkAndReconnect)                                          │
│       ├── On mount: Check session status via /api/agent/sessions/{id}/status │
│       ├── If running: Poll every 2s for new buffered events                 │
│       ├── Process events: Update todos, files, streaming content            │
│       └── On complete: Save message to Supabase, stop polling               │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  API Routes                                                                  │
│  ├── /api/chat/completions        → Agent API streaming                     │
│  ├── /api/agent/sessions/{id}/status → Session status (proxy)               │
│  ├── /api/agent/sessions/{id}/buffer → Buffered events (proxy)              │
│  └── /api/agent/sessions/{id}/stop   → Stop session (proxy)                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Agent (Python/FastAPI)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BackgroundSessionManager                                                    │
│  ├── sessions: Dict[session_id, BackgroundSession]                          │
│  ├── _active_tasks: Set[asyncio.Task]  (prevents GC)                        │
│  │                                                                           │
│  └── Methods:                                                                │
│       ├── start_or_subscribe(session_id, request)                           │
│       ├── register_task(task, session_id)                                   │
│       ├── subscribe(session_id) → AsyncGenerator[SSE events]                │
│       └── stop_session(session_id)                                          │
│                                                                              │
│  SessionBuffer (SQLite)                                                      │
│  ├── session_state table: session status, timestamps                        │
│  └── session_buffer table: buffered SSE events with IDs                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Session ID Persistence

The `claude_session_id` column in `chat_sessions` table stores the agent session ID, enabling reconnection after page reload.

```sql
-- Already exists in schema
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  ...
  claude_session_id TEXT,  -- Agent session ID for reconnection
  ...
);
```

### 2. Session Lifecycle

#### Starting a Session (handleSend)

```typescript
// Generate unique agent session ID
const newClaudeSessionId = `agent-${sessionId}-${Date.now()}`;
setClaudeSessionId(newClaudeSessionId);

// Save to database for reconnection
await supabase
  .from("chat_sessions")
  .update({ claude_session_id: newClaudeSessionId })
  .eq("id", sessionId);

// Reset event tracking
lastEventIdRef.current = 0;

// Start streaming
await sendAgentMessage(newClaudeSessionId, agentMessages);
```

#### Loading a Session (validateAndLoadSession / handleSessionSelect)

```typescript
const { data } = await supabase
  .from("chat_sessions")
  .select("id, mode, claude_session_id")
  .eq("id", sessionId)
  .single();

if (data?.claude_session_id) {
  setClaudeSessionId(data.claude_session_id);
  // This triggers the reconnection useEffect
}
```

### 3. Auto-Reconnection Flow

The `checkAndReconnect` useEffect handles automatic reconnection:

1. **On mount with claudeSessionId**: Check session status
2. **If running**:
   - Set status to "reconnecting"
   - Fetch initial buffered events
   - Start polling every 2 seconds
   - Process new events (content, todos, files)
3. **If completed**:
   - Fetch final buffered events
   - Save message to database
   - Update UI
4. **Cleanup**: Clear interval on unmount

### 4. Event Processing

```typescript
const processBufferedEvents = (events) => {
  for (const event of events) {
    if (event.type === "content") {
      // Accumulate streaming content
      recoveredContent += event.content;
    } else if (event.type === "todo_update") {
      // Update todo list
      setTodos(event.todos);
    } else if (event.type === "file_created") {
      // Add to generated files (with deduplication)
      setGeneratedFiles(prev => ...);
    }
  }
};
```

## API Endpoints

### GET /api/agent/sessions/{id}/status

Returns session status from the agent.

**Response:**
```json
{
  "session_id": "agent-xxx-123456",
  "status": "running" | "completed" | "error" | "stopped" | "idle",
  "started_at": "2024-01-01T00:00:00Z",
  "completed_at": null,
  "buffered_events_count": 42
}
```

### GET /api/agent/sessions/{id}/buffer

Returns buffered SSE events since a given ID.

**Query Parameters:**
- `since_id`: Last processed event ID (default: 0)
- `limit`: Maximum events to return (default: 1000)

**Response:**
```json
{
  "events": [
    { "id": 1, "type": "content", "content": "Hello..." },
    { "id": 2, "type": "todo_update", "todos": [...] },
    { "id": 3, "type": "file_created", "path": "/output/report.md" }
  ],
  "last_id": 3,
  "has_more": false
}
```

### POST /api/agent/sessions/{id}/stop

Stops a running session.

**Response:**
```json
{
  "success": true
}
```

## Files Modified

| File | Purpose |
|------|---------|
| `up_web/app/[slug]/programs/[programId]/teams/[teamId]/chat/page.tsx` | Main chat page with reconnection logic |
| `supabase/migrations/20251222000000_initial_schema.sql` | Schema includes `claude_session_id` column |

## Testing

1. Start a long-running agent task (e.g., deep research)
2. Reload the page while task is running
3. Verify:
   - Status shows "reconnecting" then "running"
   - Accumulated content appears
   - Todos and generated files are restored
   - New content continues to stream
4. Wait for completion and verify message is saved

## Troubleshooting

### Session not reconnecting

1. Check if `claude_session_id` is saved in database
2. Verify agent API is running at `AGENT_API_URL`
3. Check browser console for polling errors

### Duplicate events

The implementation uses:
- `lastEventIdRef` to track processed events
- File path deduplication in `setGeneratedFiles`

### Content not appearing

Check that:
- `streamingContentRef.current` is being updated
- `setStreamingContent` is called with accumulated content
- MessageList component shows streaming content when `isStreaming` is true
