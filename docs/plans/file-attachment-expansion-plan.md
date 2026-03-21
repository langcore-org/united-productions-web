# チャットファイル添付機能拡充計画

> **優先度**: 🔴 高  
> **作成日**: 2026-03-20  
> **ステータス**: 📝 計画作成完了（実装待ち）  
> **関連タスク**: 議事録ファイルアップロード機能（既存）

---

## 1. 現状分析

### 1.1 現在の対応状況

#### クライアントサイド（FileAttachment コンポーネント）

| ファイル形式 | 拡張子 | 読み込み方法 | 状態 |
|-------------|--------|-------------|------|
| テキスト | .txt, .md | FileReader (Text) | ✅ 対応済み |
| CSV | .csv | FileReader (Text) | ✅ 対応済み |
| JSON | .json | FileReader (Text) | ✅ 対応済み |
| コード | .js, .ts, .tsx, .jsx, .py, .html, .css | FileReader (Text) | ✅ 対応済み |
| 画像 | .png, .jpg, .jpeg, .gif, .webp | FileReader (DataURL) | ✅ 対応済み |
| PDF | .pdf | なし（content: null） | ⚠️ 未対応（宣言のみ） |

**制限事項:**
- バイナリファイル（PDF, Officeファイル）は `content: null` になり「読み込み不可」表示
- テキストファイルと画像のみクライアントサイドで読み込み可能
- ファイルサイズ上限: 10MB

#### ファイルアップロードAPI (/api/upload)

| ファイル形式 | 拡張子 | ライブラリ | 状態 |
|-------------|--------|-----------|------|
| テキスト | .txt | ネイティブ（文字コード判定） | ✅ 対応済み |
| VTT字幕 | .vtt | ネイティブ（正規表現パース） | ✅ 対応済み |
| Word | .docx | mammoth | ✅ 対応済み |

**未対応だがライブラリ実装あり:**
- PDF: `lib/parsers/document.ts` に実装あり（pdf-parse使用）
- Excel: `lib/parsers/document.ts` に実装あり（xlsx使用）

#### サーバーサイドパーサー (lib/parsers/document.ts)

| ファイル形式 | 拡張子 | ライブラリ | 状態 |
|-------------|--------|-----------|------|
| PDF | .pdf | pdf-parse | ✅ 実装済（未使用） |
| Word | .docx | mammoth | ✅ 実装済（重複） |
| Excel | .xlsx, .xls | xlsx | ✅ 実装済（未使用） |
| CSV | .csv | ネイティブ | ✅ 実装済（未使用） |
| テキスト | .txt | ネイティブ | ✅ 実装済（未使用） |
| 旧Word | .doc | なし | ⚠️ 検出のみ |
| 旧Excel | .xls | xlsx（未検証） | ⚠️ 検出のみ |

### 1.2 現在の問題点

1. **分断された実装**
   - クライアント: `lib/chat/file-content.ts`, `components/ui/FileAttachment.tsx`
   - アップロードAPI: `lib/upload/file-parser.ts`
   - サーバーパーサー: `lib/parsers/document.ts`
   - 重複実装があり、メンテナンス性が低い

2. **バイナリファイルの未対応**
   - PDF, Excel, PowerPointなどが「読み込み不可」表示
   - サーバー側パーサーはあるが、チャット添付フローで未使用

3. **型定義の不整合**
   - `types/upload.ts` と `components/ui/FileAttachment.tsx` で型が重複
   - `SupportedFileType` が古いまま（PDF, Excel未含む）

4. **ライブラリの未インストール**
   - `pdf-parse` が package.json にない（`lib/parsers/document.ts` で動的インポートのみ）

---

## 2. 目標と要件

### 2.1 対応ファイル形式（優先順）

#### Phase 1: 高優先度（即座に対応）

| 形式 | 拡張子 | 用途 | 実装方針 |
|------|--------|------|---------|
| PDF | .pdf | 資料共有 | サーバーサイドパース |
| Excel | .xlsx, .xls | データ・表共有 | サーバーサイドパース |
| PowerPoint | .pptx | プレゼン資料 | 新規実装 |

#### Phase 2: 中優先度（後続対応）

| 形式 | 拡張子 | 用途 | 実装方針 |
|------|--------|------|---------|
| 旧Word | .doc | レガシー対応 | ライブラリ検討 |
| 旧Excel | .xls | レガシー対応 | xlsxで検証 |
| 旧PowerPoint | .ppt | レガシー対応 | ライブラリ検討 |
| ZIP | .zip | 複数ファイル | 要検討 |

#### Phase 3: 低優先度（検討）

| 形式 | 拡張子 | 用途 | 課題 |
|------|--------|------|------|
| 音声 | .mp3, .wav, .m4a | 文字起こし | ファイルサイズ・LLM対応 |
| 動画 | .mp4, .mov | 要約 | ファイルサイズ・LLM対応 |
| Google Workspace | - | Google Drive連携 | 既存実装あり |

### 2.2 非機能要件

- **ファイルサイズ上限**: 現状10MB維持（PDF/Excelで十分）
- **同時添付数**: 現状5ファイル維持
- **セキュリティ**: バイナリファイルの検証（マジックナンバー確認）
- **エラーハンドリング**: パース失敗時の明確なエラーメッセージ
- **パフォーマンス**: 大容量PDF/Excelのタイムアウト対策

---

## 3. 実装設計

### 3.1 アーキテクチャ方針

```
┌─────────────────────────────────────────────────────────────┐
│  クライアント (FileAttachment.tsx)                          │
│  - テキスト/画像: 即座に読み込み                            │
│  - バイナリファイル: /api/parse-file でサーバー処理         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  API Routes                                                 │
│  ├── /api/upload (既存) - シンプルなテキスト/VVT/DOCX       │
│  └── /api/parse-file (新規) - 複雑なバイナリファイル        │
│      ├── PDF → pdf-parse                                    │
│      ├── Excel → xlsx                                       │
│      └── PowerPoint → pptx-parser (新規)                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  統合パーサー (lib/parsers/)                                │
│  - サーバーサイド専用                                       │
│  - 各形式用のパーサーを集約                                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 新規APIエンドポイント

#### POST /api/parse-file

ファイルをアップロードしてサーバー側でパースし、テキストを返す。

**Request:**
```typescript
POST /api/parse-file
Content-Type: multipart/form-data

Body:
- file: File (必須) - PDF, Excel, PowerPoint
- options?: {
    maxPages?: number;      // PDF用: 最大ページ数（デフォルト: 50）
    sheetNames?: string[];  // Excel用: 特定シートのみ抽出
  }
```

**Response:**
```typescript
{
  success: true;
  data: {
    text: string;           // 抽出されたテキスト
    filename: string;
    fileType: string;       // MIME type
    size: number;
    metadata?: {
      pageCount?: number;   // PDF
      sheetCount?: number;  // Excel
      slideCount?: number;  // PowerPoint
    };
  }
}

// エラー時
{
  success: false;
  error: string;
  code: 'UNSUPPORTED_TYPE' | 'FILE_TOO_LARGE' | 'PARSE_ERROR' | 'TIMEOUT';
}
```

### 3.3 パーサー統合

#### 新規: lib/parsers/index.ts

```typescript
/**
 * 統合ファイルパーサー
 * サーバーサイド専用
 */

import { parsePDF } from './pdf';
import { parseExcel } from './excel';
import { parsePowerPoint } from './powerpoint';
import { parseWord } from './word';

export type ParseableFileType = 
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export interface ParseOptions {
  maxPages?: number;
  sheetNames?: string[];
}

export interface ParseResult {
  text: string;
  metadata: {
    pageCount?: number;
    sheetCount?: number;
    slideCount?: number;
  };
}

export async function parseFile(
  buffer: Buffer,
  mimeType: ParseableFileType,
  options?: ParseOptions
): Promise<ParseResult> {
  switch (mimeType) {
    case 'application/pdf':
      return parsePDF(buffer, options);
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return parseExcel(buffer, options);
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return parsePowerPoint(buffer, options);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseWord(buffer, options);
    default:
      throw new Error(`未対応のファイル形式: ${mimeType}`);
  }
}
```

### 3.4 クライアントサイド変更

#### FileAttachment.tsx 修正

```typescript
// 変更前: バイナリファイルは content: null
if (!isTextFile(type) && !type.startsWith("image/")) {
  resolve({ id, name, type, size, content: null }); // ❌ 読み込み不可
}

// 変更後: PDF/Excel/PowerPointはサーバーに送信
if (isServerParseable(type)) {
  const parsed = await parseFileOnServer(file);
  resolve({ id, name, type, size, content: parsed.text });
}
```

#### 新規: lib/file/parse-client.ts

```typescript
/**
 * クライアントサイドからサーバーへファイルパースをリクエスト
 */

export async function parseFileOnServer(
  file: File
): Promise<{ text: string; metadata?: object }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/parse-file', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return {
    text: result.data.text,
    metadata: result.data.metadata,
  };
}

export function isServerParseable(type: string): boolean {
  const serverParseableTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  return serverParseableTypes.includes(type);
}
```

### 3.5 型定義統合

#### types/upload.ts 修正

```typescript
/**
 * ファイルアップロード関連の型定義（統合版）
 */

// クライアントサイドで直接読み込める形式
export type ClientReadableType = 
  | 'text/plain'
  | 'text/csv'
  | 'application/json'
  | 'text/markdown'
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/webp';

// サーバー側パースが必要な形式
export type ServerParsableType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/vtt';

// 全対応形式
export type SupportedFileType = ClientReadableType | ServerParsableType;

// 対応拡張子
export const SUPPORTED_FILE_EXTENSIONS = [
  // クライアント読み込み
  '.txt', '.md', '.csv', '.json',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  // サーバーパース
  '.pdf',
  '.xlsx', '.xls',
  '.pptx',
  '.docx', '.doc',
  '.vtt',
] as const;

// ファイルサイズ上限
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE_MB = 10;

// 添付ファイルインターフェース
export interface AttachedFile {
  id: string;
  name: string;
  type: SupportedFileType | string;
  size: number;
  content: string | null;  // nullの場合はサーバー側パース対象
  metadata?: {
    pageCount?: number;
    sheetCount?: number;
    slideCount?: number;
  };
}

// APIレスポンス
export interface FileParseResponse {
  success: boolean;
  data?: {
    text: string;
    filename: string;
    fileType: string;
    size: number;
    metadata?: {
      pageCount?: number;
      sheetCount?: number;
      slideCount?: number;
    };
  };
  error?: string;
  code?: 'UNSUPPORTED_TYPE' | 'FILE_TOO_LARGE' | 'PARSE_ERROR' | 'TIMEOUT';
}
```

---

## 4. 実装タスク

### Phase 1: 基盤整備（1-2日）

#### 4.1.1 パッケージインストール
```bash
npm install pdf-parse pptx-parser
```

**検討事項:**
- `pdf-parse`: メンテナンス状況確認（2021年以降更新なし）
  - 代替案: `pdfjs-dist` (Mozilla製、メンテナンス良好)
- `pptx-parser`: 軽量なパーサーを選定
  - 代替案: `pptx2json`, `officeparser`

#### 4.1.2 既存パーサー統合
- [ ] `lib/parsers/document.ts` を機能別に分割
  - [ ] `lib/parsers/pdf.ts` - PDF専用
  - [ ] `lib/parsers/excel.ts` - Excel専用
  - [ ] `lib/parsers/word.ts` - Word専用
  - [ ] `lib/parsers/powerpoint.ts` - PowerPoint新規
  - [ ] `lib/parsers/index.ts` - 統合エクスポート

#### 4.1.3 型定義統合
- [ ] `types/upload.ts` を更新（上記設計適用）
- [ ] `components/ui/FileAttachment.tsx` の型を統合型に変更
- [ ] `lib/upload/file-parser.ts` の型を統合型に変更

### Phase 2: API実装（1-2日）

#### 4.2.1 新規APIエンドポイント
- [ ] `app/api/parse-file/route.ts` 作成
  - [ ] multipart/form-data パース
  - [ ] MIMEタイプ検証
  - [ ] ファイルサイズ検証
  - [ ] パーサー呼び出し
  - [ ] エラーハンドリング
  - [ ] タイムアウト処理（30秒）

#### 4.2.2 既存API統合
- [ ] `app/api/upload/route.ts` を `/api/parse-file` に統合検討
  - または、両APIを共存させて段階的移行

### Phase 3: クライアント実装（1-2日）

#### 4.3.1 クライアントパース関数
- [ ] `lib/file/parse-client.ts` 作成
  - [ ] `parseFileOnServer()` 実装
  - [ ] `isServerParseable()` 実装
  - [ ] エラーハンドリング

#### 4.3.2 FileAttachmentコンポーネント改修
- [ ] サーバーパース対応ファイルの判定追加
- [ ] サーバーパース処理の統合
- [ ] ローディング状態の表示（「サーバーで処理中...」）
- [ ] エラー表示の改善

#### 4.3.3 FeatureChat統合
- [ ] 添付ファイルのメタデータ表示（ページ数など）
- [ ] 大容量ファイルの警告表示

### Phase 4: テスト・最適化（1-2日）

#### 4.4.1 テストケース
- [ ] 各ファイル形式のテストファイル準備
- [ ] 単体テスト（Vitest）
- [ ] E2Eテスト（Playwright）

#### 4.4.2 パフォーマンス最適化
- [ ] 大容量PDFの処理検証（10MB）
- [ ] タイムアウト処理の検証
- [ ] メモリ使用量確認

### Phase 5: ドキュメント・リリース（1日）

- [ ] ユーザーガイド更新
- [ ] API仕様書更新
- [ ] リリースノート作成

---

## 5. 技術的検討事項

### 5.1 PDFパーサー選定

| ライブラリ | サイズ | メンテナンス | 特徴 | 推奨 |
|-----------|--------|-------------|------|------|
| pdf-parse | 小 | ❌ 停止 (2021) | シンプル、抽出のみ | 現状維持 |
| pdfjs-dist | 中 | ✅ 活発 | Mozilla製、高機能 | **移行検討** |
| pdf2json | 小 | ⚠️ 低速 | JSON出力 | - |

**推奨**: 現状 `pdf-parse` を使用し、問題があれば `pdfjs-dist` に移行

### 5.2 PowerPointパーサー選定

| ライブラリ | サイズ | メンテナンス | 特徴 | 推奨 |
|-----------|--------|-------------|------|------|
| pptx-parser | 小 | ⚠️ 不明 | シンプル | 検証必要 |
| officeparser | 中 | ⚠️ 低速 | 複数形式対応 | 検証必要 |
| pptx2json | 小 | ❌ 停止 | JSON出力 | - |

**推奨**: `officeparser` を検証（Word/Excelも対応の統合案）

### 5.3 セキュリティ考慮事項

1. **ファイル検証**
   - MIMEタイプと拡張子の両方を検証
   - マジックナンバー確認（バイナリファイル）

2. **リソース制限**
   - ファイルサイズ: 10MB上限
   - 処理時間: 30秒タイムアウト
   - メモリ使用量監視

3. **エラーメッセージ**
   - 内部エラーをそのまま返さない
   - ユーザーフレンドリーなメッセージ

### 5.4 エラーハンドリング設計

```typescript
// エラーコード定義
export const ParseErrorCode = {
  UNSUPPORTED_TYPE: 'このファイル形式はサポートされていません',
  FILE_TOO_LARGE: 'ファイルサイズが大きすぎます（最大10MB）',
  PARSE_ERROR: 'ファイルの解析に失敗しました。別の形式でお試しください',
  TIMEOUT: '処理がタイムアウトしました。ページ数の少ないファイルをお試しください',
  ENCRYPTED: 'パスワード保護されたファイルは処理できません',
  CORRUPTED: 'ファイルが破損している可能性があります',
} as const;
```

---

## 6. 既存コードとの整合性

### 6.1 議事録ファイルアップロード機能との関係

既存の `/minutes`, `/meeting-notes` ページでのファイルアップロードは、
現在 `lib/upload/file-parser.ts` を使用。

**統合方針:**
1. 新しい統合パーサー (`lib/parsers/index.ts`) を作成
2. 既存の `lib/upload/file-parser.ts` は段階的に統合パーサーに移行
3. `lib/parsers/document.ts` は統合パーサーに統合

### 6.2 Google Drive連携との関係

Google Driveからのファイル取得は `components/ui/GoogleDrivePicker.tsx` で実装済み。

**統合方針:**
- Google Workspaceファイル（Docs, Sheets, Slides）は変換済みテキストを取得
- 既存実装を維持し、新規APIはローカルファイル用に使用

### 6.3 下位互換性

- 既存の `/api/upload` は当面維持（非推奨化のみ）
- クライアントコンポーネントは段階的に移行
- 型定義は拡張のみ（既存フィールドは維持）

---

## 7. リスクと対策

| リスク | 影響度 | 確率 | 対策 |
|--------|--------|------|------|
| pdf-parseのメンテナンス停止 | 中 | 高 | 代替ライブラリ（pdfjs-dist）の調査済み |
| 大容量PDFのタイムアウト | 中 | 中 | ページ数制限、プログレス表示 |
| 特殊なフォーマットの解析失敗 | 低 | 中 | エラーハンドリング、フォールバック |
| セキュリティ脆弱性 | 高 | 低 | ファイル検証、サイズ制限、タイムアウト |
| メモリリーク | 中 | 低 | バッファの適切な解放、監視 |

---

## 8. 今後の拡張案

### 8.1 音声・動画対応（Phase 3）

- Whisper API等を使用した文字起こし
- ファイルサイズの課題（100MB超）
- 非同期処理の検討（バックグラウンドジョブ）

### 8.2 OCR対応

- スキャンPDFのテキスト抽出
- Tesseract.js or クラウドOCR

### 8.3 構造化データ抽出

- Excelの表を構造化データとして抽出
- JSON形式でのLLM送信

---

## 9. 参考資料

### 9.1 関連ファイル

- `lib/upload/file-parser.ts` - 既存アップロードパーサー
- `lib/parsers/document.ts` - 既存サーバーパーサー
- `lib/parsers/vtt.ts` - VTTパーサー
- `components/ui/FileAttachment.tsx` - ファイル添付UI
- `app/api/upload/route.ts` - アップロードAPI
- `types/upload.ts` - 型定義

### 9.2 既存計画書

- `docs/plans/development/meeting-minutes-file-upload.md` - 議事録ファイルアップロード計画

---

## 10. 更新履歴

| 日付 | 更新内容 | 担当 |
|------|----------|------|
| 2026-03-20 | 初版作成 | - |

---

## 11. 承認待ち項目

- [ ] PDFパーサーライブラリ選定（pdf-parse維持 or pdfjs-dist移行）
- [ ] PowerPointパーサーライブラリ選定
- [ ] Phase 1のスコープ確定
- [ ] ファイルサイズ上限の変更要否
