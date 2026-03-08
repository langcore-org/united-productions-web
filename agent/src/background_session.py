"""
Background Session Manager - True background execution for chat completions.

This module provides:
- Background task execution that continues after client disconnect
- Real-time event streaming to connected clients
- Reconnection support with buffered events
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, AsyncGenerator, Callable, Dict, Optional
from weakref import WeakSet

from .session_buffer import SessionBuffer, SessionStatus, session_buffer

logger = logging.getLogger(__name__)


@dataclass
class BackgroundSession:
    """A background session with its execution task."""
    session_id: str
    task: Optional[asyncio.Task] = None
    status: SessionStatus = SessionStatus.RUNNING
    event_queue: asyncio.Queue = field(default_factory=asyncio.Queue)
    subscribers: WeakSet = field(default_factory=WeakSet)
    started_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    _cancelled: bool = False


class BackgroundSessionManager:
    """
    Manages background session execution.

    Sessions run as asyncio Tasks that continue even when clients disconnect.
    Events are buffered to SQLite for reconnection, and streamed to connected clients.
    """

    def __init__(self):
        self.sessions: Dict[str, BackgroundSession] = {}
        self._lock = asyncio.Lock()
        self._cleanup_task: Optional[asyncio.Task] = None
        # Strong reference set to prevent tasks from being garbage collected
        self._active_tasks: set = set()
        logger.info("BackgroundSessionManager initialized")

    def register_task(self, task: asyncio.Task, session_id: str):
        """Register a task to prevent it from being garbage collected."""
        self._active_tasks.add(task)
        # Remove from set when task completes
        task.add_done_callback(lambda t: self._active_tasks.discard(t))
        logger.info(f"Registered task for session {session_id}, active tasks: {len(self._active_tasks)}")

    async def start_cleanup_task(self):
        """Start periodic cleanup of old sessions."""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())

    async def _periodic_cleanup(self):
        """Clean up completed sessions periodically."""
        while True:
            await asyncio.sleep(300)  # Every 5 minutes
            try:
                await self._cleanup_old_sessions()
            except Exception as e:
                logger.error(f"Cleanup error: {e}")

    async def _cleanup_old_sessions(self, max_age_seconds: int = 3600):
        """Remove sessions older than max_age_seconds."""
        async with self._lock:
            now = datetime.utcnow()
            to_remove = []

            for session_id, session in self.sessions.items():
                if session.status != SessionStatus.RUNNING:
                    age = (now - (session.completed_at or session.started_at)).total_seconds()
                    if age > max_age_seconds:
                        to_remove.append(session_id)

            for session_id in to_remove:
                del self.sessions[session_id]
                logger.info(f"Cleaned up session {session_id}")

    async def start_session(
        self,
        session_id: str,
        completion_func: Callable[[], AsyncGenerator[Dict[str, Any], None]],
        request_id: str,
    ) -> BackgroundSession:
        """
        Start a new background session.

        Args:
            session_id: Unique session identifier
            completion_func: Async generator function that yields completion chunks
            request_id: Request ID for response formatting

        Returns:
            BackgroundSession instance
        """
        async with self._lock:
            # If session already exists and is running, return it
            if session_id in self.sessions:
                existing = self.sessions[session_id]
                if existing.status == SessionStatus.RUNNING:
                    logger.info(f"Session {session_id} already running, returning existing")
                    return existing
                # Clean up old session
                del self.sessions[session_id]

            # Clear old buffer and mark as running
            session_buffer.clear_buffer(session_id)
            session_buffer.set_session_running(session_id)

            # Create new session
            session = BackgroundSession(
                session_id=session_id,
                status=SessionStatus.RUNNING,
            )

            # Create background task
            task = asyncio.create_task(
                self._run_completion(session, completion_func, request_id)
            )
            session.task = task

            self.sessions[session_id] = session
            logger.info(f"Started background session {session_id}")

            return session

    async def _run_completion(
        self,
        session: BackgroundSession,
        completion_func: Callable[[], AsyncGenerator[Dict[str, Any], None]],
        request_id: str,
    ):
        """
        Run the completion in background.

        This task continues running even if all clients disconnect.
        Events are buffered to SQLite and broadcast to connected subscribers.
        """
        try:
            async for event in completion_func():
                if session._cancelled:
                    logger.info(f"Session {session.session_id} cancelled, stopping")
                    break

                # Buffer event to SQLite
                event_type = event.get("type", "content")
                session_buffer.buffer_event(session.session_id, event_type, event)

                # Broadcast to all subscribers (non-blocking)
                await self._broadcast_event(session, event)

            # Mark as completed
            session.status = SessionStatus.COMPLETED
            session.completed_at = datetime.utcnow()
            session_buffer.set_session_completed(session.session_id)

            # Send completion marker to subscribers
            await self._broadcast_event(session, {"type": "done"})

            logger.info(f"Session {session.session_id} completed")

        except asyncio.CancelledError:
            session.status = SessionStatus.STOPPED
            session.completed_at = datetime.utcnow()
            session_buffer.set_session_stopped(session.session_id)
            logger.info(f"Session {session.session_id} cancelled")
            raise

        except Exception as e:
            session.status = SessionStatus.ERROR
            session.completed_at = datetime.utcnow()
            session.error_message = str(e)
            session_buffer.set_session_error(session.session_id, str(e))

            # Send error to subscribers
            await self._broadcast_event(session, {"type": "error", "message": str(e)})

            logger.error(f"Session {session.session_id} error: {e}")

    async def _broadcast_event(self, session: BackgroundSession, event: Dict[str, Any]):
        """Broadcast event to all subscribers (non-blocking)."""
        # Put event in the queue for any waiting subscribers
        try:
            session.event_queue.put_nowait(event)
        except asyncio.QueueFull:
            # Queue is full, event is already in SQLite buffer
            pass

    def get_session(self, session_id: str) -> Optional[BackgroundSession]:
        """Get a session by ID."""
        return self.sessions.get(session_id)

    async def register_session(
        self,
        session_id: str,
        task: asyncio.Task,
        event_queue: asyncio.Queue,
    ) -> BackgroundSession:
        """
        Thread-safe registration of a new session.

        This method ensures proper locking to prevent race conditions
        when multiple concurrent requests try to register sessions.

        Args:
            session_id: Unique session identifier
            task: The asyncio Task running the completion
            event_queue: Queue for SSE events

        Returns:
            The registered BackgroundSession (or existing one if already running)
        """
        async with self._lock:
            # Check if session already exists and is running
            if session_id in self.sessions:
                existing = self.sessions[session_id]
                if existing.status == SessionStatus.RUNNING:
                    logger.warning(
                        f"Session {session_id} already running, "
                        f"returning existing session (possible race condition detected)"
                    )
                    return existing
                # Remove old completed session
                logger.info(f"Replacing old session {session_id} (status: {existing.status})")
                del self.sessions[session_id]

            # Create and register new session
            session = BackgroundSession(
                session_id=session_id,
                task=task,
                status=SessionStatus.RUNNING,
                event_queue=event_queue,
            )
            self.sessions[session_id] = session
            logger.info(f"Registered session {session_id} (total active: {len(self.sessions)})")
            return session

    def is_session_running(self, session_id: str) -> bool:
        """Check if a session is currently running."""
        session = self.sessions.get(session_id)
        if session:
            return session.status == SessionStatus.RUNNING

        # Also check SQLite in case of server restart
        state = session_buffer.get_session_state(session_id)
        return state is not None and state.status == SessionStatus.RUNNING

    async def subscribe(
        self,
        session_id: str,
        since_id: int = 0,
    ) -> AsyncGenerator[str, None]:
        """
        Subscribe to session events.

        First yields buffered events since since_id, then yields real-time events.

        Args:
            session_id: Session to subscribe to
            since_id: Only return events with ID > since_id

        Yields:
            SSE formatted event strings
        """
        session = self.sessions.get(session_id)

        # First, yield buffered events
        events, last_id, has_more = session_buffer.get_buffered_events(session_id, since_id)
        for event in events:
            yield self._format_sse(event.event_type, json.loads(event.event_data))

        # If session is not running or doesn't exist, we're done
        if not session or session.status != SessionStatus.RUNNING:
            # Send done marker if session completed
            state = session_buffer.get_session_state(session_id)
            if state and state.status == SessionStatus.COMPLETED:
                yield self._format_sse("done", {"type": "done"})
            elif state and state.status == SessionStatus.ERROR:
                yield self._format_sse("error", {"type": "error", "message": state.error_message})
            return

        # Subscribe to real-time events
        logger.info(f"Client subscribing to session {session_id}")

        try:
            while session.status == SessionStatus.RUNNING:
                try:
                    # Wait for new events with timeout
                    event = await asyncio.wait_for(
                        session.event_queue.get(),
                        timeout=30.0
                    )

                    # Handle None (completion signal from main.py)
                    if event is None:
                        logger.info(f"Session {session_id} received completion signal")
                        break

                    # Handle SSE-formatted strings (from main.py run_completion_task)
                    if isinstance(event, str):
                        # Already SSE formatted, yield directly
                        yield event
                        # Check if this is a done event by parsing the JSON
                        if event.startswith("data: "):
                            try:
                                data = json.loads(event[6:].strip())
                                if data.get("type") == "done" or "[DONE]" in event:
                                    break
                            except (json.JSONDecodeError, TypeError):
                                pass
                        continue

                    # Handle dict events (for backward compatibility)
                    if event.get("type") == "done":
                        yield self._format_sse("done", event)
                        break
                    elif event.get("type") == "error":
                        yield self._format_sse("error", event)
                        break
                    else:
                        yield self._format_sse(event.get("type", "content"), event)

                except asyncio.TimeoutError:
                    # Send keep-alive
                    yield ": keep-alive\n\n"

        except asyncio.CancelledError:
            logger.info(f"Subscription to {session_id} cancelled")
            raise
        finally:
            logger.info(f"Client unsubscribed from session {session_id}")

    def _format_sse(self, event_type: str, data: Dict[str, Any]) -> str:
        """Format event as SSE string."""
        return f"data: {json.dumps(data)}\n\n"

    async def stop_session(self, session_id: str) -> bool:
        """
        Stop a running session.

        Returns:
            True if session was stopped, False if not found or not running
        """
        session = self.sessions.get(session_id)
        if not session:
            return False

        if session.status != SessionStatus.RUNNING:
            return False

        # Mark as cancelled
        session._cancelled = True

        # Cancel the task
        if session.task and not session.task.done():
            session.task.cancel()
            try:
                await session.task
            except asyncio.CancelledError:
                pass

        logger.info(f"Stopped session {session_id}")
        return True


# Global singleton instance
background_session_manager = BackgroundSessionManager()
