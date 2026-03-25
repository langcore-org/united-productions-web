# LangChain API重複問題の分析と対応方針

> **調査日**: 2026-02-22  
> **対応完了日**: 2026-02-22  
> **ステータス**: 完了・保管  
> **調査対象**: `/api/llm/langchain`, `/api/llm/langchain/stream`  
> **関連ドキュメント**: `docs/archive/langchain-migration-*.md`

---

## 1. 背景：LangChain移行の経緯

### 移行フェーズ（2026-02-21完了）

```
Phase 0: 準備（1-2週間）
    ↓
Phase 1: パイロット導入（2-4週間）
    ↓
Phase 2: 段階的移行（1-2ヶ月）
    ↓
Phase 3: 高度機能（RAG、Agent、メモリ管理）
    ↓
Phase 4: レガシーコード整理・削除 ← ここで問題が残存
```

### 移行計画書に記載された方針

> **並行運用**: 新旧コードを並行して運用し、段階的に切り替え
> **ロールバック**: 各段階で即座に元に戻せる体制を確保

この方針により、一時的に `/api/llm/langchain` が作成された。

---

## 2. なぜ重複が生じたか

### 2.1 移行時のAPI構成

```
移行前:
├── /api/llm/chat          ← 旧実装（独自LLMクライアント）
└── /api/llm/stream        ← 旧実装（独自LLMクライアント）

移行期間中:
├── /api/llm/chat          ← 旧実装（並行運用）
├── /api/llm/stream        ← 旧実装（並行運用）
├── /api/llm/langchain     ← 新実装（LangChain）← テスト用
└── /api/llm/langchain/stream ← 新実装（LangChain）← テスト用

移行完了後（現在）:
├── /api/llm/chat          ← LangChain版に統合済み
├── /api/llm/stream        ← LangChain版に統合済み
├── /api/llm/langchain     ← ❌ 削除忘れ（/api/llm/chatと重複）
└── /api/llm/langchain/stream ← ❌ 削除忘れ（リエクスポートのみ）
```

### 2.2 ドキュメントに記載された経緯

**langchain-migration-completion-report.md**:
```markdown
### 2.2 APIエンドポイント

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/llm/chat` | POST | 非同期チャット（LangChain版） |
| `/api/llm/stream` | POST | ストリーミングチャット（LangChain版） |
| `/api/llm/rag` | POST | RAG（文書検索） |
| `/api/llm/langchain` | POST | テスト用エンドポイント ← 明示的に「テスト用」と記載 |
| `/api/llm/langchain/stream` | POST | テスト用ストリーミング ← 明示的に「テスト用」と記載 |
```

**langchain-migration-verification-report.md**:
```markdown
### 2.4 APIエンドポイント確認

| エンドポイント | 実装 | LangChain使用 | 結果 |
|--------------|------|--------------|------|
| `/api/llm/chat` | ✅ | `createLangChainModel` | ✅ |
| `/api/llm/stream` | ✅ | `createLangChainModel` | ✅ |
| `/api/llm/rag` | ✅ | `createLangChainModel` | ✅ |
| `/api/llm/langchain` | ✅ | `createLangChainModel` | ✅ |
| `/api/llm/langchain/stream` | ✅ | `createLangChainModel` | ✅ |
```

→ 移行完了レポートでは「テスト用」と明示されているが、削除が行われなかった。

---

## 3. 現在の状況

### 3.1 コードの比較

| 項目 | `/api/llm/langchain` | `/api/llm/chat` |
|------|---------------------|-----------------|
| **目的** | LangChain版チャットAPI（テスト用） | 標準チャットAPI |
| **実装** | LangChain使用 | LangChain使用（同じ） |
| **使用量追跡** | ❌ なし | ✅ あり (`trackUsage`) |
| **デフォルトプロバイダー** | `DEFAULT_PROVIDER`定数 | `getDefaultLLMProvider()`動的取得 |
| **使用状況** | ❌ 未使用（テスト用） | ✅ 使用中 |

### 3.2 フロントエンドからの呼び出し

```typescript
// hooks/use-llm.ts
const response = await fetch('/api/llm/chat', {  // ← /api/llm/langchain ではない
  method: 'POST',
  ...
});

// components/ui/StreamingMessage.tsx
const response = await fetch('/api/llm/stream', {  // ← /api/llm/langchain/stream ではない
  method: 'POST',
  ...
});
```

---

## 4. 対応方針

### 4.1 推奨対応：削除

```
削除対象:
├── app/api/llm/langchain/
│   ├── route.ts          ← 削除（/api/llm/chatと重複）
│   └── stream/
│       └── route.ts      ← 削除（/api/llm/streamへのリエクスポート）
```

### 4.2 削除の根拠

1. **移行計画書の方針**: Phase 4で「レガシーコード整理・削除」と明記
2. **完了レポートの記載**: 「テスト用エンドポイント」と明示
3. **使用状況**: フロントエンドから一切呼び出されていない
4. **機能的重複**: `/api/llm/chat` と完全に同じ機能

### 4.3 削除手順

```bash
# 1. 削除前に参照確認（影響確認）
grep -r "llm/langchain" /home/koyomaru/agent1 --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"
# → 参照なし確認済み

# 2. ファイル削除
rm -rf /home/koyomaru/agent1/app/api/llm/langchain

# 3. ドキュメント更新
# - docs/archive/langchain-migration-completion-report.md
# - docs/archive/langchain-migration-verification-report.md
```

### 4.4 ドキュメント更新内容

**langchain-migration-completion-report.md**:
```markdown
### 2.2 APIエンドポイント

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/llm/chat` | POST | 非同期チャット（LangChain版） |
| `/api/llm/stream` | POST | ストリーミングチャット（LangChain版） |
| `/api/llm/rag` | POST | RAG（文書検索） |
| ~~`/api/llm/langchain`~~ | ~~POST~~ | ~~削除済み（テスト用）~~ |
| ~~`/api/llm/langchain/stream`~~ | ~~POST~~ | ~~削除済み（テスト用）~~ |
```

---

## 5. 代替API

削除後は以下のAPIを使用：

| 用途 | エンドポイント |
|------|---------------|
| 非同期チャット | `POST /api/llm/chat` |
| ストリーミングチャット | `POST /api/llm/stream` |
| RAG（文書検索） | `POST /api/llm/rag` |

---

## 6. まとめ

| 項目 | 内容 |
|------|------|
| **問題** | `/api/llm/langchain` と `/api/llm/langchain/stream` が重複して残存 |
| **原因** | LangChain移行Phase 4での削除忘れ |
| **影響** | なし（フロントエンドから呼び出されていない） |
| **対応** | 削除推奨 |
| **代替** | `/api/llm/chat`, `/api/llm/stream` |

---

*最終更新: 2026-02-22*
