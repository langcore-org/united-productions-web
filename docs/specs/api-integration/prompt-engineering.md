# プロンプトエンジニアリング仕様

> **LLMプロンプトの設計と管理方針**
> 
> **最終更新**: 2026-02-20 13:10

## プロンプト構成

### 基本構造

```typescript
interface SystemPrompt {
  // 役割定義
  role: string;
  
  // 制約条件
  constraints: string[];
  
  // 出力形式
  outputFormat: string;
  
  // 例示（few-shot）
  examples?: Example[];
}
```

### プロンプト階層

```
lib/prompts/
├── index.ts              # プロンプト統合エクスポート
├── general-chat.ts       # 汎用チャット
├── minutes.ts            # 議事録作成
├── transcript.ts         # 文字起こし整形
├── na-script.ts          # NA原稿作成
├── proposal.ts           # 新企画立案
├── research-cast.ts      # 出演者リサーチ
├── research-location.ts  # 場所リサーチ
├── research-info.ts      # 情報リサーチ
└── research-evidence.ts  # エビデンスリサーチ
```

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

### 3. 動的プロンプト生成

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

## プロンプト管理

### DB管理（SystemPromptテーブル）

| カラム | 用途 |
|-------|------|
| `key` | 識別子（`MINUTES`, `RESEARCH_CAST`等） |
| `category` | 分類（`general`, `research`, `minutes`等） |
| `content` | プロンプト本文 |
| `isActive` | 有効/無効 |

### キャッシュ戦略

- プロンプトは起動時にメモリにキャッシュ
- DB更新時にキャッシュクリア
- 詳細: [llm-integration.md](./llm-integration.md#キャッシュ)

## プロンプト評価・改善

### 評価指標

| 指標 | 測定方法 |
|-----|---------|
| 出力品質 | 人手評価（5段階） |
| トークン効率 | 入力/出力トークン比 |
| 応答時間 | レイテンシ測定 |

### A/Bテスト

```typescript
// プロンプトバリエーションを比較
const variations = [
  { key: 'MINUTES_V1', content: '...' },
  { key: 'MINUTES_V2', content: '...' },
];
```

## 関連ファイル

- `lib/prompts/` - プロンプト定義
- `lib/prompts/db.ts` - DB管理
- [llm-integration.md](./llm-integration.md) - LLM統合詳細
