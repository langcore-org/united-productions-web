# ドラッグ＆ドロップ機能 リファクタリング実装プラン

**初版作成日**: 2026-03-18  
**改訂日**: 2026-03-20  
**ステータス**: 計画段階  
**優先度**: 高

---

## 1. このプランの前提

再調査の結果、今回の対象は単なる drag/drop 共通化ではなく、**チャット添付機能の仕様一本化**であると整理した。

### 1.1 解決したい本質

- ドロップ添付とクリック添付でバリデーションが違う
- `FeatureChat` にファイル処理が寄りすぎている
- `AttachedFile` 型が UI コンポーネントに置かれている
- `FileUpload` 系との共通化方針が曖昧
- テストなしでリファクタしようとしている

### 1.2 今回やらないこと

- `react-dropzone` の導入
- チャット添付と `/api/upload` 解析の完全統合
- Google Drive フローの再設計
- ファイル解析対象の大幅拡張

### 1.3 設計原則

1. ユーザーに見える不整合を最優先で直す
2. 共通化対象は「型・ポリシー・表示部品・ドラッグ状態管理」まで
3. client/server のファイル処理は分離を維持する
4. 未使用コードは先に扱いを決める
5. 先に最小テストを追加してから大きく動かす

---

## 2. 変更対象

### 2.1 主対象ファイル

- `components/ui/FeatureChat.tsx`
- `components/ui/ChatInputArea.tsx`
- `components/ui/FileAttachment.tsx`
- `components/ui/FileUpload.tsx`
- `lib/chat/file-content.ts`
- `config/constants.ts`
- `lib/upload/file-parser.ts`
- `app/api/upload/route.ts`
- `types/upload.ts`

### 2.2 新規作成候補

- `lib/files/attached-file.ts`
- `lib/files/format.ts`
- `lib/files/chat-attachment-policy.ts`
- `hooks/useChatAttachmentProcessor.ts`
- `hooks/useFileDropTarget.ts`
- `components/ui/DragDropOverlay.tsx`
- `components/ui/FileValidationError.tsx`

### 2.3 扱いを先に決めるファイル

- `components/meeting-notes/FileUploadChat.tsx`
- `components/ui/FileAttachment.tsx` の `FileAttachment` 本体

候補:

- 完全に未使用なら削除
- すぐ削除しない場合も、今回の主要リファクタ対象からは外す

---

## 3. 目標状態

### 3.1 チャット添付

- クリック添付とドロップ添付が同じ検証を通る
- 最大件数、サイズ上限、許可形式、エラー表示が統一される
- `FeatureChat` は添付状態の管理のみを担い、ファイル変換の詳細はフックへ移る
- `ChatInputArea` は UI コンポーネントとして薄くなる

### 3.2 アップロード解析

- `FileUpload` は単一ファイルのアップロードUIとして維持
- 共有すべき定数/formatter だけを使う
- `parseFile()` や `/api/upload` の責務はそのまま分離

### 3.3 品質

- 最低限の unit test が存在する
- drag/drop の a11y と状態通知が改善される
- 未使用コードの扱いが明示される

---

## 4. 実装フェーズ

### Phase 0: 事前整理（必須）

理由:

- 対象範囲が曖昧なまま進めると、`FileUploadChat.tsx` や `FileAttachment.tsx` のデッドパスを巻き込みやすくなり、後から「想定外の差分」になって設計が揺れるため。

目的:

- スコープを正しく固定する

タスク:

1. `FileUploadChat.tsx` の扱いを「削除候補」または「対象外 legacy」として明記
2. `FileAttachment.tsx` 本体が未使用であることを確認し、今回の主対象を `FileAttachButton` に絞る
3. チャット添付ポリシーの現行仕様を確定する

確定したい仕様:

- 最大件数: 5
- サイズ上限: 10MB
- 許可形式: 現行互換を保つか、明示的に絞るか
- バイナリファイル: 許可するが内容未読で送るか、拒否するか

成果物:

- 実装スコープの明文化
- ポリシー一覧

### Phase 1: 共通ポリシーと型の抽出（任意）

目的:

- 仕様の単一ソースを作る

タスク:

1. `AttachedFile` 型を UI コンポーネント外へ移動
2. チャット添付用ポリシーを新規モジュールへ定義
3. サイズ表示の formatter を共通化
4. `MAX_FILE_SIZE_MB` / `MAX_FILE_SIZE` の整理方針を決める

推奨構成:

```typescript
// lib/files/attached-file.ts
export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string | null;
}

// lib/files/chat-attachment-policy.ts
export const CHAT_ATTACHMENT_MAX_FILES = 5;
export const CHAT_ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const CHAT_ATTACHMENT_ACCEPT = {
  text: [".txt", ".md", ".csv", ".json"],
  image: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
  code: [".js", ".ts", ".tsx", ".jsx", ".py", ".html", ".css"],
};
```

注意:

- `FileUpload` 用の `.vtt/.docx` 制約と混ぜない
- server-side parser の MIME定義は別に維持してよい

### Phase 2: チャット添付処理の一本化（必須）

理由:

- クリック添付とドロップ添付でバリデーション/エラー/添付結果が分かれると、ユーザーが同じ期待を持てずUXが破綻しやすいため。
- 特に `content: null`（読み込み不可）時の通知文言が経路ごとに欠落すると混乱の原因になるため。

目的:

- ドロップとクリック添付の不一致を解消する

タスク:

1. `useChatAttachmentProcessor.ts` を作成
2. `FeatureChat` の `processFile` / `validateFile` / `handleFiles` を移行
3. `FileAttachButton` からも同じ処理を呼ぶ
4. エラー文字列の管理を親コンポーネントへ寄せる
5. `content: null`（読み込み不可）時のユーザー通知文言を統一

イメージ:

```typescript
interface UseChatAttachmentProcessorOptions {
  existingCount: number;
  disabled?: boolean;
}

interface UseChatAttachmentProcessorReturn {
  addFiles: (fileList: FileList | File[]) => Promise<AttachedFile[]>;
  error: string | null;
  clearError: () => void;
}
```

ポイント:

- UI側では `onFilesSelect([...attachedFiles, ...files])` のような生配列結合をやめる
- `existingCount` を見て最大件数を統一的に判定する
- サイズ超過や読み込み失敗を複数ファイル対応で扱う

### Phase 3: ドラッグ状態管理の抽出（任意）

目的:

- `FeatureChat` から drag event ノイズを減らす

タスク:

1. `useFileDropTarget.ts` を作成
2. `dragCounter` と file-only 判定をフックへ移す
3. `dropEffect` を必要に応じて制御する
4. オーバーレイ UI を `DragDropOverlay` に分離する

イメージ:

```typescript
interface UseFileDropTargetOptions {
  disabled?: boolean;
  onDropFiles: (files: FileList) => void | Promise<void>;
}

interface UseFileDropTargetReturn {
  isDraggingFile: boolean;
  handlers: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}
```

補足:

- このフックは「ドラッグ状態」だけを担う
- バリデーションや `FileReader` は持たせない

### Phase 4: `FeatureChat` / `ChatInputArea` の整理（必須）

理由:

- 添付処理ロジックとUI責務が再び `FeatureChat` に寄ると、同じ問題（重複・不一致・修正漏れ）が再発しやすいため。
- `ChatInputArea` 側で「ユーザー通知（読み込み不可など）」を確実に出せる導線を作るため。

目的:

- 責務分離を完了する

タスク:

1. `FeatureChat` に添付ロジックフックを組み込む
2. `ChatInputArea` を入力UI専用に寄せる
3. `FileAttachButton` に直接ロジックを持たせない
4. `FileValidationError` を共通表示部品として導入する

期待される構造:

```tsx
const {
  addFiles,
  error: attachmentError,
  clearError,
} = useChatAttachmentProcessor({
  existingCount: attachedFiles.length,
  disabled: isPending || !enableFileAttachment,
});

const { isDraggingFile, handlers } = useFileDropTarget({
  disabled: isPending || !enableFileAttachment,
  onDropFiles: async (files) => {
    const next = await addFiles(files);
    if (next.length > 0) {
      setAttachedFiles((prev) => [...prev, ...next]);
    }
  },
});
```

### Phase 5: `FileUpload` 側の最小共通化（任意）

目的:

- 共通化しすぎず、重複だけ減らす

タスク:

1. サイズ formatter を共通化
2. サイズ上限定数の由来を整理
3. 必要なら drag visual state のみ軽く共通化

やらないこと:

- `parseFile()` をチャット添付処理へ寄せる
- `.txt/.vtt/.docx` の受理判定をチャット用 accept と統合する

### Phase 6: テスト追加（必須）

理由:

- この機能領域は回帰が起きやすい（サイズ/件数/読めない形式の分岐、clickとdropの差）一方、現状のテストベースが薄いため。
- 最低限の unit test がないと「仕様統一ができているか」を機械的に検証できないため。

目的:

- リファクタリングの安全性を確保する

最小テスト対象:

1. チャット添付バリデーション
2. 件数制限
3. サイズ超過時のエラー
4. テキスト/画像/バイナリの処理分岐
5. `buildDisplayContent()` / `buildLlmContent()` の出力

候補:

- Vitest unit test
- 必要なら React Testing Library で `ChatInputArea` の添付イベント
- 将来的に Playwright で drag/drop E2E

### Phase 7: アクセシビリティと polish（任意）

目的:

- suppression コメントを減らし、UXを仕上げる

タスク:

1. ファイルドラッグ時のみオーバーレイ表示
2. エラー表示へ live region 検討
3. ドロップ領域案内文とクリック案内文の同期
4. `noStaticElementInteractions` の見直し

---

## 5. 実装順序

1. Phase 0: 事前整理
2. Phase 1: 型・ポリシーの抽出
3. Phase 6 の一部: 最小テスト追加
4. Phase 2: チャット添付処理一本化
5. Phase 3: ドラッグ状態管理抽出
6. Phase 4: `FeatureChat` / `ChatInputArea` 整理
7. Phase 5: `FileUpload` 最小共通化
8. Phase 7: a11y と polish

理由:

- 先に共通仕様とテストを置くことで、後続のフック化を安全に進められる

---

## 6. リスクと対策

| リスク | 重大度 | 対策 |
|--------|--------|------|
| 添付仕様変更による既存UX差分 | 高 | ドロップ/クリック双方で比較確認 |
| 共通化のしすぎで境界が崩れる | 高 | 共有対象を限定し、server parser は別責務のまま維持 |
| 未使用コード整理で判断を誤る | 中 | 削除前に legacy 扱いか完全削除か決める |
| テスト不足で退行を見逃す | 高 | バリデーションと serialization の unit test を先行追加 |

---

## 7. 完了条件

- 必須: チャット添付のクリック/ドロップが同じバリデーションを通る
- 必須: 最大件数・サイズ上限・エラー表示が統一される
- 任意: `AttachedFile` 型が UI コンポーネント外へ移る
- 必須: `FeatureChat` から添付処理詳細が抽出される
- 任意: `FileUpload` は必要最小限の共通化に留まる
- 必須: 最小 unit test が追加される
- 任意: 未使用コードの扱いが決まる
- 必須: ドキュメントが更新される（実装判断の根拠を残し、後から迷わないため）

---

## 8. チェックリスト

- 任意: `FileUploadChat.tsx` の扱いを決める
- 任意: `FileAttachment` 本体の扱いを決める
- 任意: `AttachedFile` 型を移動する
- 任意: チャット添付ポリシーを新設する
- 任意: 共有 formatter / 定数を整理する
- 必須: `useChatAttachmentProcessor.ts` を作成する
- 任意: `useFileDropTarget.ts` を作成する
- 任意: `DragDropOverlay.tsx` を作成する
- 任意: `FileValidationError.tsx` を作成する
- 必須: `FeatureChat.tsx` を移行する
- 必須: `ChatInputArea.tsx` / `FileAttachButton` を移行する
- 任意: `FileUpload.tsx` の最小共通化を行う
- 必須: unit test を追加する（統一仕様が回帰していないことを担保するため）
- 必須: 手動動作確認を行う（drag/drop は自動テストだけで漏れやすいため）
- 必須: 調査レポートと実装プランを更新する（現状差分と方針を固定して次の実装に活かすため）
