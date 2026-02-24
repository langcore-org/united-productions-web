# LLM統合仕様

> **このファイルは分割されました**
>
> **最終更新**: 2026-02-24

---

## 移行先

このドキュメントは以下の2ファイルに分割されました：

| ファイル | 内容 |
|---------|------|
| [llm-integration-overview.md](./llm-integration-overview.md) | 概要、対応モデル、LangChain統合、環境変数 |
| [llm-integration-patterns.md](./llm-integration-patterns.md) | 詳細実装パターン、Factoryパターン、キャッシュ |

---

## 重要: LangChain使用について

**このプロジェクトではLLM統合に LangChain を使用しています。**

### インストール済みパッケージ

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

- `lib/llm/langchain/` - LangChain統合コード
- `lib/llm/langchain/callbacks/` - コールバックハンドラー
- `lib/llm/langchain/chains/` - Chain定義

### 選定経緯

詳細は [langchain-usage-current.md](./langchain-usage-current.md) を参照。
