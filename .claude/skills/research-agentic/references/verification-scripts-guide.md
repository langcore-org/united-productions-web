# データ検証スクリプト使用ガイド

> 作成日: 2026-02-27  
> 用途: lib/knowledge/ のデータ検証

---

## 概要

xAI API（Grok）を使用して、ナレッジデータの正確性を検証するスクリプト群。

---

## スクリプト一覧

### 1. verify-episodes.mjs

放送回データの検証スクリプト（基本版）

```bash
node scripts/verify-episodes.mjs
```

**用途**: 複数番組の放送回データを一括検証  
**入力**: スクリプト内の `programs` 配列にデータを定義  
**出力**: 各番組の検証結果をコンソールに表示

**特徴**:
- xAI Responses API を使用
- Web検索ツールを自動有効化
- ストリーミングレスポンスでリアルタイム表示

---

### 2. collect-episodes-from-official.mjs

データ収集支援スクリプト

```bash
node scripts/collect-episodes-from-official.mjs
```

**用途**: 公式サイトからのデータ収集テンプレートを生成  
**出力**: 
- `docs/verification/collection-templates/*.md`
- `docs/verification/CHECKLIST.md`

**生成されるテンプレートの内容**:
- 公式サイトURL
- 収集手順
- データ記録用テーブル
- 検証記録セクション

---

## 検証ワークフロー

### Step 1: テンプレート生成

```bash
node scripts/collect-episodes-from-official.mjs
```

### Step 2: 公式サイトでデータ収集

各テンプレートに従って、公式サイトから情報を収集

### Step 3: サンプル検証

```javascript
// verify-episodes.mjs の programs 配列に
// 収集したデータを入力して実行
const programs = [
  {
    name: "番組名",
    station: "放送局",
    episodes: [
      { date: "2026-02-24", title: "タイトル" },
      // ...
    ]
  }
];
```

```bash
node scripts/verify-episodes.mjs
```

### Step 4: 問題発見時の対応

誤りが見つかった場合：
1. データを無効化（空配列に）
2. 検証レポート作成
3. 正確なデータを再収集
4. 再検証
5. 問題なければ有効化

---

## カスタマイズ

### 検証対象の変更

`verify-episodes.mjs` の `programs` 配列を編集：

```javascript
const programs = [
  {
    name: "検証したい番組名",
    station: "放送局",
    timeSlot: "曜日 時間",
    episodes: [
      { date: "YYYY-MM-DD", title: "タイトル" },
      // 追加のエピソード...
    ]
  }
];
```

### 検証クエリのカスタマイズ

`verifyWithXAI` 関数内のプロンプトを編集：

```javascript
const requestBody = {
  model: "grok-4-1-fast-reasoning",
  input: [
    {
      role: "user",
      content: `カスタム検証クエリ...`
    }
  ],
  stream: true,
  tools: [{ type: "web_search" }]
};
```

---

## 注意事項

### APIレート制限

- xAI APIにはレート制限あり
- 連続実行時は待機時間（3秒程度）を設ける
- 大量データの検証は分割して実施

### 検証の限界

- Web検索の結果に依存
- 最新の情報が検索できない場合あり
- **必ず公式サイトでの最終確認を行う**

### コスト管理

- xAI APIは有料（従量制）
- 大量データの検証時は注意
- サンプル検証（10-20%）を推奨

---

## トラブルシューティング

### APIエラー（422）

```
Error: API error: 422
```

**原因**: リクエストボディの形式が不正  
**対応**: `/chat/completions` ではなく `/responses` エンドポイントを使用

### タイムアウト

```
Error: Command killed by timeout
```

**原因**: レスポンスが長時間続く  
**対応**: `timeout` 引数を調整、またはストリーミング処理を見直す

### モデルエラー（400）

```
Error: API error: 400 - Model not found
```

**原因**: モデル名が不正  
**対応**: `grok-4-1-fast-reasoning` など正確なモデル名を使用

---

## 関連ドキュメント

- [xAI Responses API仕様](../../../../docs/specs/api-integration/xai-responses-api-spec.md)
- [データ品質管理ガイド](../../../../docs/guides/data-quality/tv-program-data-guide.md)
- [検証結果レポート](../../../../docs/verification/episode-data-verification-report.md)
