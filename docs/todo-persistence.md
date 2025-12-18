# Todo永続化設計

## 概要

セッションのTodoリストをSQLiteに保存し、セッション切り替え・リロード時に復元する機能。

## 背景

現在、generated_files（生成されたファイル）はSQLiteに保存されセッション復元時にロードされるが、
Todoリストは保存されていないため、セッション切り替え時に消えてしまう。

## 実装方針

generated_filesと同じパターンでTodo永続化を実装する。

### 現状のFiles永続化フロー（参考）

```
1. DB: generated_files テーブル (session_id, file_path, created_at)
2. DB関数: addGeneratedFile(), getGeneratedFiles()
3. API: GET /api/sessions/[id] で generatedFiles を返す
4. page.tsx: handleSessionSelect で initialGeneratedFiles をセット
5. ChatContainer: initialGeneratedFiles を受け取り、状態を初期化
```

## データ構造

### TodoItem型（既存）

```typescript
interface TodoItem {
  content: string;      // タスク内容
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;   // 進行中の表示テキスト
}
```

### DBスキーマ

```sql
CREATE TABLE session_todos (
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

CREATE INDEX idx_session_todos_session ON session_todos(session_id);
```

## 実装詳細

### Step 1: DBスキーマ・関数追加 (`src/lib/db.ts`)

```typescript
// Types
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

// Save todos (replace all)
export function saveTodos(sessionId: string, todos: TodoItem[]): void {
  db.prepare('DELETE FROM session_todos WHERE session_id = ?').run(sessionId);

  const insert = db.prepare(`
    INSERT INTO session_todos (session_id, content, status, active_form, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  todos.forEach((todo, index) => {
    insert.run(sessionId, todo.content, todo.status, todo.activeForm, index);
  });
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
```

### Step 2: API修正 (`src/app/api/sessions/[id]/route.ts`)

GETレスポンスにtodosを追加:

```typescript
import { getSession, getGeneratedFiles, getTodos } from '@/lib/db';

export async function GET(...) {
  // ...existing code...
  const generatedFiles = getGeneratedFiles(id);
  const todos = getTodos(id);  // 追加

  return NextResponse.json({ ...result, generatedFiles, todos });  // todos追加
}
```

### Step 3: Todo保存API追加 (`src/app/api/sessions/[id]/todos/route.ts`)

```typescript
import { NextResponse } from 'next/server';
import { saveTodos } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { todos } = await req.json();

  if (!Array.isArray(todos)) {
    return NextResponse.json({ error: 'todos must be an array' }, { status: 400 });
  }

  saveTodos(id, todos);
  return NextResponse.json({ success: true });
}
```

### Step 4: page.tsx修正

```typescript
// 状態追加
const [initialTodos, setInitialTodos] = useState<TodoItem[]>([]);

// handleSessionSelect内
if (data.todos && Array.isArray(data.todos)) {
  setInitialTodos(data.todos);
} else {
  setInitialTodos([]);
}

// ChatContainerへ渡す
<ChatContainer
  initialTodos={initialTodos}
  // ...other props
/>
```

### Step 5: ChatContainer修正

```typescript
interface ChatContainerProps {
  // ...existing props
  initialTodos?: TodoItem[];
}

// Props受け取り
const { initialTodos = [], ...otherProps } = props;

// 初期値設定
const [todos, setTodos] = useState<TodoItem[]>(initialTodos);

// initialTodos変更時に更新
useEffect(() => {
  setTodos(initialTodos);
}, [initialTodos]);

// todo_update時にDB保存
useEffect(() => {
  if (todos.length > 0 && sessionId) {
    fetch(`/api/sessions/${sessionId}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todos }),
    }).catch(err => console.error('Failed to save todos:', err));
  }
}, [todos, sessionId]);
```

## データフロー

```
[Wrapperからtodo_update] → [ChatContainer: setTodos] → [useEffect: API保存]
                                                              ↓
                                                    [SQLite: session_todos]
                                                              ↓
[セッション選択] → [API: GET /sessions/[id]] → [page.tsx: setInitialTodos]
                                                              ↓
                                              [ChatContainer: todos初期化]
```

## ファイル変更一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/db.ts` | session_todosテーブル、saveTodos/getTodos関数 |
| `src/app/api/sessions/[id]/route.ts` | GETでtodosを返す |
| `src/app/api/sessions/[id]/todos/route.ts` | 新規: POST |
| `src/app/page.tsx` | initialTodos状態、セッション選択時にロード |
| `src/components/chat/ChatContainer.tsx` | initialTodos prop、保存処理 |

## 注意点

1. **重複保存の回避**: todo_updateイベントが頻繁に発生するため、debounceまたは変更検知が必要
2. **初期ロード時の保存回避**: initialTodosから設定された直後は保存しない
3. **空配列の扱い**: todosが空の場合は保存しない（または既存を削除）
