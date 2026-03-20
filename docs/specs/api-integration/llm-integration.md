# LLM統合仕様

> **このファイルは分割されました**
>
> **最終更新**: 2026-03-20 14:35

---

## 移行先

このドキュメントは以下の2ファイルに分割されました：

| ファイル | 内容 |
|---------|------|
| [llm-integration-overview.md](./llm-integration-overview.md) | 概要、対応モデル、xAI直接呼び出し、環境変数 |
| [llm-integration-patterns.md](./llm-integration-patterns.md) | 詳細実装パターン、Factoryパターン、キャッシュ |

---

## 重要: 現在の実装方針

**このプロジェクトではLLM統合に xAI直接API呼び出し を使用しています。**

### 実装方式

| 方式 | 状態 | 説明 |
|------|------|------|
| **xAI直接呼び出し** | ✅ 使用中 | `lib/llm/clients/grok.ts` で実装 |
| **LangChain** | 📦 保持（未使用） | 将来のGemini追加に備え保持 |

### なぜxAI直接呼び出しを使用するのか

1. **Agent Tools対応**: xAIのAgent Tools（web_search, x_search, code_execution）はResponses API専用
2. **Citations取得**: 引用情報を最適に取得可能
3. **シンプルさ**: コードフローが明確で保守しやすい

### LangChainパッケージ（将来用に保持）

```json
{
  "langchain": "^1.2.25",
  "@langchain/core": "^1.1.27",
  "@langchain/openai": "^1.2.9",
  "@langchain/anthropic": "^1.3.19",
  "@langchain/community": "^1.1.17",
  "@langchain/textsplitters": "^1.0.1"
}
```

### 実装場所

- `lib/llm/clients/grok.ts` - xAI直接呼び出し（現在の実装）
- `lib/llm/langchain/` - LangChain統合コード（将来用に保持）
- `lib/llm/factory.ts` - Factoryパターン

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-03-20 | LangChain から xAI直接呼び出し に移行 |
| 2026-02-24 | ドキュメント分割 |
