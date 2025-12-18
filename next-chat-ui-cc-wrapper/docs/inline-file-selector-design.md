# Inline File Selector Design Document

## Overview

ファイル/ディレクトリ参照をメッセージ内でインライン表示し、オブジェクトとして管理する機能の設計書。

## 背景と目的

### 現状 (As-Is)
- `@` マークでファイルを選択すると、メッセージ入力欄の外側にチップとして表示される
- ファイルのみ選択可能、ディレクトリは選択不可
- ファイルがどの文脈で使用されるか不明確

### 目標 (To-Be)
- `@file.py を要約して` のように、メッセージ内でインライン表示
- ディレクトリも選択可能（サブディレクトリ含む）
- ユーザーの意図が明確になる

### 目的
- ユーザーがロードしたファイルの使用目的を明確化
- 複数ファイル/ディレクトリの比較・参照を容易に

---

## 機能要件

### 1. インラインファイル参照

#### 動作フロー
1. ユーザーがテキスト入力中に `@` を入力
2. ファイル/ディレクトリピッカーが表示
3. 選択するとカーソル位置にチップが挿入
4. チップは編集不可のオブジェクトとして管理
5. チップの `×` ボタンで削除可能

#### UI仕様
```
┌─────────────────────────────────────────────────────────────┐
│ [📄 file1.py] と [📁 src/] を比較して解説して               │
│      ↑チップ         ↑チップ                                │
│      (編集不可)      (編集不可)                             │
└─────────────────────────────────────────────────────────────┘
```

#### チップ表示
- ファイル: `📄 {filename}` (青色背景)
- ディレクトリ: `📁 {dirname}/` (緑色背景)
- PDF: `📕 {filename}` (赤色背景)
- 画像: `🖼️ {filename}` (紫色背景)

### 2. ディレクトリ選択

#### 動作仕様
- サブディレクトリを含む再帰的なファイルカウント
- ファイル数をピッカーに表示
- **100ファイル以上のディレクトリは選択不可** (グレーアウト + 警告)

#### ピッカーUI
```
┌─────────────────────────────────────┐
│ Select a file or directory          │
├─────────────────────────────────────┤
│ 📁 src/              (23 files)     │  ← 選択可能
│ 📁 tests/            (8 files)      │  ← 選択可能
│ 📁 node_modules/     ⚠️ 5000+ files │  ← 選択不可、グレーアウト
│ 📄 README.md         2.1KB          │
│ 📄 package.json      1.5KB          │
└─────────────────────────────────────┘
```

### 3. 制限事項
- 1メッセージあたりの参照数上限: 10個
- ディレクトリ内ファイル数上限: 100個
- 合計ファイルサイズ上限: 100MB (既存制限)

---

## データ構造

### FileReference (参照オブジェクト)
```typescript
interface FileReference {
  id: string;              // ユニークID (uuid)
  type: 'file' | 'directory';
  path: string;            // 相対パス (data/files からの)
  absolutePath: string;    // 絶対パス
  displayName: string;     // 表示名 (ファイル名 or ディレクトリ名/)
  size?: number;           // バイトサイズ (ファイルの場合)
  fileCount?: number;      // ファイル数 (ディレクトリの場合)
  isBinary?: boolean;      // バイナリファイルか
  isPdf?: boolean;         // PDFファイルか
}
```

### 入力状態管理
```typescript
interface InputState {
  // プレーンテキスト部分 (プレースホルダー付き)
  // 例: "{{ref:abc123}} と {{ref:def456}} を比較して"
  rawText: string;

  // 参照オブジェクトのマップ
  references: Map<string, FileReference>;

  // カーソル位置
  cursorPosition: number;
}
```

### 送信時のメッセージ構築
```typescript
// 送信時に rawText のプレースホルダーを展開
function buildMessageContent(state: InputState): string {
  let content = state.rawText;

  for (const [id, ref] of state.references) {
    const placeholder = `{{ref:${id}}}`;
    if (ref.type === 'directory') {
      // ディレクトリの場合: 全ファイルの内容を展開
      const filesContent = await loadDirectoryContents(ref.absolutePath);
      content = content.replace(placeholder, filesContent);
    } else {
      // ファイルの場合: 既存のロジック
      const fileContent = await loadFileContent(ref);
      content = content.replace(placeholder, fileContent);
    }
  }

  return content;
}
```

---

## API設計

### GET /api/files (既存エンドポイント拡張)

#### レスポンス変更
```typescript
interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: string;
  // 新規追加
  fileCount?: number;        // ディレクトリの場合のファイル数
  isSelectable?: boolean;    // 選択可能か (100ファイル以下)
}
```

### GET /api/files/directory/{path} (新規エンドポイント)

ディレクトリの詳細情報を取得。

#### リクエスト
```
GET /api/files/directory/src
```

#### レスポンス
```json
{
  "path": "src",
  "absolutePath": "/Users/.../data/files/src",
  "fileCount": 23,
  "totalSize": 45678,
  "isSelectable": true,
  "files": [
    { "path": "src/index.ts", "size": 1234 },
    { "path": "src/utils/helper.ts", "size": 567 }
  ]
}
```

#### エラーレスポンス (100ファイル超過)
```json
{
  "error": "Directory contains too many files",
  "fileCount": 5000,
  "maxAllowed": 100,
  "isSelectable": false
}
```

---

## コンポーネント設計

### 1. InlineChip コンポーネント (新規)
```
src/components/chat/InlineChip.tsx
```

テキスト入力欄内に表示される編集不可のチップ。

```typescript
interface InlineChipProps {
  reference: FileReference;
  onRemove: (id: string) => void;
}
```

### 2. ChatInput コンポーネント (改修)
```
src/components/chat/ChatInput.tsx
```

主な変更点:
- `textarea` から `contenteditable div` へ変更 (インラインチップ対応)
- `attachedFiles` state を `InputState` に変更
- `@` 検出ロジックの改修

### 3. FilePicker コンポーネント (改修)
```
src/components/chat/FilePicker.tsx (新規抽出)
```

ファイルピッカーを独立コンポーネント化:
- ディレクトリ表示対応
- ファイル数表示
- 100+制限のグレーアウト

---

## 実装ステップ

### Phase 1: API拡張
1. `/api/files` のレスポンスにディレクトリのファイル数を追加
2. `/api/files/directory/[...path]` エンドポイント追加

### Phase 2: データ構造
1. `FileReference` 型定義
2. `InputState` 型定義
3. 状態管理ロジック実装

### Phase 3: UI コンポーネント
1. `InlineChip` コンポーネント作成
2. `FilePicker` コンポーネント抽出・改修
3. `ChatInput` の `contenteditable` 対応

### Phase 4: 統合
1. ファイル/ディレクトリ選択フロー統合
2. 送信時のメッセージ構築ロジック
3. エラーハンドリング

---

## テストケース

### 機能テスト
1. `@` 入力でピッカーが表示される
2. ファイル選択でチップが挿入される
3. ディレクトリ選択でチップが挿入される
4. 100+ファイルのディレクトリは選択不可
5. チップの `×` で削除できる
6. 複数チップを挿入できる
7. 送信時にファイル内容が展開される

### エッジケース
1. 空のディレクトリ選択
2. ネストしたディレクトリ
3. 日本語ファイル名
4. 特殊文字を含むパス
5. 同じファイルを複数回参照

---

## 今後の拡張可能性

- ファイルタイプフィルター (`@*.py` で Python ファイルのみ)
- 最近使用したファイルの履歴表示
- ドラッグ&ドロップでのファイル追加
- ファイルプレビューのホバー表示
