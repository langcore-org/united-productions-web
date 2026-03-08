# Background Session Execution

## 概要

セッションがバックグラウンドで継続実行され、ユーザーがリロードや別セッションに切り替えても処理が継続する機能。

## 現状の問題 (2025-12-08)

### 診断結果

```
現状:
┌─────────────────────────────────────────────────────────────┐
│ 1. セッション状態は「running」とマークされている             │
│ 2. しかし、クライアント切断時に実際の処理は停止している      │
│ 3. バッファには切断前のイベントしか残っていない              │
│ 4. 再接続しても、新しいイベントは生成されない                │
└─────────────────────────────────────────────────────────────┘
```

### 原因

`generate_streaming_response` は `async generator` として実装されている。
クライアントが接続を切断すると、FastAPIのStreamingResponseがgeneratorの反復を停止し、
結果として `claude_cli.run_completion()` も停止する。

```python
# 現在の実装 (main.py)
async def generate_streaming_response(...) -> AsyncGenerator[str, None]:
    # クライアント切断時、このgenerator全体が停止する
    async for chunk in claude_cli.run_completion(...):
        yield buffer_and_format(...)  # ← クライアント切断でここも停止
```

## 解決策: 真のバックグラウンド実行

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Wrapper (FastAPI)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  POST /chat/completions                                     │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ BackgroundSessionManager                             │   │
│  │                                                      │   │
│  │  sessions: Dict[session_id, BackgroundTask]         │   │
│  │                                                      │   │
│  │  start_session(session_id, request)                 │   │
│  │    → asyncio.create_task(run_completion)            │   │
│  │    → バッファにイベント蓄積                          │   │
│  │                                                      │   │
│  │  subscribe(session_id)                              │   │
│  │    → 新規イベントをSSEでストリーム                   │   │
│  │    → 切断しても Task は継続                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  GET /sessions/{id}/status                                  │
│       → セッション状態を返す                                │
│                                                             │
│  GET /sessions/{id}/buffer                                  │
│       → バッファされたイベントを返す                        │
│                                                             │
│  POST /sessions/{id}/stop                                   │
│       → Task をキャンセル                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 実行フロー

```
[新規リクエスト]
    │
    ▼
┌─────────────────────────────────────┐
│ 1. BackgroundTask を作成            │
│    task = asyncio.create_task(...)  │
│                                     │
│ 2. session_id → task をマッピング   │
│                                     │
│ 3. SSE ストリームを開始             │
│    - Task の出力を購読              │
│    - バッファにも蓄積               │
└─────────────────────────────────────┘
    │
    ▼
[クライアント接続中]
    │
    ├─ Task 実行中 ──────▶ SSE で送信
    │                     + バッファに蓄積
    │
    ▼
[クライアント切断]
    │
    ├─ Task は継続実行 ──▶ バッファにのみ蓄積
    │
    ▼
[再接続]
    │
    ├─ バッファから既存イベント取得
    │
    ├─ Task がまだ実行中なら
    │   └─ SSE で新規イベント購読
    │
    └─ Task 完了済みなら
        └─ バッファから全結果取得
```

### データ構造

```python
@dataclass
class BackgroundSession:
    session_id: str
    task: asyncio.Task
    request: ChatCompletionRequest
    status: SessionStatus  # running, completed, error, stopped
    event_queue: asyncio.Queue  # リアルタイム購読用
    started_at: datetime
    completed_at: Optional[datetime]
    error_message: Optional[str]
```

### イベントキュー vs バッファ

```
┌──────────────────┬─────────────────────────────────────────┐
│ event_queue      │ リアルタイム購読者向け (メモリ)          │
│                  │ - 接続中のクライアントに即座に配信       │
│                  │ - 購読者がいない場合はスキップ           │
├──────────────────┼─────────────────────────────────────────┤
│ session_buffer   │ 永続化 (SQLite)                         │
│ (既存)           │ - 全イベントを保存                       │
│                  │ - 再接続時の復元用                       │
└──────────────────┴─────────────────────────────────────────┘
```

## 実装計画

### Phase 1: BackgroundSessionManager

```python
# src/background_session.py

class BackgroundSessionManager:
    def __init__(self):
        self.sessions: Dict[str, BackgroundSession] = {}
        self._lock = asyncio.Lock()

    async def start_or_subscribe(
        self,
        session_id: str,
        request: Optional[ChatCompletionRequest] = None
    ) -> AsyncGenerator[str, None]:
        """
        セッションを開始するか、既存セッションを購読する。
        """
        async with self._lock:
            if session_id in self.sessions:
                # 既存セッションを購読
                session = self.sessions[session_id]
            elif request:
                # 新規セッションを開始
                session = await self._create_session(session_id, request)
            else:
                raise ValueError("Session not found and no request provided")

        # イベントをストリーム
        async for event in self._subscribe(session):
            yield event

    async def _create_session(
        self,
        session_id: str,
        request: ChatCompletionRequest
    ) -> BackgroundSession:
        """バックグラウンドタスクを作成"""
        queue = asyncio.Queue()

        session = BackgroundSession(
            session_id=session_id,
            task=None,  # 後で設定
            request=request,
            status=SessionStatus.RUNNING,
            event_queue=queue,
            started_at=datetime.utcnow(),
            completed_at=None,
            error_message=None,
        )

        # バックグラウンドタスクを作成
        task = asyncio.create_task(
            self._run_completion(session, request)
        )
        session.task = task

        self.sessions[session_id] = session
        return session

    async def _run_completion(
        self,
        session: BackgroundSession,
        request: ChatCompletionRequest
    ):
        """実際の処理を実行（バックグラウンド）"""
        try:
            async for chunk in claude_cli.run_completion(...):
                event = process_chunk(chunk)

                # バッファに保存
                session_buffer.buffer_event(session.session_id, event)

                # キューに追加（購読者向け）
                await session.event_queue.put(event)

            # 完了マーカー
            await session.event_queue.put(None)
            session.status = SessionStatus.COMPLETED

        except asyncio.CancelledError:
            session.status = SessionStatus.STOPPED
        except Exception as e:
            session.status = SessionStatus.ERROR
            session.error_message = str(e)

    async def _subscribe(
        self,
        session: BackgroundSession
    ) -> AsyncGenerator[str, None]:
        """セッションのイベントを購読"""
        # まずバッファから既存イベントを送信
        events, last_id, _ = session_buffer.get_buffered_events(session.session_id)
        for event in events:
            yield format_sse(event)

        # タスクが完了していれば終了
        if session.status != SessionStatus.RUNNING:
            return

        # リアルタイムイベントを購読
        while True:
            try:
                event = await asyncio.wait_for(
                    session.event_queue.get(),
                    timeout=30.0
                )
                if event is None:  # 完了マーカー
                    break
                yield format_sse(event)
            except asyncio.TimeoutError:
                # Keep-alive
                yield ": keep-alive\n\n"

    async def stop_session(self, session_id: str) -> bool:
        """セッションを停止"""
        if session_id not in self.sessions:
            return False

        session = self.sessions[session_id]
        if session.task and not session.task.done():
            session.task.cancel()
            return True
        return False
```

### Phase 2: main.py の修正

```python
# グローバルマネージャー
background_manager = BackgroundSessionManager()

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    session_id = request.session_id or str(uuid4())

    if request.stream:
        return StreamingResponse(
            background_manager.start_or_subscribe(session_id, request),
            media_type="text/event-stream"
        )
    else:
        # 非ストリーミングは従来通り
        ...
```

### Phase 3: フロントエンド対応

既存の実装で対応可能:
- `checkAndReconnect()` でステータス確認
- `fetchBufferedEvents()` でバッファ取得
- ポーリングで新規イベント取得

## ファイル変更一覧

1. **新規**: `claude-code-openai-wrapper/src/background_session.py`
   - BackgroundSessionManager クラス
   - BackgroundSession データクラス

2. **修正**: `claude-code-openai-wrapper/src/main.py`
   - chat_completions エンドポイント
   - BackgroundSessionManager を使用

3. **修正なし**: `next-chat-ui-cc-wrapper/`
   - 既存の再接続ロジックで対応可能

## リスク評価

| リスク | 影響度 | 対策 |
|--------|--------|------|
| メモリリーク | 中 | 完了セッションの自動クリーンアップ |
| 同時実行数増加 | 中 | セッション数上限の設定 |
| エラーハンドリング | 低 | 既存のエラー処理を活用 |

## テスト計画

1. **基本動作**: 新規リクエスト → 処理完了
2. **再接続**: 処理中に切断 → 再接続 → 続きを受信
3. **停止**: ESCで停止 → 処理が停止される
4. **複数セッション**: 同時に複数セッション実行
5. **エラーケース**: 処理中エラー → エラー状態で再接続
