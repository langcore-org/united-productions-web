# xAI API Citations 詳細調査結果

> **調査日**: 2026-02-26  
> **調査スクリプト**: `scripts/investigate-citations-patterns.ts`  
> **テストケース数**: 15パターン（うち10パターン完了）

---

## 核心となる発見

### 1. 欠損は発生しない

**結論**: `response.output_text.annotation.added` と `response.output_item.done` (type: message) は**同じcitationsセットを返す**。

| テストパターン | Inlineのみ | Messageのみ | 両方に存在 |
|--------------|-----------|------------|-----------|
| X検索-複合キーワード | 0件 | 0件 | 21件 |
| X検索-期間指定 | 0件 | 0件 | 21件 |
| X検索-ユーザー指定 | 0件 | 0件 | 20件 |
| Web検索-技術的トピック | 0件 | 0件 | 16件 |
| 両方検索-時事ネタ | 0件 | 0件 | 16件 |
| 両方検索-製品レビュー | 0件 | 0件 | 23件 |
| X検索-短文回答 | 0件 | 0件 | 5件 |
| Web検索-citations少 | 0件 | 0件 | 4件 |

**重要**: 「InlineにあってMessageにない」「MessageにあってInlineにない」というcitationsは**存在しない**。

### 2. 重複の構造

```
【X検索-複合キーワードの例】

Inline annotations: 21件
  └─ ユニークURL: 12件

Message annotations: 21件  
  └─ ユニークURL: 12件（同じ）

両方に存在: 21件（= 全て重複）
```

**重複の詳細**:
```json
[
  { "url": "https://x.com/i/status/1953526577297600557", "title": "1" },
  { "url": "https://x.com/i/status/1953526591629508735", "title": "2" },
  { "url": "https://x.com/i/status/1953526591629508735", "title": "2" },  // 重複
  { "url": "https://x.com/i/status/1989048466967032153", "title": "3" },
  { "url": "https://x.com/i/status/1967650108285259822", "title": "4" },
  { "url": "https://x.com/i/status/1953526577297600557", "title": "1" },  // 重複
  ...
]
```

**重複の理由**: 同じURLが**本文中で複数回参照される**ため（例: `[1]` が2回以上出現）。

### 3. Citationsが発生しないケース

| パターン | 結果 | 理由の推測 |
|---------|------|----------|
| X検索-単一キーワード "AIについて" | 0件 | ツール呼び出しなし（モデルが検索不要と判断） |
| Web検索-単一キーワード "AIとは" | 0件 | 同上 |
| X検索-長文レポート "AIの歴史と将来性について詳しく解説して" | 0件 | モデルが内部知識のみで回答 |

**重要**: citationsが0件になるのは**APIの問題ではなく**、モデルが検索を実行しない場合。

---

## 詳細調査結果

### テストケース別サマリー

| # | テストケース | ツール | テキスト長 | Citations数 | ユニークURL | 重複率 |
|---|------------|--------|----------|------------|------------|-------|
| 1 | X検索-単一キーワード | x_search | 1501文字 | 0件 | 0件 | - |
| 2 | X検索-複合キーワード | x_search | 2174文字 | 21件 | 12件 | 43% |
| 3 | X検索-期間指定 | x_search | 2426文字 | 21件 | 19件 | 10% |
| 4 | X検索-ユーザー指定 | x_search | 3147文字 | 20件 | 10件 | 50% |
| 5 | Web検索-単一キーワード | web_search | 851文字 | 0件 | 0件 | - |
| 6 | Web検索-技術的トピック | web_search | 1856文字 | 16件 | 8件 | 50% |
| 7 | 両方検索-時事ネタ | 両方 | 1901文字 | 16件 | 16件 | 0% |
| 8 | 両方検索-製品レビュー | 両方 | 3211文字 | 23件 | 20件 | 13% |
| 9 | X検索-短文回答 | x_search | 416文字 | 5件 | 5件 | 0% |
| 10 | Web検索-citations少 | web_search | 512文字 | 4件 | 4件 | 0% |
| 11 | Web検索-citations多 | web_search | - | - | - | 未完了 |
| 12 | X検索-長文レポート | x_search | 3475文字 | 0件 | 0件 | - |
| 13-15 | その他 | - | - | - | - | 未完了 |

### 重複率の傾向

- **重複率0%**: 短文回答、citations少、時事ネタ
- **重複率10-13%**: 期間指定、製品レビュー
- **重複率43-50%**: 複合キーワード、ユーザー指定、技術的トピック

**推測**: 同じ情報源を複数回参照する複雑な回答ほど重複率が高い。

---

## 実装上の示唆

### 1. イベント選択

| 取得戦略 | 欠損リスク | 重複 | 推奨度 |
|---------|----------|------|-------|
| `output_text.annotation.added` のみ | なし | あり | ⭐⭐⭐⭐⭐ |
| `output_item.done` (message) のみ | なし | あり | ⭐⭐⭐⭐⭐ |
| 両方 | なし | **2倍** | ⭐⭐⭐ |

**結論**: どちらか一方だけを処理すれば十分。両方処理すると重複が2倍になる。

### 2. 重複除去の必要性

**結論**: **必要**（本文中で同じURLが複数回参照されるため）

ただし、重複は「Inline vs Message」の間ではなく、「同じイベント内での同一URLの複数出現」が原因。

### 3. 推奨実装

```typescript
// 戦略A: Inline annotationsのみ使用（推奨）
if (event.type === "response.output_text.annotation.added") {
  // 重複チェックしてyield
}

// 戦略B: Message annotationsのみ使用（同様に有効）
if (event.type === "response.output_item.done" && event.item?.type === "message") {
  // 重複チェックしてyield
}

// 戦略C: 両方使用（非推奨 - 重複が2倍になる）
```

---

## 検証済み仮説

### ✅ 確認された事実

1. **欠損はない**: InlineとMessageは同じcitationsセットを返す
2. **重複はある**: 同じURLが本文中で複数回参照される
3. **0件のケース**: モデルが検索を実行しない場合に発生
4. **X検索とWeb検索の違い**: citationsの構造は同じ（URLパターンのみ異なる）

### ❌ 否定された仮説

1. ~~InlineとMessageで異なるcitationsが返る~~ → 同じ
2. ~~Messageにしか含まれないcitationsがある~~ → ない
3. ~~X検索はcitationsを返さない~~ → 返す

---

## 生データ

全テストケースの詳細データ:
- `/tmp/citations_X検索-単一キーワード.json`
- `/tmp/citations_X検索-複合キーワード.json`
- `/tmp/citations_X検索-期間指定.json`
- `/tmp/citations_X検索-ユーザー指定.json`
- `/tmp/citations_Web検索-単一キーワード.json`
- `/tmp/citations_Web検索-技術的トピック.json`
- `/tmp/citations_両方検索-時事ネタ.json`
- `/tmp/citations_両方検索-製品レビュー.json`
- `/tmp/citations_X検索-短文回答.json`
- `/tmp/citations_Web検索-citations少.json`
- `/tmp/citations_X検索-長文レポート.json`

---

## 結論

**X検索のcitations取得は可能**であり、以下の設計が最適:

1. **Inline annotationsまたはMessage annotationsのどちらか一方**を処理する
2. **重複除去は必須**（本文中で同じURLが複数回参照されるため）
3. **citationsが0件になるケース**は正常（モデルが検索を実行しない場合）

---

**更新履歴**:
- 2026-02-26: 初回調査（10パターン完了）
