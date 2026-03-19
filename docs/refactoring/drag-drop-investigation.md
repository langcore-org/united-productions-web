# ドラッグ＆ドロップ機能実装調査レポート

**調査日**: 2026-03-18  
**調査対象**: チャット画面のファイルドラッグ＆ドロップ機能  
**調査者**: AI Assistant

---

## 1. 概要

本レポートは、Teddyアプリケーション内のファイルドラッグ＆ドロップ機能の実装状況を網羅的に調査し、問題点とリファクタリング方針をまとめたものです。

### 1.1 対象機能
- チャット画面（FeatureChat）でのファイルドラッグ＆ドロップ
- ファイル添付コンポーネント（FileAttachment）
- ファイルアップロードコンポーネント（FileUpload）
- 会議議事録用アップロード（FileUploadChat）

---

## 2. 実装詳細

### 2.1 関連ファイル一覧

| ファイルパス | 用途 | ドラッグ＆ドロップ関連コード行数 |
|-------------|------|-------------------------------|
| `components/ui/FeatureChat.tsx` | チャット本体 | 90行（新規実装） |
| `components/ui/FileAttachment.tsx` | ファイル添付UI | 35行 |
| `components/ui/FileUpload.tsx` | ファイルアップロード（議事録等） | 30行 |
| `components/meeting-notes/FileUploadChat.tsx` | 会議議事録用 | 0行（UIのみ） |
| `hooks/useFileUpload.ts` | アップロードフック | 0行（API通信のみ） |
| `lib/chat/file-content.ts` | ファイル処理ユーティリティ | ファイル種別判定 |
| `config/constants.ts` | 定数 | MAX_FILE_SIZE_MB |

### 2.2 FeatureChat.tsx（チャット画面）

#### 実装された機能（2026-03-18）
```typescript
// 状態管理
const [isDragging, setIsDragging] = useState(false);
const [dragError, setDragError] = useState<string | null>(null);
const dragCounter = useRef(0);  // ドラッグカウンター（ネスト対策）

// ファイル処理
const processFile = useCallback(async (file: File): Promise<AttachedFile> => {...}, []);
const validateFile = useCallback((file: File): string | null => {...}, []);
const handleFiles = useCallback(async (fileList: FileList | null) => {...}, [...]);

// ドラッグ＆ドロップイベントハンドラ
const handleDragEnter = useCallback((e: React.DragEvent) => {...}, [isPending, enableFileAttachment]);
const handleDragLeave = useCallback((e: React.DragEvent) => {...}, []);
const handleDragOver = useCallback((e: React.DragEvent) => {...}, []);
const handleDrop = useCallback((e: React.DragEvent) => {...}, [handleFiles]);
```

#### UI実装
```tsx
<section
  aria-label="チャットエリア"
  onDragEnter={handleDragEnter}
  onDragLeave={handleDragLeave}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
>
  {/* ドラッグ中オーバーレイ */}
  {isDragging && (
    <div className="fixed inset-0 z-50 bg-gray-900/20 backdrop-blur-sm">
      <div className="bg-white border-2 border-dashed border-gray-700 rounded-2xl p-12">
        <Paperclip className="w-12 h-12" />
        <p>ファイルをドロップ</p>
      </div>
    </div>
  )}
  
  {/* エラーメッセージ */}
  {dragError && (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50...">
      {dragError}
    </div>
  )}
</section>
```

#### バリデーション仕様
- 最大ファイル数: 5ファイル
- 最大ファイルサイズ: 10MB（MAX_FILE_SIZE_MB）
- 対応形式: テキスト、画像、コードファイル
- ストリーミング中: 無効化

### 2.3 FileAttachment.tsx

#### 実装済み機能
- ドラッグオーバーレイ表示（fixed inset-0）
- ファイルチップ表示（添付済みファイル）
- ファイル削除機能
- エラー表示

#### 未使用コードの問題
```typescript
// _handleDragOver が定義されているが未使用（handleDragOverの Typo?）
const _handleDragOver = useCallback(...);  // 140行目

// ドラッグオーバーレイは表示されるが、親要素にドラッグイベントが未設定
<div
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
```

### 2.4 FileUpload.tsx

#### 実装済み機能
- ドラッグ＆ドロップエリア（border-2 border-dashed）
- ドラッグ状態によるスタイル変更
- Google Drive連携
- ファイルサイズ・形式バリデーション

#### 仕様
- 単一ファイルのみ対応（files[0]）
- 対応形式: .txt, .vtt, .docx
- 最大サイズ: 10MB

### 2.5 重複実装の検出

#### 重複1: ファイル処理ロジック
```typescript
// FeatureChat.tsx と FileAttachment.tsx で同じ processFile 関数
const processFile = async (file: File): Promise<AttachedFile> => {
  // FileReader を使用した同じ処理
};
```

#### 重複2: バリデーション
```typescript
// 複数ファイルで同じバリデーション
if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {...}
```

#### 重複3: ドラッグイベントハンドラ
```typescript
// 全コンポーネントで同じパターン
e.preventDefault();
e.stopPropagation();
```

---

## 3. 問題点

### 3.1 コード重複（重大度: 高）
| 項目 | 重複箇所 | 影響 |
|-----|---------|------|
| processFile | FeatureChat, FileAttachment, FileAttachButton | 修正時の漏れリスク |
| validateFile | FeatureChat, FileAttachment, FileUpload | サイズ制限の不統一 |
| ドラッグハンドラ | 3コンポーネント | 挙動の不統一 |
| ACCEPTED_TYPES | FileAttachment, FileAttachButton | メンテナンス困難 |

### 3.2 未使用コード（重大度: 中）
- `FileAttachment.tsx` の `_handleDragOver`（Typo?）
- ドラッグイベントが親要素に設定されていない

### 3.3 アクセシビリティ（重大度: 中）
- biome-ignore コメントが多用されている
- キーボード操作の考慮不足
- スクリーンリーダー対応の不備

### 3.4 状態管理の問題（重大度: 中）
- `dragCounter` の管理が複雑（ネスト対策）
- 複数コンポーネントで類似の状態を持つ

### 3.5 エラーハンドリング（重大度: 低）
- エラーメッセージの表示位置が統一されていない
- エラークリアのタイミングが不統一

---

## 4. 技術的負債

### 4.1 既存の Suppression コメント
```typescript
// biome-ignore lint/correctness/useExhaustiveDependencies: 依存関係は安定
// biome-ignore lint/a11y/noStaticElementInteractions: ドラッグオーバーレイはdivで実装
// eslint-disable-next-line react-hooks/exhaustive-deps
```

### 4.2 型安全性
- `FileReader` の結果キャストに `as string` を使用
- `any` の使用はないが、型推論に依存

---

## 5. リファクタリングプラン

### Phase 1: カスタムフックの抽出（優先度: 高）

#### 5.1.1 useDragAndDrop フックの作成
```typescript
// hooks/useDragAndDrop.ts
interface UseDragAndDropOptions {
  onFilesDrop: (files: FileList) => void;
  disabled?: boolean;
  acceptedTypes?: string[];
  maxFiles?: number;
  maxSizeMB?: number;
}

interface UseDragAndDropReturn {
  isDragging: boolean;
  dragError: string | null;
  handlers: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  clearError: () => void;
}
```

#### 5.1.2 useFileProcessor フックの作成
```typescript
// hooks/useFileProcessor.ts
interface UseFileProcessorOptions {
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

interface UseFileProcessorReturn {
  processFiles: (files: FileList) => Promise<AttachedFile[]>;
  validateFile: (file: File) => string | null;
  isProcessing: boolean;
}
```

### Phase 2: ユーティリティ関数の統合（優先度: 高）

#### 5.2.1 lib/file-utils.ts の作成
```typescript
// lib/file-utils.ts
export const FILE_CONSTANTS = {
  MAX_SIZE_MB: 10,
  MAX_FILES: 5,
  ACCEPTED_TYPES: {
    TEXT: ['text/plain', 'text/markdown', 'text/csv'],
    IMAGE: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    CODE: ['application/json', 'text/javascript'],
  },
} as const;

export function validateFileSize(file: File, maxSizeMB: number): string | null;
export function validateFileType(file: File, acceptedTypes: string[]): string | null;
export async function readFileAsText(file: File): Promise<string>;
export async function readFileAsDataURL(file: File): Promise<string>;
export function formatFileSize(bytes: number): string;
export function generateFileId(): string;
```

### Phase 3: コンポーネントの統合（優先度: 中）

#### 5.3.1 DragDropOverlay コンポーネント
```tsx
// components/ui/DragDropOverlay.tsx
interface DragDropOverlayProps {
  isVisible: boolean;
  title?: string;
  description?: string;
}
```

#### 5.3.2 FileValidationError コンポーネント
```tsx
// components/ui/FileValidationError.tsx
interface FileValidationErrorProps {
  error: string | null;
  onClear: () => void;
  position?: 'top' | 'inline';
}
```

### Phase 4: 既存コンポーネントの修正（優先度: 中）

#### 5.4.1 FeatureChat.tsx
- 新規フックへの移行
- 重複コードの削除
- エラーハンドリングの統一

#### 5.4.2 FileAttachment.tsx
- 未使用コードの削除
- 親コンポーネントへのイベント委譲検討

#### 5.4.3 FileUpload.tsx
- 新規フックへの移行
- 重複コードの削除

### Phase 5: アクセシビリティ改善（優先度: 低）

- ARIA属性の追加
- キーボード操作対応
- スクリーンリーダーテスト

---

## 6. 推奨されるディレクトリ構造

```
components/
  ui/
    file-upload/
      index.ts
      FileUpload.tsx           # メインコンポーネント
      FileUploadDropzone.tsx   # ドロップゾーン
      FileUploadList.tsx       # ファイルリスト
      FileUploadError.tsx      # エラー表示
      hooks/
        useDragAndDrop.ts
        useFileProcessor.ts
      utils/
        file-validation.ts
        file-reader.ts
hooks/
  useDragAndDrop.ts            # 共通フック
  useFileProcessor.ts          # 共通フック
lib/
  file/
    constants.ts               # ファイル関連定数
    validation.ts              # バリデーション
    formatters.ts              # フォーマッター
```

---

## 7. 実装優先順位

| 順位 | タスク | 工数見積 | 影響範囲 |
|-----|--------|---------|---------|
| 1 | useFileProcessor フック作成 | 2h | FeatureChat, FileAttachment |
| 2 | lib/file-utils.ts 作成 | 1h | 全ファイルコンポーネント |
| 3 | FeatureChat リファクタリング | 2h | FeatureChat のみ |
| 4 | FileAttachment リファクタリング | 1h | FileAttachment のみ |
| 5 | useDragAndDrop フック作成 | 2h | 全ドラッグ＆ドロップ機能 |
| 6 | アクセシビリティ改善 | 2h | 全コンポーネント |
| **計** | | **10h** | |

---

## 8. リスクと対策

| リスク | 重大度 | 対策 |
|--------|--------|------|
| リファクタリング中の機能退行 | 高 | 既存テストの拡充、段階的移行 |
| ファイル形式判定の変更による影響 | 中 | 仕様ドキュメントの整備 |
| パフォーマンス低下 | 低 | useMemo/useCallback の適切な使用 |

---

## 9. 結論

現在のドラッグ＆ドロップ機能は**複数コンポーネントにコードが重複**しており、メンテナンス性と一貫性に問題があります。特に `processFile` 関数とバリデーションロジックは3箇所以上で重複しており、修正時の漏れリスクが高い状態です。

**推奨アクション**:
1. **即座に** Phase 1（カスタムフック化）を実施
2. **1週間以内に** Phase 2（ユーティリティ統合）を実施
3. **次のスプリントで** Phase 3-4（コンポーネント統合）を実施
4. **余裕がある時に** Phase 5（アクセシビリティ）を実施

---

## 付録: 関連リンク

- [React DnD](https://react-dnd.github.io/react-dnd/) - より高度なドラッグ＆ドロップが必要になった場合の検討材料
- [MDN: HTML Drag and Drop API](https://developer.mozilla.org/ja/docs/Web/API/HTML_Drag_and_Drop_API)
