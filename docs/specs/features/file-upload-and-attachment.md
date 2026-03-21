# ファイル添付・アップロード仕様

> **最終更新**: 2026-03-22 02:00

---

## 概要

本仕様は、チャット添付と議事録アップロードにおけるファイル対応範囲、判定ルール、サーバー解析ルールを定義する。

---

## 設計原則

- **Single Source of Truth**: 拡張子・MIME・カテゴリは `types/upload.ts` の `FILE_TYPE_MAP` を正とする
- **DRY**: クライアントのファイル処理は `lib/chat/file-content.ts` の `processFile()` を正とする
- **責務分離**:
  - チャット添付: 添付可否 + 読み込み可否判定（クライアント）
  - 議事録アップロード: テキスト抽出（サーバー）
- **動的文言生成**: 対応形式表示は `types/upload.ts` のヘルパー関数から生成する

---

## 対応形式

### チャット添付（`getChatAcceptRecord` / `getChatAcceptString`）

| 分類 | 拡張子 |
|---|---|
| text | `.txt`, `.md`, `.csv`, `.json`, `.vtt` |
| code | `.js`, `.ts`, `.tsx`, `.jsx`, `.py`, `.html`, `.css` |
| document | `.docx`, `.pdf`, `.xlsx`, `.xls`, `.pptx` |
| image | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` |

### 議事録アップロード（`getUploadAcceptRecord`）

| 分類 | 拡張子 |
|---|---|
| text | `.txt`, `.md`, `.csv`, `.json`, `.vtt` |
| document | `.docx`, `.pdf`, `.xlsx`, `.xls` |

`pptx` は現時点で議事録アップロード対象外（Phase 2）。

---

## クライアント挙動仕様

### 共通処理

- 実装: `lib/chat/file-content.ts` の `processFile(file)`
- 利用箇所:
  - `components/ui/FileAttachment.tsx`
  - `components/ui/FeatureChat.tsx`

### content 生成ルール

| 条件 | `content` |
|---|---|
| `isTextFile(type)` が true | `readAsText()` 結果を格納 |
| `type.startsWith("image/")` | `readAsDataURL()` 結果を格納 |
| 上記以外（doc/pdf/xlsx/pptx 等） | `null` |

補足:
- `content === null` の添付は送信可能だが、本文抽出は行わない
- 画面上は「読み込み不可」通知を表示する

---

## サーバー挙動仕様（`/api/upload`）

### 実装

- エンドポイント: `app/api/upload/route.ts`
- パーサー本体: `lib/upload/file-parser.ts`

### 解析対象 MIME

- `text/plain`
- `text/markdown`
- `text/csv`
- `application/json`
- `text/vtt`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/pdf`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `application/vnd.ms-excel`

### 解析ロジック

| 形式 | 関数 | 備考 |
|---|---|---|
| txt / md / csv / json | `parseTextFile` | UTF-8 / Shift_JIS 判定 |
| vtt | `parseVTTFile` | WebVTTのキュー本文抽出 |
| docx | `parseDocxFile` | `mammoth` |
| pdf | `parsePdfFile` | `pdf-parse`（動的 import） |
| xlsx/xls | `parseExcelFile` | `xlsx`（シートCSV変換を結合） |

### エラー仕様

| code | 条件 |
|---|---|
| `FILE_TOO_LARGE` | サイズ上限超過 |
| `EMPTY_FILE` | 0 bytes |
| `UNSUPPORTED_TYPE` | 非対応形式 |
| `ENCODING_ERROR` | テキストデコード失敗 |
| `PARSE_ERROR` | パーサー失敗 |

---

## 主要設定値

| 項目 | 値 | 参照 |
|---|---|---|
| 最大ファイルサイズ | 10MB | `types/upload.ts`, `config/constants.ts` |
| チャット同時添付数 | 5 | `components/ui/ChatInputArea.tsx` |

---

## 変更時ルール

新しい拡張子を追加する場合は、原則として以下の順で変更する。

1. `types/upload.ts` の `FILE_TYPE_MAP` に追加
2. 必要なら `getUploadAcceptRecord` へ追加（議事録対象のみ）
3. `lib/upload/file-parser.ts` に解析分岐を追加（議事録対象のみ）
4. テストを追加（`tests/lib/chat/file-content.test.ts` ほか）

`FILE_TYPE_MAP` 以外への直接ハードコード追加は禁止。
