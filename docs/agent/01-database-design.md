# Database Design Document

## Overview

Next.js Chat UI のデータベース設計書。**Phase 1では SQLite** を使用し、シンプルに構築。

---

## 1. Database Architecture

### 1.1 Phase 1: SQLite (Current)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Application                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │  Next.js API Routes │    │   CLIProxyAPI (Port 8317)       │ │
│  │  - /api/sessions/*  │    │   - Claude Code Runtime         │ │
│  │  - /api/chat        │    │                                 │ │
│  └──────────┬──────────┘    └─────────────────────────────────┘ │
│             │                                                    │
└─────────────┼────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SQLite                                    │
│                   (data/chat.db)                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │  sessions       │  │  messages       │                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Storage Strategy

| データ | Phase 1 | Phase 2 (Future) |
|--------|---------|------------------|
| セッション | SQLite | PostgreSQL |
| メッセージ | SQLite | PostgreSQL |
| ファイル参照 | LocalStorage | Object Storage |
| 認証 | Cookie Session | Supabase Auth |

---

## 2. Table Definitions (SQLite)

### 2.1 sessions テーブル

```sql
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);
```

### 2.2 messages テーブル

```sql
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
```

---

## 3. TypeScript Implementation

### 3.1 Database Client

```typescript
// lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'chat.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
`);

export { db };
```

### 3.2 Session Queries

```typescript
// lib/db.ts (continued)

export interface Session {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// Create session
export function createSession(id: string, title?: string): Session {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, title) VALUES (?, ?)
    RETURNING *
  `);
  return stmt.get(id, title || null) as Session;
}

// Get session with messages
export function getSession(id: string): { session: Session; messages: Message[] } | null {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined;
  if (!session) return null;

  const messages = db.prepare(
    'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC'
  ).all(id) as Message[];

  return { session, messages };
}

// List sessions
export function listSessions(limit = 20, offset = 0): Session[] {
  return db.prepare(`
    SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset) as Session[];
}

// Add message
export function addMessage(
  id: string,
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Message {
  // Update session timestamp
  db.prepare(`UPDATE sessions SET updated_at = datetime('now') WHERE id = ?`).run(sessionId);

  // Insert message
  const stmt = db.prepare(`
    INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)
    RETURNING *
  `);
  return stmt.get(id, sessionId, role, content) as Message;
}

// Delete session
export function deleteSession(id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

// Update session title
export function updateSessionTitle(id: string, title: string): void {
  db.prepare(`UPDATE sessions SET title = ?, updated_at = datetime('now') WHERE id = ?`).run(title, id);
}
```

---

## 4. Migration to PostgreSQL (Future)

Phase 2 でPostgreSQLに移行する場合:

```typescript
// lib/db.ts の差し替え
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 同じインターフェースを維持
export function createSession(id: string, title?: string): Promise<Session> {
  return pool.query(
    'INSERT INTO sessions (id, title) VALUES ($1, $2) RETURNING *',
    [id, title]
  ).then(r => r.rows[0]);
}
// ... 他のクエリも同様に変換
```

---

## 5. File Storage (LocalStorage)

Phase 1ではファイル参照はブラウザのLocalStorageに保存:

```typescript
// lib/fileStorage.ts (クライアントサイド)

interface FileReference {
  id: string;
  name: string;
  path: string;
  sessionId: string;
  createdAt: string;
}

const STORAGE_KEY = 'chat_file_refs';

export function saveFileRef(ref: FileReference): void {
  const refs = getFileRefs();
  refs.push(ref);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(refs));
}

export function getFileRefs(sessionId?: string): FileReference[] {
  const data = localStorage.getItem(STORAGE_KEY);
  const refs: FileReference[] = data ? JSON.parse(data) : [];
  return sessionId ? refs.filter(r => r.sessionId === sessionId) : refs;
}

export function deleteFileRefs(sessionId: string): void {
  const refs = getFileRefs().filter(r => r.sessionId !== sessionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(refs));
}
```
