---
name: lineup-import
description: オンエアラインナップ等のExcel/PDF/Wordファイルからナレッジベース（lib/knowledge/）へデータを取り込む。ファイル形式の調査、構造解析、変換、統合までのワークフロー。Use when: 外部ファイル（xlsx/pdf/docx等）からナレッジベースにデータを取り込みたい時、新しい番組データソースを処理する時。
---

# オンエアラインナップ取り込みスキル

外部ファイル（Excel/PDF/Word等）の中身をナレッジベース（`lib/knowledge/`）に取り込むためのワークフロー。

## ワークフロー全体像

```
Step 1: ファイル調査
    ↓
Step 2: 読み取り手段の確保
    ↓
Step 3: データ構造の解析
    ↓
Step 4: 取り込み設計
    ↓
Step 5: 変換・統合
    ↓
Step 6: 検証
```

## Step 1: ファイル調査

対象ディレクトリの全ファイルを把握する。

```bash
# ファイル一覧
ls -la "<対象ディレクトリ>"

# 拡張子ごとの集計
find "<対象ディレクトリ>" -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn
```

**確認すべきこと:**
- ファイルの拡張子（xlsx, pdf, docx, csv, etc.）
- 同一内容の重複ファイルがないか（例: xlsx と pdf が同じ内容）
- ファイルサイズから内容量を推測

**ユーザーに確認:**
- 重複ファイルがありそうな場合、どれが正本か聞く
- どの番組のデータか不明な場合は聞く

## Step 2: 読み取り手段の確保

拡張子ごとに読み取り方法を選択する。

| 拡張子 | 読み取り方法 | コマンド/ツール |
|--------|-------------|----------------|
| `.xlsx` | npx xlsx-cli | `npx xlsx-cli "<ファイルパス>"` |
| `.csv` | Readツール | そのまま読める |
| `.pdf` | Readツール (poppler-utils必要) | `Read` ツールで `pages` パラメータ指定 |
| `.pdf` (poppler-utils不可時) | npx pdf-parse or ユーザーにテキスト化依頼 | 環境による |
| `.docx` | npx docx-cli 等 | 環境で試す |

**読めない場合の対処:**
1. まず `npx` でCLIツールを試す（インストール不要）
2. それでもダメなら `python3` + パッケージを試す
3. 最終手段: ユーザーにテキスト/CSV化を依頼

**重要:** 必ずまず `head` 相当で先頭部分だけ確認し、全量を一度に処理しない。

## Step 3: データ構造の解析

ファイルの中身を読み取り、構造を把握する。

```bash
# xlsxの場合: 先頭を確認
npx xlsx-cli "<ファイル>" 2>&1 | head -20

# ヘッダー行を特定
npx xlsx-cli "<ファイル>" 2>&1 | grep -n "OA日\|放送日\|収録日" | head -5

# データ行のパターンを確認（回数番号付き行など）
npx xlsx-cli "<ファイル>" 2>&1 | grep -E "^[0-9]+," | head -10

# データ行数を把握
npx xlsx-cli "<ファイル>" 2>&1 | grep -cE "^[0-9]+,"
```

**把握すべきこと:**
- ヘッダー行の位置とカラム構成
- データ行の識別パターン（回数番号、日付等）
- 総データ行数
- セル内改行やマージセルの有無（CSVパース時の注意点）
- 各ファイル固有のフォーマットの癖

**注意:** ファイルごとにカラム構成が異なる場合が多い。テンプレート化せず、毎回構造を確認すること。

## Step 4: 取り込み設計

既存のナレッジベース構造を確認し、取り込み先と保存形式を決める。

```bash
# 既存の型定義を確認
cat lib/knowledge/types.ts

# 既存の番組データを確認
grep -n "export const program" lib/knowledge/programs-detailed-data*.ts
```

### 保存形式の選択

**JSON形式（推奨）**
```
lib/knowledge/lineup/
  <番組ID>.json      ← 変換スクリプトで生成したJSONデータ
  index.ts           ← 型付きエクスポート（薄いラッパー）
```
- 大量データ（数十〜数百回分）に最適
- 変換スクリプトで再生成しやすい
- `tsconfig.json` に `"resolveJsonModule": true` が必要（既に設定済み）
- `index.ts` はシンプルな型ラッパーのみ

**TypeScript形式（少量データのみ）**
```
lib/knowledge/episodes-<番組ID>.ts
```
- 10回以下の少量データか、手動で書く場合のみ

### 取り込み先の選択肢

**案A: `lib/knowledge/lineup/` に新規作成（大量データ向け・推奨）**
- 既存ファイルを肥大化させない
- `ProgramInfo.recentEpisodes` とは別管理

**案B: 既存 recentEpisodes を拡充**
- 少量データ（10回以下）の場合のみ

**ユーザーに確認:**
- どの形式・案で進めるか
- 全放送回を取り込むか、直近N回に絞るか
- 取り込む情報の粒度（全カラム？主要情報のみ？）

## Step 5: 変換・統合

### 5a: 変換スクリプトの作成（大量データの場合）

ファイルの構造に合わせてNode.jsスクリプトを作成する。

```
scripts/convert-lineup-<番組名>.mjs
```

**スクリプトの方針:**
- `xlsx` パッケージを直接使用（`npx xlsx-cli` のCSV出力はセル内改行・マージセルで壊れるため不向き）
- `XLSX.utils.sheet_to_json()` でオブジェクト配列として取得
- ファイル固有のパース処理を書く（汎用化しすぎない）
- 出力は JSON ファイルとして `scripts/output-<番組名>.json` に保存

```js
// 基本パターン
import XLSX from "xlsx";
import fs from "fs";

const wb = XLSX.readFile("path/to/file.xlsx");
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
// ↑ header: 1 で配列形式に（マージセル対応しやすい）
```

**スクリプト実行:**
```bash
node scripts/convert-lineup-<番組名>.mjs
```

### 5b: 手動変換（少量データの場合）

データ量が少なければ、読み取り結果を見ながら直接 TypeScript ファイルを書く。

### 統合

**JSON形式（lineup/ 配置）:**
```typescript
// lib/knowledge/lineup/index.ts
import type { LineupEpisodeInfo } from "../types";
import <番組ID>Data from "./<番組ID>.json";

export const <番組ID>Lineup: LineupEpisodeInfo[] =
  <番組ID>Data as LineupEpisodeInfo[];

export function getLineupByProgramId(programId: string): LineupEpisodeInfo[] | undefined {
  const map: Record<string, LineupEpisodeInfo[]> = {
    <番組ID>: <番組ID>Lineup,
  };
  return map[programId];
}
```

**TypeScript形式:**
```typescript
// lib/knowledge/episodes-<番組ID>.ts
import type { EpisodeInfo } from "./types";

export const episodes<ProgramName>: EpisodeInfo[] = [
  {
    broadcastDate: "YYYY-MM-DD",
    episodeNumber: "#1",
    content: "...",
    guests: ["..."],
    // ...
  },
];
```

- `lib/knowledge/index.ts` に `export * from "./lineup";` を追加
- 必要に応じて `programs.ts` の番組データと紐づけ

## Step 6: 検証

```bash
# TypeScript型チェック（プロジェクト全体）
npx tsc --noEmit

# JSONデータの件数確認
node -e "const d = require('./lib/knowledge/lineup/<番組ID>.json'); console.log(d.length)"

# 日付フォーマット確認
node -e "
const d = require('./lib/knowledge/lineup/<番組ID>.json');
d.slice(0,5).forEach(e => console.log(e.broadcastDate));
"
```

**検証チェックリスト:**
- [ ] TypeScriptの型エラーがないか（lineup関連のエラーに集中。他の既存エラーは無視してよい）
- [ ] JSONのレコード件数が妥当か（xlsx行数と照合）
- [ ] 日付フォーマットが統一されているか（YYYY-MM-DD）
- [ ] 回数番号の連番に大きな欠落がないか
- [ ] 明らかに異常なデータがないか（空行、文字化け等）
- [ ] 既存の `recentEpisodes` と矛盾がないか

## ソースファイルの保管場所

取り込み元ファイルは以下に保管されている:
```
docs/assets/excels_and_words/
```

## 実績・事例

### 2026年3月 マニアさん・神業チャレンジ取り込み

| 番組 | ファイル | レコード数 | 変換スクリプト |
|------|---------|-----------|----------------|
| 熱狂マニアさん！ | マニアさん長期ラインナップ0227.xlsx | 28回（#26〜#53） | scripts/convert-lineup-maniasan.mjs |
| THE神業チャレンジ | 神業【OA長期スケ】(4).xlsx | 201件（ナビ含む） | scripts/convert-lineup-kamichallenge.mjs |

- 出力JSON: `lib/knowledge/lineup/maniasan.json` / `kamichallenge.json`
- TSラッパー: `lib/knowledge/lineup/index.ts`
- `lib/knowledge/index.ts` に `export * from "./lineup"` 追加済み

## 既知のファイル形式の癖

- **xlsx（セル内改行）**: `xlsx-cli` のCSV出力は行が分断され、パースが実質不可能。必ず `xlsx` パッケージで直接読み込む
- **xlsx（マージセル）**: `XLSX.utils.sheet_to_json({ header: 1 })` で配列形式にするとマージセルが空配列要素になる。前の行の値を引き継ぐ処理が必要な場合あり
- **xlsx（複数シート）**: `wb.SheetNames[0]` で最初のシートを使うが、データが複数シートに分かれている場合は全シートを確認する
- **pdf**: 表形式データはテキスト抽出時にカラム位置がずれやすい
- **重複ファイル**: 同じ内容が xlsx + pdf の両方で存在することが多い（xlsx を優先。pdfは説明用の場合がある）
- **裏番組情報**: 同一セル内に複数番組・視聴率が含まれる場合が多い。文字列として保持するのが無難
