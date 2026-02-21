# プロンプトエンジニアリング仕様

> **LLMプロンプトの設計と管理方針**
> 
> **最終更新**: 2026-02-22 00:17

---

## プロンプト構成

### 基本構造

```typescript
interface SystemPrompt {
  // 識別子
  key: string;
  
  // 表示名
  name: string;
  
  // 説明
  description?: string;
  
  // カテゴリ
  category: 'general' | 'research' | 'minutes' | 'transcript' | 'document';
  
  // プロンプト本文
  content: string;
  
  // 有効/無効
  isActive: boolean;
}
```

### プロンプト階層

```
lib/prompts/
├── index.ts              # プロンプト統合エクスポート
├── db.ts                 # DB管理 + DEFAULT_PROMPTS（シードデータ）
└── (廃止予定)
    ├── minutes.ts        # → DB管理に移行済み
    ├── transcript.ts     # → DB管理に移行済み
    └── research-*.ts     # → DB管理に移行済み
```

**注**: 個別のプロンプトファイルは廃止方向。全プロンプトはDBの `SystemPrompt` テーブルで管理。

---

## プロンプト設計原則

### 1. 明確な役割定義

```typescript
// ✅ 良い例: 役割を明確に
const RESEARCH_CAST_PROMPT = `あなたはテレビ制作の出演者リサーチ専門家です。
企画のコンセプトに合った出演者候補を提案してください。

【制約】
- 候補は30人程度
- それぞれの専門性と出演理由を簡潔に
- 過去の出演実績があれば記載`;

// ❌ 悪い例: 曖昧な指示
const BAD_PROMPT = `出演者を探してください`;
```

### 2. 出力形式の明示

```typescript
const MINUTES_PROMPT = `議事録を作成してください。

【出力形式】
## 会議概要
- 日時: YYYY/MM/DD HH:MM
- 参加者: （名前を列挙）

## 議題
1. （議題1）
   - 決定事項: ...
   - TODO: ...

## 次回アクション
- [ ] （担当者）: （タスク）`;
```

### 3. エージェント的振る舞い

```typescript
const AGENTIC_BASE_PROMPT = `## エージェント的振る舞いの原則

あなたは自律的に情報を収集・整理するAIアシスタントです。

### 1. ツール使用の原則
- 最新情報が必要な場合は **Web検索** を使用
- ソーシャルトレンドが必要な場合は **X検索** を使用
- 複数のツールを組み合わせて包括的な回答を作成

### 2. 思考プロセスの可視化
1. **分析**: ユーザーの意図を分析
2. **計画**: 必要な情報収集を計画
3. **実行**: ツールを使用して情報収集
4. **統合**: 収集した情報を統合・整理
5. **出力**: 構造化された回答を生成`;
```

### 4. 動的プロンプト生成

```typescript
// 番組設定を動的に挿入
function generateProposalPrompt(programSettings: ProgramSettings): string {
  return `あなたはテレビプロデューサーです。

【番組情報】
${programSettings.programInfo}

【過去の企画】
${programSettings.pastProposals}

上記を基に、新しい企画を提案してください。`;
}
```

---

## プロンプト管理

### DB管理（SystemPromptテーブル）

| カラム | 用途 |
|-------|------|
| `key` | 識別子（`MINUTES`, `RESEARCH_CAST`等） |
| `name` | 表示名 |
| `description` | 説明 |
| `category` | 分類（`general`, `research`, `minutes`等） |
| `content` | プロンプト本文 |
| `isActive` | 有効/無効 |
| `currentVersion` | 現在のバージョン番号 |
| `changedBy` | 最終更新者 |
| `changeNote` | 変更理由 |

### バージョン管理

`SystemPromptVersion` テーブルで履歴を管理。

| カラム | 用途 |
|-------|------|
| `promptId` | FK → SystemPrompt |
| `version` | バージョン番号（連番） |
| `content` | プロンプト本文（スナップショット） |
| `changedBy` | 変更者 |
| `changeNote` | 変更理由 |

詳細: [system-prompt-management.md](./system-prompt-management.md)

### キャッシュ戦略

- プロンプトはリクエストごとにDBから取得（現行）
- 将来的に `unstable_cache` によるキャッシュを検討
- 更新時はキャッシュをパージ

---

## プロンプト評価・改善

### 評価指標

| 指標 | 測定方法 |
|-----|---------|
| 出力品質 | 人手評価（5段階） |
| トークン効率 | 入力/出力トークン比 |
| 応答時間 | レイテンシ測定 |
| ユーザ満足度 | フィードバック収集 |

### A/Bテスト

```typescript
// プロンプトバリエーションを比較
const variations = [
  { key: 'MINUTES_V1', content: '...' },
  { key: 'MINUTES_V2', content: '...' },
];
```

---

## 関連ファイル

- `lib/prompts/db.ts` - DB管理 + シードデータ
- `lib/prompts/index.ts` - エクスポート
- `app/api/admin/prompts/` - 管理API
- [system-prompt-management.md](./system-prompt-management.md) - 詳細設計
- [llm-integration.md](./llm-integration.md) - LLM統合詳細
