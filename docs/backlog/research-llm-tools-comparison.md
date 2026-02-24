# LLM API ツール機能比較調査

> **優先度**: 🟢 低
> **状態**: 調査完了
> **調査日**: 2026-02-24
> **目的**: xAI Agent Tools実装に際し、他LLM APIのツール機能を調査・比較
> **関連**: plans/xai-agent-tools-final.md

---

## 概要

各主要LLMプロバイダーのツール機能を調査し、xAI Agent Toolsとの比較を行った。

**結論**: xAIの3ツール（web_search, x_search, code_execution）が現状最適。

---

## 調査対象

| プロバイダー | API | 調査日時点の最新モデル |
|-------------|-----|---------------------|
| xAI | Responses API | Grok 4.1 Fast, Grok 4 |
| OpenAI | Responses API / Chat Completions | GPT-5, GPT-4o |
| Anthropic | Messages API | Claude Opus 4.6, Sonnet 4.6 |
| Google | Gemini API | Gemini 2.0 |
| Perplexity | Sonar API | Sonar, Sonar Pro |

---

## ツール機能比較表

| ツール | xAI | OpenAI | Anthropic | Google | Perplexity | 評価 |
|--------|-----|--------|-----------|--------|-----------|------|
| **Web検索** | ✅ | ✅ | ❌ | ✅ | ✅ | 必須機能 |
| **X検索** | ✅ **独自** | ❌ | ❌ | ❌ | ❌ | **xAIのみ** |
| **コード実行** | ✅ | ✅ | ⚠️ | ✅ | ❌ | 有用 |
| **ドキュメントRAG** | ✅ | ✅ | ❌ | ✅ | ❌ | 将来用 |
| **Function Calling** | ✅ | ✅ | ✅ | ✅ | ❌ | 汎用 |
| **Computer Use** | ❌ | ❌ | ✅ **独自** | ❌ | ❌ | 特殊用途 |

**凡例**: ✅ 利用可能 / ❌ なし / ⚠️ 制限あり

---

## 詳細比較

### 1. Web検索

| API | 特徴 | 強み | 弱み |
|-----|------|------|------|
| **xAI** | Web検索 + ページ閲覧 | X検索との組み合わせ可能 | 検索品質は標準的 |
| **OpenAI** | Agentic search対応 | 高品質、エビデンス充実、Deep Research | X検索なし |
| **Google** | Google Search Grounding | Google検索の網羅性 | 日本語コンテンツ偏り |
| **Perplexity** | Search API | **最もエビデンス充実**、引用充実 | 生成は別APIが必要 |

#### OpenAI Web Searchの特徴

```typescript
// 3種類の検索モード
const searchModes = {
  nonReasoning: "高速、単純な検索",
  agentic: "推論モデルによる多段階検索",
  deepResearch: "数百ソースを使った詳細調査（数分かかる）",
};
```

#### ドメインフィルタリング例（OpenAI）

```json
{
  "type": "web_search",
  "filters": {
    "allowed_domains": [
      "pubmed.ncbi.nlm.nih.gov",
      "clinicaltrials.gov",
      "www.who.int"
    ]
  }
}
```

---

### 2. X（Twitter）検索

| API | 対応状況 | 備考 |
|-----|---------|------|
| **xAI** | ✅ **唯一の選択肢** | X社との連携による独自機能 |
| OpenAI | ❌ | 対応予定なし |
| Anthropic | ❌ | 対応予定なし |
| Google | ❌ | 対応予定なし |
| Perplexity | ❌ | 対応予定なし |

**評価**: X検索が必要な場合、xAI以外に選択肢がない。

---

### 3. コード実行

| API | 環境 | 特徴 | セキュリティ |
|-----|------|------|-------------|
| **xAI** | サンドボックス | Python、matplotlib等 | 安全 |
| **OpenAI** | サンドボックス | 充実したライブラリ | 安全 |
| **Google** | サンドボックス | Gemini標準搭載 | 安全 |
| **Anthropic** | ローカル実行 | フレキシブル | ⚠️ リスクあり |

#### Anthropic Computer Useのリスク

> "Computer use is a beta feature with unique risks distinct from standard API features."

- プロンプトインジェクションのリスク
- インターネットアクセスによる悪意あるコンテンツ暴露
- 専用VM/コンテナでの実行が必須

---

### 4. 特殊ツール

#### Anthropic Computer Use（画面自動操作）

| 項目 | 内容 |
|------|------|
| **機能** | スクリーンショット、マウス操作、キーボード入力 |
| **用途** | ブラウザ自動操作、デスクトップ自動化 |
| **Teddy向き？** | ❌ 特殊すぎる、セキュリティリスク |
| **必要環境** | Dockerコンテナ + 仮想ディスプレイ |

```typescript
// Anthropic Computer Useのツールセット
const computerUseTools = {
  computer: "画面操作（スクリーンショット、マウス、キーボード）",
  bash: "シェルコマンド実行",
  text_editor: "ファイル編集",
};
```

#### Function Calling（カスタム関数）

| API | 対応 | 用途 |
|-----|------|------|
| xAI | ✅ | カスタム関数定義 |
| OpenAI | ✅ | カスタム関数定義 |
| Anthropic | ✅ | カスタム関数定義 |
| Google | ✅ | カスタム関数定義 |

**将来的なTeddyでの活用例**:
- 社内DB検索
- 番組スケジュール取得
- 出演者データベース検索

---

## 総合評価

### 各プロバイダーの強み

| プロバイダー | 強み | Teddy向き評価 |
|-------------|------|--------------|
| **xAI** | X検索唯一、ツール組み合わせ最強 | ⭐⭐⭐ **最適** |
| **OpenAI** | Web検索品質最高、Deep Research | ⭐⭐⭐ 高品質だがX検索なし |
| **Anthropic** | Computer Use独自 | ⭐⭐ 特殊用途のみ |
| **Google** | Google検索網羅性 | ⭐⭐⭐ 高品質だがX検索なし |
| **Perplexity** | エビデンス最充実 | ⭐⭐⭐ 検索のみ、生成別途必要 |

### xAIの優位性

| 観点 | 評価 |
|------|------|
| **X検索** | 🏆 **業界唯一** |
| **ツール組み合わせ** | Web + X + Code = 最強の組み合わせ |
| **統一性** | 1つのAPIで全てカバー |
| **実装シンプルさ** | Responses API一本化 |

---

## Teddyでの推奨構成

### 現状の最適構成

```typescript
// lib/llm/xai/config.ts
export const DEFAULT_XAI_TOOLS: XAIToolType[] = [
  'web_search',        // Web検索：最新情報、エビデンス収集
  'x_search',          // X検索：リアルタイム動向、トレンド（xAI独自）
  'code_execution',    // コード実行：計算、データ分析、グラフ生成
];
```

### 選定理由

| ツール | 選定理由 |
|--------|---------|
| `web_search` | 標準的だが、X検索との組み合わせで価値が増す |
| `x_search` | **代替不可**。出演者の最新動向、トレンド把握に必須 |
| `code_execution` | データ分析、統計処理、グラフ生成に有用 |

### 将来の拡張候補

```typescript
// 将来的に検討可能な追加ツール
const FUTURE_TOOLS = {
  // collections_search: "社内文書RAG（ファイル管理機能実装後）",
  // function: "カスタム関数（社内システム連携時）",
};
```

---

## 代替案との比較

### 案A: xAI単独（採用）

```
Teddy → xAI (web_search + x_search + code_execution)
```

**メリット**:
- X検索が使える
- 実装がシンプル
- ツール組み合わせが強力

**デメリット**:
- Web検索品質は標準的

### 案B: ハイブリッド（Perplexity + xAI）

```
Teddy → Perplexity (Web検索) → xAI (生成 + X検索)
```

**メリット**:
- Web検索品質が最高
- エビデンス充実

**デメリット**:
- 実装が複雑
- レイテンシ増加
- コスト管理が複雑

### 案C: OpenAI + xAI（X検索のみ）

```
Teddy → OpenAI (Web検索) / xAI (X検索) → 統合
```

**メリット**:
- Web検索品質が高い

**デメリット**:
- 2つのAPI管理
- 実装が複雑
- X検索単独では価値が半減

---

## 付録: 検索API詳細比較

### xAI web_search vs 外部検索API

| API | タイプ | 料金 | 強み | 弱み | Teddy向き |
|-----|--------|------|------|------|----------|
| **xAI web_search** | 組み込み | $5/1000回（最大） | X検索と統合、実装シンプル | 検索品質は標準的 | ⭐⭐⭐ |
| **Tavily** | AIネイティブ | $8/1000回 | 引用充実、LangChain統合 | X検索なし | ⭐⭐⭐ |
| **SerpAPI** | 伝統的SERP | $75/5000回（$15/1000） | 40+エンジン、信頼性 | X検索なし、高価 | ⭐⭐ |
| **Exa** | セマンティック | $1.50/1000回 | 意味検索、RAG最適 | X検索なし | ⭐⭐ |
| **Firecrawl** | AIネイティブ | $83/100k credits | 検索+スクレイピング統合 | X検索なし | ⭐⭐ |
| **Brave Search** | 独立インデックス | $5/1000回 | プライバシー重視 | X検索なし | ⭐⭐ |

### 詳細分析

#### 1. xAI web_search（組み込み）

```typescript
// メリット: X検索との統合
const tools = [
  { type: 'web_search' },
  { type: 'x_search' },  // 唯一の選択肢
];

// 実装がシンプル（1つのAPI）
const response = await xai.responses.create({
  model: 'grok-4-1-fast-reasoning',
  tools: ['web_search', 'x_search', 'code_execution'],
  input: messages,
});
```

**評価**:
- ✅ X検索と統合できる
- ✅ 実装が最もシンプル
- ✅ レイテンシ低い（1リクエスト）
- ⚠️ 検索品質は標準的

#### 2. Tavily（外部API）

```typescript
// Tavily → 検索結果 → xAIで生成
const searchResult = await tavily.search({
  query: '最新のAIニュース',
  search_depth: 'advanced',
  include_answer: true,
});

const response = await xai.chat({
  messages: [
    { role: 'system', content: '以下の検索結果を基に回答してください' },
    { role: 'user', content: searchResult.answer },
  ],
});
```

**評価**:
- ✅ エビデンス最充実
- ✅ 引用が自動で付く
- ❌ X検索なし
- ❌ 2段階リクエスト（レイテンシ増）

#### 3. SerpAPI（伝統的）

```typescript
// Google検索結果を取得 → xAIで生成
const serpResult = await serpapi.search({
  engine: 'google',
  q: '最新のAIニュース',
});

// スニペットをxAIに渡す
```

**評価**:
- ✅ 検索エンジン多様（Google, Bing等）
- ❌ 高価（$15/1000回）
- ❌ X検索なし
- ❌ 実装が複雑

### 結論: xAI web_searchを採用

**理由**:

| 観点 | 評価 |
|------|------|
| **X検索との統合** | 🏆 外部APIでは不可能 |
| **実装シンプルさ** | 1つのAPIで完結 |
| **レイテンシ** | 最小（1リクエスト） |
| **コスト** | ツール料金のみ |
| **メンテナンス** | 最低限 |

**検索品質の懸念への対応**:

```
xAI web_searchの品質が標準的でも、
X検索との組み合わせで十分な価値を提供できる。

→ Web検索でエビデンス収集
→ X検索でリアルタイム動向確認
→ コード実行でデータ分析
```

**将来の切り替え検討時期**:

| 状況 | 対応 |
|------|------|
| 検索品質で不満が出た場合 | TavilyやExaとの併用を検討 |
| X検索が不要になった場合 | 外部APIへの移行を検討 |
| コスト削減が必要な場合 | 検索結果のキャッシュ化を検討 |

---

## 参考リンク

### xAI
- [xAI Tools Overview](https://docs.x.ai/developers/tools/overview)
- [xAI Responses API](https://docs.x.ai/developers/endpoints/responses)

### OpenAI
- [OpenAI Web Search Tool](https://developers.openai.com/api/docs/guides/tools-web-search/)
- [OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling/)

### Anthropic
- [Anthropic Computer Use](https://platform.anthropic.com/docs/en/agents-and-tools/tool-use/computer-use-tool)

### Google
- [Google Search Grounding](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-search)

### Perplexity
- [Perplexity Sonar API](https://docs.perplexity.ai/docs/sonar/quickstart)
- [Perplexity Search API](https://docs.perplexity.ai/docs/search/quickstart)

---

## 関連ドキュメント

- `grok-agent-tools.md` - xAI Agent Tools仕様
- `xai-agent-tools-final.md` - xAI Agent Tools実装計画書
