# Background Session Execution Design

## Overview

This document describes the architecture for background session execution, allowing agent tasks to continue running even when users switch sessions or reload the browser.

## Problem Statement

**Current Behavior:**
- When user switches to another session or reloads → SSE connection breaks → agent stops
- Agent responses are slow (minutes to hours for complex tasks)
- Users lose all progress when accidentally closing the browser

**Desired Behavior:**
- Agent continues running in background regardless of browser state
- Users can return and see accumulated results
- Real-time updates when connected, buffered results when reconnected

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CONNECTED STATE                              │
│                                                                      │
│  Browser ◄────── SSE Stream ────── Next.js ◄────── Wrapper          │
│     │                                                   │            │
│     │  Real-time:                                       │            │
│     │  - Text streaming                                 │            │
│     │  - TodoList updates                               │            │
│     │  - File creation events                           │            │
│     │  - ESC to stop                                    │            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       DISCONNECTED STATE                             │
│                                                                      │
│  Browser (離脱)                     Wrapper (継続実行)               │
│     │                                   │                            │
│     │                                   ▼                            │
│     │                           ┌─────────────┐                      │
│     │                           │   SQLite    │                      │
│     │                           │   Buffer    │                      │
│     │                           │  - events   │                      │
│     │                           │  - content  │                      │
│     │                           │  - status   │                      │
│     │                           └─────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        RECONNECTION STATE                            │
│                                                                      │
│  Browser (戻る) ────► API Request ────► Wrapper                      │
│     │                                      │                         │
│     │  1. Get buffered events              │                         │
│     │  2. Get current status               │                         │
│     │  3. If still running → reconnect SSE │                         │
│     ◄──────────────────────────────────────┘                         │
│                                                                      │
│  Display:                                                            │
│  - Buffered content (instant)                                        │
│  - Continue SSE if running                                           │
│  - ESC to stop                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Changes

### 1. Wrapper (Python) - Major Changes

#### New SQLite Tables

```sql
-- Session execution state
CREATE TABLE session_state (
    session_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'idle',  -- idle, running, completed, error, stopped
    started_at TEXT,
    completed_at TEXT,
    error_message TEXT
);

-- Buffered SSE events for reconnection
CREATE TABLE session_buffer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,  -- content, todo_update, file_created, done, error
    event_data TEXT NOT NULL,  -- JSON
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES session_state(session_id)
);

-- Index for efficient retrieval
CREATE INDEX idx_buffer_session ON session_buffer(session_id, id);
```

#### New API Endpoints

```python
# GET /v1/sessions/{session_id}/status
# Returns current session state
{
    "session_id": "xxx",
    "status": "running",  # idle, running, completed, error, stopped
    "started_at": "2025-12-08T10:00:00Z",
    "completed_at": null,
    "buffered_events_count": 42
}

# GET /v1/sessions/{session_id}/buffer?since_id=0
# Returns buffered events since given ID
{
    "events": [
        {"id": 1, "type": "content", "data": "Hello..."},
        {"id": 2, "type": "todo_update", "data": {...}},
        {"id": 3, "type": "file_created", "data": {"path": "..."}},
    ],
    "last_id": 42,
    "has_more": false
}

# POST /v1/sessions/{session_id}/stop
# Stop a running session
{
    "success": true,
    "status": "stopped"
}

# POST /v1/chat/completions (existing, modified)
# Now buffers events to SQLite while streaming
# Continues running even if client disconnects
```

#### Background Execution Logic

```python
async def stream_chat_completion(session_id, messages, ...):
    # 1. Set session status to running
    set_session_status(session_id, "running")

    try:
        async for event in claude_stream():
            # 2. Buffer event to SQLite
            buffer_event(session_id, event)

            # 3. Yield to SSE (may fail if disconnected)
            try:
                yield format_sse(event)
            except (ConnectionError, ClientDisconnected):
                # Client disconnected, but we continue processing
                pass

        # 4. Mark as completed
        set_session_status(session_id, "completed")

    except Exception as e:
        set_session_status(session_id, "error", str(e))
        raise
```

### 2. Next.js Chat UI - Moderate Changes

#### Session Status API

```typescript
// New: GET /api/sessions/[id]/status
// Proxies to wrapper's status endpoint

// New: GET /api/sessions/[id]/buffer?since_id=0
// Proxies to wrapper's buffer endpoint

// New: POST /api/sessions/[id]/stop
// Proxies to wrapper's stop endpoint
```

#### ChatContainer Changes

```typescript
// On mount or session change:
useEffect(() => {
    async function initSession() {
        // 1. Check session status
        const status = await fetch(`/api/sessions/${sessionId}/status`);

        if (status.status === 'running' || status.status === 'completed') {
            // 2. Fetch buffered events
            const buffer = await fetch(`/api/sessions/${sessionId}/buffer`);

            // 3. Apply buffered events to state
            applyBufferedEvents(buffer.events);

            // 4. If still running, connect SSE for live updates
            if (status.status === 'running') {
                connectSSE(sessionId, buffer.last_id);
            }
        }
    }
    initSession();
}, [sessionId]);
```

#### UI Status Display

```tsx
// Session status badge in header
{sessionStatus === 'running' && (
    <div className="flex items-center gap-2 text-blue-600">
        <span className="animate-pulse">●</span>
        <span>Running in background</span>
    </div>
)}

// ESC to stop hint
{sessionStatus === 'running' && (
    <div className="text-sm text-gray-500">
        Press ESC to stop
    </div>
)}
```

## Data Flow Diagrams

### Normal Flow (User Connected)

```
1. User sends message
2. Next.js → POST /api/chat → Wrapper
3. Wrapper starts background task
4. Wrapper streams SSE + buffers to SQLite
5. Next.js forwards SSE to browser
6. Browser displays real-time updates
7. User can ESC to stop
```

### Reconnection Flow

```
1. User returns to session
2. Next.js → GET /api/sessions/{id}/status
3. If running/completed:
   a. GET /api/sessions/{id}/buffer
   b. Display buffered content
   c. If running: reconnect SSE
4. User sees all progress
5. User can ESC to stop (if running)
```

### Disconnect During Execution

```
1. User closes browser / switches session
2. SSE connection breaks
3. Wrapper catches ConnectionError
4. Wrapper continues processing
5. Events buffered to SQLite
6. On completion: status = "completed"
```

## Implementation Plan

### Phase 1: Wrapper SQLite Buffer (High Priority)

1. Add SQLite tables for session state and buffer
2. Modify streaming to buffer events
3. Add status/buffer/stop endpoints
4. Handle client disconnection gracefully

### Phase 2: Next.js Reconnection (High Priority)

1. Add session status/buffer/stop API routes
2. Implement reconnection logic in ChatContainer
3. Apply buffered events to UI state
4. Add status indicator UI

### Phase 3: Polish (Medium Priority)

1. Buffer cleanup (old completed sessions)
2. Error recovery improvements
3. Performance optimization
4. UI/UX refinements

## Considerations

### Buffer Size Management

- Events are small (< 1KB each typically)
- Long-running sessions may accumulate 1000+ events
- Cleanup: Delete buffer after 24h of completion
- Option: Compress content events

### Error Handling

- Wrapper crashes → status = "error" on restart check
- Network errors during reconnection → retry with backoff
- Buffer corruption → fallback to fresh start

### Concurrent Sessions

- Each session has independent state/buffer
- User can have multiple running sessions
- UI shows status for current session only

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `wrapper/src/main.py` | Major | Background execution, buffering |
| `wrapper/src/db.py` | New | SQLite session state/buffer |
| `ui/src/app/api/sessions/[id]/status/route.ts` | New | Status proxy |
| `ui/src/app/api/sessions/[id]/buffer/route.ts` | New | Buffer proxy |
| `ui/src/app/api/sessions/[id]/stop/route.ts` | New | Stop proxy |
| `ui/src/components/chat/ChatContainer.tsx` | Moderate | Reconnection logic |
| `ui/src/components/chat/SessionStatus.tsx` | New | Status indicator |

## Testing Strategy

1. **Unit Tests**: Buffer operations, status transitions
2. **Integration Tests**: Full reconnection flow
3. **Manual Tests**:
   - Start task → close browser → reopen → verify content
   - Start task → switch session → switch back → verify content
   - Start task → ESC → verify stopped
