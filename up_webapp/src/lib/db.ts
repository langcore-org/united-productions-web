import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'chat.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    mode TEXT DEFAULT 'default',
    system_prompt TEXT,
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

  CREATE TABLE IF NOT EXISTS generated_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS session_todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
    active_form TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_generated_files_session ON generated_files(session_id);
  CREATE INDEX IF NOT EXISTS idx_session_todos_session ON session_todos(session_id);
`);

// Migration: Add mode and system_prompt columns if they don't exist
try {
  db.exec(`ALTER TABLE sessions ADD COLUMN mode TEXT DEFAULT 'default'`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE sessions ADD COLUMN system_prompt TEXT`);
} catch { /* column already exists */ }

// Types
export interface Session {
  id: string;
  title: string | null;
  mode: string;
  system_prompt: string | null;
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

export interface GeneratedFile {
  id: number;
  session_id: string;
  file_path: string;
  created_at: string;
}

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

export interface SessionTodo {
  id: number;
  session_id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  active_form: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Create session
export function createSession(
  id: string,
  title?: string,
  mode?: string,
  systemPrompt?: string
): Session {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, title, mode, system_prompt) VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, title || null, mode || 'default', systemPrompt || null);
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session;
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
    SELECT s.*,
      (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as message_count,
      (SELECT content FROM messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM sessions s
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
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

  // Auto-generate title from first user message
  const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE session_id = ?').get(sessionId) as { count: number };
  if (messageCount.count === 0 && role === 'user') {
    const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
    db.prepare('UPDATE sessions SET title = ? WHERE id = ?').run(title, sessionId);
  }

  // Insert message
  db.prepare(`
    INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)
  `).run(id, sessionId, role, content);

  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Message;
}

// Delete session
export function deleteSession(id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

// Update session title
export function updateSessionTitle(id: string, title: string): void {
  db.prepare(`UPDATE sessions SET title = ?, updated_at = datetime('now') WHERE id = ?`).run(title, id);
}

// Add generated file
export function addGeneratedFile(sessionId: string, filePath: string): GeneratedFile {
  // Check if already exists
  const existing = db.prepare(
    'SELECT * FROM generated_files WHERE session_id = ? AND file_path = ?'
  ).get(sessionId, filePath) as GeneratedFile | undefined;

  if (existing) return existing;

  db.prepare(`
    INSERT INTO generated_files (session_id, file_path) VALUES (?, ?)
  `).run(sessionId, filePath);

  return db.prepare(
    'SELECT * FROM generated_files WHERE session_id = ? AND file_path = ?'
  ).get(sessionId, filePath) as GeneratedFile;
}

// Get generated files for session
export function getGeneratedFiles(sessionId: string): GeneratedFile[] {
  return db.prepare(
    'SELECT * FROM generated_files WHERE session_id = ? ORDER BY created_at ASC'
  ).all(sessionId) as GeneratedFile[];
}

// Save todos (replace all for session)
export function saveTodos(sessionId: string, todos: TodoItem[]): void {
  // Delete existing todos for this session
  db.prepare('DELETE FROM session_todos WHERE session_id = ?').run(sessionId);

  if (todos.length === 0) return;

  // Insert new todos
  const insert = db.prepare(`
    INSERT INTO session_todos (session_id, content, status, active_form, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: TodoItem[]) => {
    items.forEach((todo, index) => {
      insert.run(sessionId, todo.content, todo.status, todo.activeForm, index);
    });
  });

  insertMany(todos);
}

// Get todos for session
export function getTodos(sessionId: string): TodoItem[] {
  const rows = db.prepare(
    'SELECT content, status, active_form as activeForm FROM session_todos WHERE session_id = ? ORDER BY sort_order ASC'
  ).all(sessionId) as { content: string; status: string; activeForm: string }[];

  return rows.map(r => ({
    content: r.content,
    status: r.status as 'pending' | 'in_progress' | 'completed',
    activeForm: r.activeForm,
  }));
}

// Clear all messages for a session (keep session, todos, and files)
export function clearMessages(sessionId: string): void {
  db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
  db.prepare(`UPDATE sessions SET updated_at = datetime('now') WHERE id = ?`).run(sessionId);
}

export { db };
