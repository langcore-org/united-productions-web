> **優先度**: ⏸️ 保留
> **最終更新**: 2026-03-20
> **発見日**: 2026-02-24
> **関連ファイル**: 
> - lib/llm/memory/threshold-rolling-summary.ts
> - hooks/useLLMStream/index.ts
> - prisma/schema.prisma

# TODO: DBに要約コンテキストを保存

## 背景

現在のRolling Summary Memoryは、要約を**メモリ上（useRef）のみ**に保持している。
ページリロード時に要約が消失し、再生成が必要になる。

## 現状の動作

```
【初回アクセス】
ユーザー入力 → Memoryに追加 → 閾値超過で要約生成
                              ↓
                        API送信（要約+直近10ターン）
                              ↓
                        AIレスポンス → DB保存（全履歴のみ）

【ページリロード】
DB読み込み（全履歴） → Memory再構築 → 要約再生成（APIコスト発生）
```

## 問題

| 項目 | 影響 |
|------|------|
| APIコスト | 再読み込みごとに要約再生成（無駄） |
| レスポンス速度 | 要約生成の待ち時間（数秒） |
| UX | 再読み込み後、一時的に文脈が薄れる |

## 解決案

### DBスキーマ追加

```prisma
// prisma/schema.prisma
model Conversation {
  id               String    @id @default(cuid())
  messages         Json      // 全履歴
  summary          String?   // 【追加】要約文
  summaryUpdatedAt DateTime? // 【追加】要約更新日時
  // ...
}
```

### 実装内容

1. **保存**: 要約生成時にDBに保存
2. **復元**: 会話読み込み時にDBから復元
3. **更新**: 新しい要約が生成されたら上書き

## 発動条件（いつ対応するか）

- [ ] 要約生成のAPIコストが予算を圧迫
- [ ] ユーザーから「再読み込みが遅い」というフィードバック
- [ ] 会話履歴が長くなり、再生成コストが顕著になる

## 参考

- 設計書: docs/plans/current/conversation-memory-design.md
- 実装済み: lib/llm/memory/threshold-rolling-summary.ts

---

## 関連ドキュメント

- [Backlog README](./README.md) - Backlog管理ガイド
- [AGENTS.md](../../AGENTS.md) - エージェント行動指針

---

**最終更新**: 2026-03-20 14:35
