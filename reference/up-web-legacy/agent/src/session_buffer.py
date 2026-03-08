"""
Session Buffer Module - SQLite-based event buffering for background session execution.

This module provides:
- Session state management (idle, running, completed, error, stopped)
- Event buffering for SSE events during background execution
- Reconnection support with event replay
"""

import os
import json
import sqlite3
import threading
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class SessionStatus(str, Enum):
    """Session execution status."""
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"
    STOPPED = "stopped"


@dataclass
class SessionState:
    """Session state information."""
    session_id: str
    status: SessionStatus
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class BufferedEvent:
    """A buffered SSE event."""
    id: int
    session_id: str
    event_type: str  # content, todo_update, file_created, done, error
    event_data: str  # JSON string
    created_at: str


class SessionBuffer:
    """
    SQLite-based session buffer for background execution.

    Thread-safe singleton that manages:
    - Session state (running, completed, etc.)
    - Event buffering for reconnection
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # Use data directory relative to wrapper root
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        os.makedirs(data_dir, exist_ok=True)

        self.db_path = os.path.join(data_dir, "session_buffer.db")
        self._local = threading.local()
        self._init_db()
        self._initialized = True
        logger.info(f"SessionBuffer initialized with DB: {self.db_path}")

    def _get_connection(self) -> sqlite3.Connection:
        """Get thread-local database connection."""
        if not hasattr(self._local, "connection"):
            self._local.connection = sqlite3.connect(
                self.db_path,
                check_same_thread=False,
                timeout=30.0
            )
            self._local.connection.row_factory = sqlite3.Row
        return self._local.connection

    def _init_db(self):
        """Initialize database tables."""
        conn = self._get_connection()
        conn.executescript("""
            -- Session execution state
            CREATE TABLE IF NOT EXISTS session_state (
                session_id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'idle',
                started_at TEXT,
                completed_at TEXT,
                error_message TEXT
            );

            -- Buffered SSE events for reconnection
            CREATE TABLE IF NOT EXISTS session_buffer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_data TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (session_id) REFERENCES session_state(session_id)
            );

            -- Index for efficient retrieval
            CREATE INDEX IF NOT EXISTS idx_buffer_session
                ON session_buffer(session_id, id);

            -- Index for cleanup
            CREATE INDEX IF NOT EXISTS idx_buffer_created
                ON session_buffer(created_at);
        """)
        conn.commit()
        logger.debug("Database tables initialized")

    # ==================== Session State Management ====================

    def get_session_state(self, session_id: str) -> Optional[SessionState]:
        """Get current session state."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM session_state WHERE session_id = ?",
            (session_id,)
        )
        row = cursor.fetchone()

        if not row:
            return None

        return SessionState(
            session_id=row["session_id"],
            status=SessionStatus(row["status"]),
            started_at=row["started_at"],
            completed_at=row["completed_at"],
            error_message=row["error_message"]
        )

    def set_session_running(self, session_id: str) -> None:
        """Mark session as running."""
        conn = self._get_connection()
        now = datetime.utcnow().isoformat() + "Z"

        conn.execute("""
            INSERT INTO session_state (session_id, status, started_at)
            VALUES (?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                status = ?,
                started_at = ?,
                completed_at = NULL,
                error_message = NULL
        """, (session_id, SessionStatus.RUNNING.value, now,
              SessionStatus.RUNNING.value, now))
        conn.commit()
        logger.info(f"Session {session_id} marked as running")

    def set_session_completed(self, session_id: str) -> None:
        """Mark session as completed."""
        conn = self._get_connection()
        now = datetime.utcnow().isoformat() + "Z"

        conn.execute("""
            UPDATE session_state
            SET status = ?, completed_at = ?
            WHERE session_id = ?
        """, (SessionStatus.COMPLETED.value, now, session_id))
        conn.commit()
        logger.info(f"Session {session_id} marked as completed")

    def set_session_error(self, session_id: str, error_message: str) -> None:
        """Mark session as error."""
        conn = self._get_connection()
        now = datetime.utcnow().isoformat() + "Z"

        conn.execute("""
            UPDATE session_state
            SET status = ?, completed_at = ?, error_message = ?
            WHERE session_id = ?
        """, (SessionStatus.ERROR.value, now, error_message, session_id))
        conn.commit()
        logger.error(f"Session {session_id} marked as error: {error_message}")

    def set_session_stopped(self, session_id: str) -> bool:
        """Mark session as stopped. Returns True if session was running."""
        state = self.get_session_state(session_id)
        if not state or state.status != SessionStatus.RUNNING:
            return False

        conn = self._get_connection()
        now = datetime.utcnow().isoformat() + "Z"

        conn.execute("""
            UPDATE session_state
            SET status = ?, completed_at = ?
            WHERE session_id = ?
        """, (SessionStatus.STOPPED.value, now, session_id))
        conn.commit()
        logger.info(f"Session {session_id} marked as stopped")
        return True

    # ==================== Event Buffering ====================

    def buffer_event(self, session_id: str, event_type: str, event_data: Any) -> int:
        """
        Buffer an SSE event for later retrieval.

        Args:
            session_id: Session ID
            event_type: Type of event (content, todo_update, file_created, done, error)
            event_data: Event data (will be JSON serialized)

        Returns:
            Event ID
        """
        conn = self._get_connection()

        # Serialize event data to JSON
        if isinstance(event_data, str):
            data_json = event_data
        else:
            data_json = json.dumps(event_data, default=str)

        cursor = conn.execute("""
            INSERT INTO session_buffer (session_id, event_type, event_data)
            VALUES (?, ?, ?)
        """, (session_id, event_type, data_json))
        conn.commit()

        event_id = cursor.lastrowid
        logger.debug(f"Buffered event {event_id} for session {session_id}: {event_type}")
        return event_id

    def get_buffered_events(
        self,
        session_id: str,
        since_id: int = 0,
        limit: int = 1000
    ) -> tuple[List[BufferedEvent], int, bool]:
        """
        Get buffered events for a session.

        Args:
            session_id: Session ID
            since_id: Only return events with ID > since_id
            limit: Maximum number of events to return

        Returns:
            Tuple of (events, last_id, has_more)
        """
        conn = self._get_connection()

        cursor = conn.execute("""
            SELECT id, session_id, event_type, event_data, created_at
            FROM session_buffer
            WHERE session_id = ? AND id > ?
            ORDER BY id ASC
            LIMIT ?
        """, (session_id, since_id, limit + 1))  # +1 to check if more exists

        rows = cursor.fetchall()
        has_more = len(rows) > limit
        rows = rows[:limit]

        events = [
            BufferedEvent(
                id=row["id"],
                session_id=row["session_id"],
                event_type=row["event_type"],
                event_data=row["event_data"],
                created_at=row["created_at"]
            )
            for row in rows
        ]

        last_id = events[-1].id if events else since_id

        logger.debug(f"Retrieved {len(events)} buffered events for session {session_id}")
        return events, last_id, has_more

    def get_buffered_events_count(self, session_id: str) -> int:
        """Get count of buffered events for a session."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT COUNT(*) FROM session_buffer WHERE session_id = ?",
            (session_id,)
        )
        return cursor.fetchone()[0]

    def clear_buffer(self, session_id: str) -> int:
        """Clear all buffered events for a session. Returns count deleted."""
        conn = self._get_connection()
        cursor = conn.execute(
            "DELETE FROM session_buffer WHERE session_id = ?",
            (session_id,)
        )
        conn.commit()
        count = cursor.rowcount
        logger.info(f"Cleared {count} buffered events for session {session_id}")
        return count

    # ==================== Cleanup ====================

    def cleanup_old_sessions(self, hours: int = 24) -> int:
        """
        Clean up old completed/error sessions and their buffers.

        Args:
            hours: Delete sessions older than this many hours

        Returns:
            Number of sessions cleaned up
        """
        conn = self._get_connection()

        # Find old sessions
        cursor = conn.execute("""
            SELECT session_id FROM session_state
            WHERE status IN (?, ?, ?)
            AND completed_at < datetime('now', ?)
        """, (
            SessionStatus.COMPLETED.value,
            SessionStatus.ERROR.value,
            SessionStatus.STOPPED.value,
            f"-{hours} hours"
        ))

        old_sessions = [row[0] for row in cursor.fetchall()]

        if not old_sessions:
            return 0

        # Delete buffers first (foreign key)
        placeholders = ",".join("?" * len(old_sessions))
        conn.execute(
            f"DELETE FROM session_buffer WHERE session_id IN ({placeholders})",
            old_sessions
        )

        # Delete sessions
        conn.execute(
            f"DELETE FROM session_state WHERE session_id IN ({placeholders})",
            old_sessions
        )

        conn.commit()
        logger.info(f"Cleaned up {len(old_sessions)} old sessions")
        return len(old_sessions)

    def get_stats(self) -> Dict[str, Any]:
        """Get buffer statistics."""
        conn = self._get_connection()

        # Count sessions by status
        cursor = conn.execute("""
            SELECT status, COUNT(*) as count
            FROM session_state
            GROUP BY status
        """)
        status_counts = {row["status"]: row["count"] for row in cursor.fetchall()}

        # Count total events
        cursor = conn.execute("SELECT COUNT(*) FROM session_buffer")
        total_events = cursor.fetchone()[0]

        # Get DB file size
        db_size = os.path.getsize(self.db_path) if os.path.exists(self.db_path) else 0

        return {
            "sessions_by_status": status_counts,
            "total_buffered_events": total_events,
            "db_size_bytes": db_size,
            "db_path": self.db_path
        }


# Global singleton instance
session_buffer = SessionBuffer()
