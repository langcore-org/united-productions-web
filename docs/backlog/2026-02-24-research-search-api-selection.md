# 検索API選定検討記録

> **優先度**: 🟡 中
> **状態**: 検討完了・実装済み
> **最終更新**: 2026-03-20
> **作成日**: 2026-02-24
> **関連**: plans/xai-agent-tools-final.md, research-llm-tools-comparison.md

---

## 概要

Teddyの検索機能に使用するAPIの選定検討を記録。現状はxAI Agent Toolsを採用し、将来的にGoogle Search API + xAIへの移行を検討する。

---

## 検討の経緯

### 要件

| 要件 | 優先度 | 説明 |
|------|--------|------|
| X（Twitter）検索 | 🔥🔥🔥 必須 | 出演者の最新動向、トレンド把握 |
| Web検索品質 | 🔥🔥🔥 高 | 正確で網羅的な情報収集 |
| 日本語検索 | 🔥🔥🔥 高 | 日本のテレビ制作向け |
| エビデンス・引用 | 🔥🔥 中 | 情報源の明示 |
| レスポンス速度 | 🔥🔥 中 | ユーザーエクスペリエンス |
| 実装シンプルさ | 🔥🔥 中 | メンテナンス性 |

---

## 検討した選択肢

### 選択肢1: xAI Agent Tools単独（現状採用）

```
Teddy → xAI (web_search + x_search + code_execution)
```

**採用理由**:
- X検索が必須でxAIのみ対応
- 3ツールの組み合わせが強力
- 実装が最もシンプル
- 1つのAPIで完結

**課題**:
- Web検索品質は標準的
- 日本語検索はGoogleに劣る可能性

---

### 選択肢2: Tavily + xAI（エビデンス重視）

```
Teddy → Tavily (Web検索) → xAI (X検索 + 生成)
```

**検討結果**:
- ❌ 採用見送り
- Tavilyは日本語コンテンツに弱い
- 日本の芸能ニュース、ローカル情報が不足
- Teddyの用途（日本のテレビ制作）には不適合

**Tavilyの評価**:
| 観点 | 評価 | 備考 |
|------|------|------|
| AI/LLM向け最適化 | ⭐⭐⭐⭐⭐ | 構造化JSON、引用充実 |
| 検索速度 | ⭐⭐⭐⭐⭐ | 180ms p50 |
| 日本語検索 | ⭐⭐⭐ | Googleに劣る |
| 日本のローカル情報 | ⭐⭐ | 店舗、地図情報が少ない |

---

### 選択肢3: Google Search API + xAI（将来採用候補）

```
Teddy → Google Search API (Web検索) → xAI (X検索 + 生成)
```

**将来採用の理由**:
- 日本語検索が最強
- 日本のニュース、芸能情報が充実
- ローカル検索（店舗、地図）が可能
- 世界最大のインデックス

**課題**:
- 実装が複雑（2つのAPI）
- レイテンシ増加
- コスト増（Google API + xAI）

**Google Search APIの評価**:
| 観点 | 評価 | 備考 |
|------|------|------|
| 日本語検索 | ⭐⭐⭐⭐⭐ | 最強 |
| インデックス網羅性 | ⭐⭐⭐⭐⭐ | 世界最大 |
| ローカル検索 | ⭐⭐⭐⭐⭐ | 店舗、地図 |
| コスト | ⭐⭐⭐ | SerpAPI: $15/1000回 |
| 実装シンプルさ | ⭐⭐⭐ | 別途API統合が必要 |

---

## 選定結果

### 現状: xAI Agent Tools単独

```typescript
// lib/llm/xai/config.ts
export const DEFAULT_XAI_TOOLS: XAIToolType[] = [
  'web_search',        // Web検索（標準的）
  'x_search',          // X検索（xAI独自・必須）
  'code_execution',    // コード実行
];
```

**採用日**: 2026-02-24

**理由**:
1. X検索が必須で代替不可
2. 実装シンプル（2-3日で完了）
3. 3ツールの組み合わせで十分な機能性
4. 日本語検索はGrokも標準的に対応

---

### 将来: Google Search API + xAIへの移行

**移行時期**: 要件が整い次第

**移行条件**:
- [ ] Web検索品質で不満が出た場合
- [ ] 日本語検索の精度向上が必要な場合
- [ ] ローカル検索（店舗、場所）が必要になった場合
- [ ] Google Search APIのコスト許容範囲内と確認

**移行後のアーキテクチャ**:

```
┌─────────────────────────────────────────┐
│           ユーザークエリ                 │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
┌─────────────┐    ┌─────────────┐
│ Google Search│    │ xAI         │
│ API (Web)   │    │ (X検索+生成) │
└──────┬──────┘    └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 ▼
          ┌─────────────┐
          │  統合回答    │
          └─────────────┘
```

**実装パターン（将来用）**:

```typescript
// 将来的な実装例
async function searchWithGoogleAndXAI(query: string) {
  // 1. Google Search APIでWeb検索（日本語最強）
  const googleResult = await google.search({
    q: query,
    hl: 'ja',           // 日本語
    gl: 'jp',           // 日本の結果
    num: 10,
  });

  // 2. xAIでX検索 + 回答生成
  const response = await xai.responses.create({
    model: 'grok-4-1-fast-reasoning',
    tools: [{ type: 'x_search' }],  // X検索のみ
    input: [
      {
        role: 'system',
        content: `以下のGoogle検索結果を参考に、必要に応じてX検索も行って回答してください。

Google検索結果:
${googleResult.items.map(item => `- ${item.title}: ${item.snippet}`).join('\n')}`
      },
      { role: 'user', content: query },
    ],
  });

  return response;
}
```

---

## 各APIの詳細比較

### xAI web_search

| 項目 | 内容 |
|------|------|
| **料金** | $5/1000回（最大） |
| **強み** | X検索と統合、実装シンプル |
| **弱み** | 検索品質は標準的 |
| **日本語** | 標準的 |

### Tavily

| 項目 | 内容 |
|------|------|
| **料金** | $8/1000回 |
| **強み** | エビデンス充実、引用自動、高速（180ms） |
| **弱み** | 日本語に弱い |
| **日本語** | ⭐⭐⭐ Googleに劣る |

### Google Search API（SerpAPI）

| 項目 | 内容 |
|------|------|
| **料金** | $15/1000回 |
| **強み** | 日本語最強、インデックス網羅性、ローカル検索 |
| **弱み** | 高価、実装複雑 |
| **日本語** | ⭐⭐⭐⭐⭐ 最強 |

### Serper（Google Search APIの低価格版）

| 項目 | 内容 |
|------|------|
| **料金** | $0.30-1.00/1000回 |
| **強み** | 低価格、Google検索結果 |
| **弱み** | 機能制限あり |
| **日本語** | ⭐⭐⭐⭐⭐ Google同等 |

---

## コスト比較

### 現状（xAI単独）

| 項目 | 料金 |
|------|------|
| Grok 4.1 Fast | $0.20/1M input, $0.50/1M output |
| ツール使用 | 最大$5/1000回 |

**見積もり**: $0.01-0.05/リクエスト

### 将来（Google Search API + xAI）

| 項目 | 料金 |
|------|------|
| Google Search API（SerpAPI） | $15/1000回 |
| Google Search API（Serper） | $0.30-1.00/1000回 |
| xAI（X検索 + 生成） | ツール料金 + トークン料金 |

**見積もり**: $0.02-0.10/リクエスト（Serper使用時）

---

## 移行ロードマップ

### Phase 1: 現状維持（現在）

- xAI Agent Tools単独で運用
- ユーザーフィードバック収集
- 検索品質のモニタリング

### Phase 2: 品質評価（3-6ヶ月後）

- Web検索品質の評価
- 日本語検索の満足度調査
- Google Search APIの試用（小規模）

### Phase 3: 移行検討（6-12ヶ月後）

- コスト効率の評価
- 実装工数の見積もり
- 移行のGo/No-Go判断

### Phase 4: 移行実施（条件達成時）

- Google Search API + xAIの実装
- A/Bテスト
- 全面移行

---

## 参考リンク

- [xAI Responses API](https://docs.x.ai/developers/endpoints/responses)
- [Tavily Documentation](https://docs.tavily.com/)
- [SerpAPI Documentation](https://serpapi.com/)
- [Serper Documentation](https://serper.dev/)
- [Google Search API (Programmable Search Engine)](https://developers.google.com/custom-search)

---

## 関連ドキュメント

- [Backlog README](./README.md) - Backlog管理ガイド
- [AGENTS.md](../../AGENTS.md) - エージェント行動指針
- `research-llm-tools-comparison.md` - LLM APIツール比較
- `research-grok-agent-tools.md` - Grok Agent Tools仕様
- `plans/xai-agent-tools-final.md` - 実装計画書

---

**最終更新**: 2026-03-20 14:35
