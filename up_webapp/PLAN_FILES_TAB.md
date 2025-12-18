# 実装計画: Task Section タブ分割 (Tasks / Files)

## 概要
現在のTask Sectionを2つのタブに分割し、セッション中に生成されたファイルを表示・プレビューできるようにする。

## 目標
1. TodoListコンポーネントをタブ付きに拡張
2. 「Tasks」タブ: 現在のTodoリスト表示
3. 「Files」タブ: セッション中に生成されたファイル一覧
4. ファイルクリックでプレビュー表示

## アーキテクチャ

### データフロー
```
Claude Code → Wrapper (tool_use: Write検出) → file_created event → Chat UI → Files Tab
```

### ファイル変更一覧

#### 1. claude-code-openai-wrapper/src/main.py
- Writeツール実行を検出
- `file_created` イベントをSSEで送信
```python
if tool_name == "Write":
    file_path = tool_input.get("file_path", "")
    file_event = {"type": "file_created", "path": file_path}
    yield f"data: {json.dumps(file_event)}\n\n"
```

#### 2. next-chat-ui-cc-wrapper/src/app/api/chat/route.ts
- `file_created` イベントをパースしてフロントエンドに転送
```typescript
if (parsed.type === 'file_created' && parsed.path) {
    const fileData = JSON.stringify([{ type: 'file_created', path: parsed.path }]);
    controller.enqueue(encoder.encode(`2:${fileData}\n`));
}
```

#### 3. next-chat-ui-cc-wrapper/src/components/chat/ChatContainer.tsx
- `generatedFiles` 状態を追加
- data streamから`file_created`イベントを処理
```typescript
const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);

// Handle file_created events
if (item.type === 'file_created' && item.path) {
    setGeneratedFiles(prev => [...prev, { path: item.path, createdAt: new Date() }]);
}
```
- TaskPanelに `generatedFiles` を渡す

#### 4. next-chat-ui-cc-wrapper/src/components/chat/TodoList.tsx → TaskPanel.tsx にリネーム
- タブUIを追加 (Tasks / Files)
- Filesタブでファイル一覧表示
- ファイルクリックでプレビューモーダル or 新しいパネル

#### 5. 新規: next-chat-ui-cc-wrapper/src/components/chat/FilePreview.tsx
- 画像/Markdownファイルのプレビューコンポーネント
- 画像: `<img>` タグで表示
- Markdown: react-markdownでレンダリング

## UIデザイン

### TaskPanel (旧TodoList)
```
┌─────────────────────────────────────────┐
│ [Tasks (3/5)]  [Files (2)]              │ ← タブ
├─────────────────────────────────────────┤
│ Files タブ表示時:                        │
│ ┌─────────────────────────────────────┐ │
│ │ 📄 QuizKnock企画/QuizKnock企画.md   │ │
│ │    12:34:56                          │ │
│ ├─────────────────────────────────────┤ │
│ │ 🖼️ QuizKnock企画/insight_1.png      │ │
│ │    12:35:12                          │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### ファイルクリック時
- 画像: モーダルで拡大表示
- Markdown: 新しいパネルでプレビュー or サイドパネル

## 実装順序

### Step 1: Wrapper側でfile_createdイベント送信
1. `main.py` でWriteツール検出時にイベント送信

### Step 2: Chat API側でイベント転送
1. `route.ts` で `file_created` イベントをパース・転送

### Step 3: フロントエンド状態管理
1. `ChatContainer.tsx` に `generatedFiles` 状態追加
2. data streamから `file_created` 処理

### Step 4: TaskPanel UI
1. `TodoList.tsx` を `TaskPanel.tsx` にリネーム
2. タブUI実装
3. Filesタブでファイル一覧表示

### Step 5: FilePreview コンポーネント
1. 画像プレビュー
2. Markdownプレビュー (react-markdown導入必要?)

### Step 6: プレビュー統合
1. ファイルクリック時のプレビュー表示ロジック

## 技術的考慮事項

### 画像表示
- `/api/files/[path]` で画像バイナリを取得可能か確認
- Base64エンコードで埋め込み or URL直接参照

### Markdownレンダリング
- 既存の依存関係確認 (react-markdown など)
- なければ `whitespace-pre-wrap` でプレーンテキスト表示

### パス正規化
- 絶対パス → 相対パス (data/files/ からの相対)
- 日本語ファイル名のエンコーディング処理

## 見積もり
- Step 1-2: 30分 (Wrapper + API)
- Step 3-4: 45分 (フロントエンド状態 + タブUI)
- Step 5-6: 45分 (プレビュー機能)
- テスト・調整: 30分
- **合計: 約2.5時間**
