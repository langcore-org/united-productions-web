# na-script機能削除計画書

## 概要

NA原稿作成機能（na-script）を完全に削除する。現在Sidebarからは非表示（コメントアウト）されており、将来の実装予定もないため、コードベースから完全に削除して保守性を向上させる。

**作成日**: 2026-02-27  
**優先度**: 中  
**見積もり**: 2時間

---

## 背景・削除理由

1. **未使用機能**: Sidebarからコメントアウトされており、ユーザーからアクセス不可
2. **実装予定なし**: 「第2段階以降で実装予定」とされていたが、優先度が下がり実装予定がない
3. **保守コスト削減**: 使用しないコードは削除し、認知負荷を下げる
4. **機能重複**: 議事録作成機能（minutes）と類似した「文字起こし→整形」というユースケース

---

## 削除対象一覧

### Phase 1: フロントエンド（30分）

| # | 対象 | パス | 対応内容 |
|---|------|------|----------|
| 1 | ページコンポーネント | `app/(authenticated)/na-script/page.tsx` | **削除** |
| 2 | Sidebarコメント | `components/layout/Sidebar.tsx` | コメントアウト部分を完全削除 |
| 3 | DBデータ削除 | `SystemPrompt`, `FeaturePrompt` | **完全削除**（hard delete）|

### Phase 2: API・バックエンド（30分）

| # | 対象 | パス | 対応内容 |
|---|------|------|----------|
| 3 | APIルート | `app/api/transcripts/route.ts` | **削除** |
| 4 | プロンプトファイル | `prompts/transcript-format.ts` | **削除** |

### Phase 3: 共通コード修正（45分）

| # | 対象 | パス | 対応内容 |
|---|------|------|----------|
| 5 | Agent定義 | `lib/chat/agents.ts` | `na-script`を`AgentId`型と`AGENTS`配列から削除 |
| 6 | チャット設定 | `lib/chat/chat-config.ts` | `na-script`を`ChatFeatureId`型と`chatFeatureConfigs`から削除 |
| 7 | プロンプトキー | `lib/prompts/constants/keys.ts` | `TRANSCRIPT`, `TRANSCRIPT_FORMAT`を削除 |
| 8 | 設定DB | `lib/settings/db.ts` | `na-script`のツール設定を削除 |
| 9 | 履歴ページ | `app/(authenticated)/chat/history/page.tsx` | `na-script`の履歴表示を削除 |
| 10 | トップページ | `app/page.tsx` | `na-script`へのリンクを削除 |

### Phase 4: DBデータ完全削除（15分）

| # | 対象 | テーブル | 対応内容 |
|---|------|---------|----------|
| 8 | SystemPrompt | `SystemPrompt` | `TRANSCRIPT`, `TRANSCRIPT_FORMAT` レコードを**完全削除** |
| 9 | FeaturePrompt | `FeaturePrompt` | `featureId=na-script` レコードを**完全削除** |
| 10 | SystemPromptVersion | `SystemPromptVersion` | 関連するバージョン履歴も**完全削除** |
| 11 | DBシードデータ | `prisma/migrations/*/seed.sql` | `TRANSCRIPT`, `TRANSCRIPT_FORMAT`のINSERT文を**削除** |

**方針**: 
- **完全削除（hard delete）** - 今後使わないため復元不要
- 削除したのにデータが残っていると勘違いを防ぐため
- 復元が必要になったら、初期シードデータから再投入

---

## 削除前の事前確認（必須）

削除作業を開始する前に、削除対象を確認：

```bash
echo "=== 削除前確認 ==="
echo ""
echo "【削除対象ファイル】"
ls -la app/(authenticated)/na-script/page.tsx 2>/dev/null || echo "❌ page.tsx: 既に存在しない"
ls -la app/api/transcripts/route.ts 2>/dev/null || echo "❌ route.ts: 既に存在しない"
ls -la prompts/transcript-format.ts 2>/dev/null || echo "❌ transcript-format.ts: 既に存在しない"

echo ""
echo "【DBデータ確認】"
node .claude/skills/db-query/scripts/query.mjs find SystemPrompt "key~TRANSCRIPT" --fields key,name,isActive
echo ""
node .claude/skills/db-query/scripts/query.mjs find FeaturePrompt "featureId=na-script" --fields featureId,promptKey,isActive

echo ""
echo "【コード参照確認】"
echo "na-script参照:"
grep -r "na-script" app/ lib/ components/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5 || echo "  なし"
echo ""
echo "TRANSCRIPT参照（PROMPT_KEYS除く）:"
grep -r "TRANSCRIPT" app/ lib/ components/ --include="*.ts" --include="*.tsx" | grep -v "PROMPT_KEYS" | head -5 || echo "  なし"
```

---

## 実装手順

### Step 1: ファイル削除

```bash
# 1. ページ削除
rm app/(authenticated)/na-script/page.tsx

# 2. API削除
rm app/api/transcripts/route.ts

# 3. プロンプトファイル削除
rm prompts/transcript-format.ts
```

### Step 2: コード修正

#### `lib/chat/agents.ts`
```typescript
// 削除: AgentId型から "na-script" を削除
export type AgentId =
  | "general"
  | "research-cast"
  | "research-evidence"
  | "minutes"
  | "proposal";
  // | "na-script";  ← 削除

// 削除: AGENTS配列から na-script オブジェクトを削除
// id: "na-script" から始まるオブジェクト全体を削除
```

#### `lib/chat/chat-config.ts`
```typescript
// 削除: ChatFeatureId型から "na-script" を削除
export type ChatFeatureId =
  | "general-chat"
  | "research-cast"
  | "research-location"
  | "research-info"
  | "research-evidence"
  | "minutes"
  | "proposal";
  // | "na-script";  ← 削除

// 削除: chatFeatureConfigsから na-script 設定を削除
// "na-script": { ... } 全体を削除
```

#### `lib/prompts/constants/keys.ts`
```typescript
export const PROMPT_KEYS = {
  // Agentic Base
  AGENTIC_BASE: "AGENTIC_BASE",

  // General
  GENERAL_CHAT: "GENERAL_CHAT",

  // Minutes
  MINUTES: "MINUTES",
  MEETING_FORMAT_MEETING: "MEETING_FORMAT_MEETING",
  MEETING_FORMAT_INTERVIEW: "MEETING_FORMAT_INTERVIEW",

  // Transcript ← このセクション全体を削除
  // TRANSCRIPT: "TRANSCRIPT",
  // TRANSCRIPT_FORMAT: "TRANSCRIPT_FORMAT",

  // Research
  RESEARCH_CAST: "RESEARCH_CAST",
  RESEARCH_LOCATION: "RESEARCH_LOCATION",
  RESEARCH_INFO: "RESEARCH_INFO",
  RESEARCH_EVIDENCE: "RESEARCH_EVIDENCE",

  // Document
  PROPOSAL: "PROPOSAL",
} as const;
```

#### `components/layout/Sidebar.tsx`
```typescript
// 削除: コメントアウト済みのNA原稿作成ボタン定義を完全削除
// 59-65行目のコメントブロックを削除
// NA原稿作成は第2段階以降で実装予定
// {
//   icon: <Mic className="w-[18px] h-[18px]" />,
//   label: "NA原稿作成",
//   href: "/chat?agent=na-script&new=1",
//   description: "NA原稿を作成",
// },
```

### Step 3: DBデータ完全削除

```bash
# 削除スクリプトを作成して実行
cat > scripts/delete-na-script-db.mjs << 'EOF'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // FeaturePrompt削除
  await prisma.featurePrompt.deleteMany({
    where: { featureId: 'na-script' }
  });
  console.log('Deleted FeaturePrompt: na-script');

  // SystemPromptVersion削除（関連する履歴）
  const prompts = await prisma.systemPrompt.findMany({
    where: { key: { in: ['TRANSCRIPT', 'TRANSCRIPT_FORMAT'] } }
  });
  
  for (const p of prompts) {
    await prisma.systemPromptVersion.deleteMany({
      where: { promptId: p.id }
    });
    console.log(`Deleted versions for: ${p.key}`);
  }

  // SystemPrompt削除
  await prisma.systemPrompt.deleteMany({
    where: { key: { in: ['TRANSCRIPT', 'TRANSCRIPT_FORMAT'] } }
  });
  console.log('Deleted SystemPrompts: TRANSCRIPT, TRANSCRIPT_FORMAT');

  await prisma.$disconnect();
}

main().catch(console.error);
EOF

node scripts/delete-na-script-db.mjs

# 削除確認
node .claude/skills/db-query/scripts/query.mjs find SystemPrompt "key~TRANSCRIPT"
node .claude/skills/db-query/scripts/query.mjs find FeaturePrompt "featureId=na-script"
# → 両方とも「found: 0」になるはず

### Step 4: 削除確認（チェックリスト）

#### 4.1 ファイル削除確認

```bash
# 削除したファイルが残っていないか確認
echo "=== 削除ファイル確認 ==="
ls app/(authenticated)/na-script/page.tsx 2>&1 || echo "✅ page.tsx 削除済"
ls app/api/transcripts/route.ts 2>&1 || echo "✅ route.ts 削除済"
ls prompts/transcript-format.ts 2>&1 || echo "✅ transcript-format.ts 削除済"
```

#### 4.2 コード参照確認

```bash
echo "=== コード参照確認 ==="

# na-scriptの参照が残っていないか
echo "1. na-script参照:"
grep -r "na-script" app/ lib/ components/ --include="*.ts" --include="*.tsx" 2>/dev/null || echo "✅ na-script参照なし"

# TRANSCRIPTキーの参照（PROMPT_KEYS定義を除く）
echo "2. TRANSCRIPTキー参照:"
grep -r "TRANSCRIPT" app/ lib/ components/ --include="*.ts" --include="*.tsx" | grep -v "PROMPT_KEYS" | grep -v "// " || echo "✅ TRANSCRIPT参照なし"

# transcript-formatのインポート
echo "3. transcript-formatインポート:"
grep -r "transcript-format" app/ lib/ components/ --include="*.ts" --include="*.tsx" 2>/dev/null || echo "✅ transcript-format参照なし"

# Sidebarのコメントアウト削除確認
echo "4. Sidebarコメント削除確認:"
grep -n "NA原稿作成\|na-script\|Mic.*NA" components/layout/Sidebar.tsx || echo "✅ Sidebarコメント削除済"
```

#### 4.3 DB削除確認

```bash
echo "=== DB削除確認 ==="

# SystemPrompt確認
node .claude/skills/db-query/scripts/query.mjs find SystemPrompt "key=TRANSCRIPT" 2>&1 | grep -q "found: 0" && echo "✅ TRANSCRIPT削除済" || echo "❌ TRANSCRIPT残存"
node .claude/skills/db-query/scripts/query.mjs find SystemPrompt "key=TRANSCRIPT_FORMAT" 2>&1 | grep -q "found: 0" && echo "✅ TRANSCRIPT_FORMAT削除済" || echo "❌ TRANSCRIPT_FORMAT残存"

# FeaturePrompt確認
node .claude/skills/db-query/scripts/query.mjs find FeaturePrompt "featureId=na-script" 2>&1 | grep -q "found: 0" && echo "✅ na-script FeaturePrompt削除済" || echo "❌ na-script FeaturePrompt残存"
```

### Step 5: ビルド・テスト

```bash
# 型チェック
echo "=== 型チェック ==="
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20 || echo "✅ 型チェック完了"

# ビルドテスト
echo "=== ビルドテスト ==="
npm run build 2>&1 | tail -10 || echo "✅ ビルド完了"

# Lint
echo "=== Lintチェック ==="
npm run lint 2>&1 | tail -10 || echo "✅ Lint完了"
```

### Step 6: 最終確認サマリー

削除作業完了後、以下のチェックリストを確認：

| # | 確認項目 | 確認方法 | 期待結果 |
|---|---------|---------|---------|
| 1 | `app/(authenticated)/na-script/page.tsx` | `ls` | ファイルが存在しない |
| 2 | `app/api/transcripts/route.ts` | `ls` | ファイルが存在しない |
| 3 | `prompts/transcript-format.ts` | `ls` | ファイルが存在しない |
| 4 | `na-script` Agent定義 | `grep` | `agents.ts`に参照がない |
| 5 | `na-script` ChatConfig | `grep` | `chat-config.ts`に参照がない |
| 6 | `TRANSCRIPT` キー定数 | `grep` | `keys.ts`に参照がない |
| 7 | Sidebarコメント | `grep` | コメントアウト部分が削除されている |
| 8 | DB SystemPrompt | `query.mjs` | TRANSCRIPT, TRANSCRIPT_FORMATが0件 |
| 9 | DB FeaturePrompt | `query.mjs` | na-scriptが0件 |
| 10 | ビルド | `npm run build` | エラーなし |
| 11 | 型チェック | `tsc` | エラーなし |
| 12 | Lint | `biome` | エラーなし |

---

## 影響範囲・確認事項

### 確認が必要なファイル

| ファイル | 確認内容 |
|----------|----------|
| `middleware.ts` | `/na-script` パスの認証設定があれば削除 |
| `tests/e2e/smoke.spec.ts` | na-script関連のE2Eテストがあれば削除 |
| `lib/prompts/db.ts` | `TRANSCRIPT` キーのデフォルトプロンプト定義があれば削除 |

### 依存関係チェック

```bash
# na-scriptの参照を検索
grep -r "na-script" app/ lib/ components/ --include="*.ts" --include="*.tsx"

# TRANSCRIPTの参照を検索（constantsは除く）
grep -r "TRANSCRIPT" app/ lib/ components/ --include="*.ts" --include="*.tsx" | grep -v "PROMPT_KEYS"

# transcript-formatの参照を検索
grep -r "transcript-format" app/ lib/ components/ --include="*.ts" --include="*.tsx"
```

---

## 復元計画（数か月後の再実装用）

### 復元戦略

削除はGitで管理するため、**完全削除**して問題なし。復元時は以下の方法を使用：

#### 方法1: git revert（推奨）

削除コミットを1つにまとめておけば、`git revert`で一発復元：

```bash
# 削除コミットのハッシュを確認
git log --oneline --grep="remove na-script"

# 削除を revert（削除されたファイルが復活）
git revert <コミットハッシュ>
```

#### 方法2: ファイル単位で復元

特定のファイルだけ復元する場合：

```bash
# 削除されたファイルをGit履歴から復元
git show HEAD~1:app/(authenticated)/na-script/page.tsx > app/(authenticated)/na-script/page.tsx
git show HEAD~1:app/api/transcripts/route.ts > app/api/transcripts/route.ts
git show HEAD~1:prompts/transcript-format.ts > prompts/transcript-format.ts
```

### 復元時のチェックリスト

```bash
# 1. 削除されたファイルを復元後、型定義を元に戻す
#    - lib/chat/agents.ts: "na-script" を AgentId に追加
#    - lib/chat/chat-config.ts: "na-script" を ChatFeatureId に追加
#    - lib/prompts/constants/keys.ts: TRANSCRIPT, TRANSCRIPT_FORMAT を追加

# 2. Sidebarのコメントアウトを解除
#    - components/layout/Sidebar.tsx: NEW_CHAT_BUTTONS にNA原稿作成ボタンを追加

# 3. DBにプロンプトを再投入（完全削除したため）
#    - prisma/migrations/*/seed.sql から TRANSCRIPT, TRANSCRIPT_FORMAT を復元
#    - または、初期シードSQLを再実行
```

### 削除前のバックアップ（実行時）

```bash
# 削除前に必ずコミット
git add .
git commit -m "chore: backup before na-script deletion"

# 削除は1つのコミットにまとめる（revertしやすくするため）
# 1. ファイル削除 + コード修正を行う
# 2. git add .
# 3. git commit -m "feat: remove na-script feature for future reimplementation"
```

### 削除対象ファイル一覧（復元時参照用）

| # | ファイルパス | 用途 | 復元優先度 |
|---|-------------|------|-----------|
| 1 | `app/(authenticated)/na-script/page.tsx` | ページコンポーネント | 必須 |
| 2 | `app/api/transcripts/route.ts` | APIエンドポイント | 必須 |
| 3 | `prompts/transcript-format.ts` | プロンプトテンプレート | 必須 |
| 4 | `lib/chat/agents.ts`（na-script部分） | Agent定義 | 型定義修正とセット |
| 5 | `lib/chat/chat-config.ts`（na-script部分） | チャット設定 | 型定義修正とセット |
| 6 | `lib/prompts/constants/keys.ts`（TRANSCRIPT*） | プロンプトキー | 型定義修正とセット |

### 注意事項

- **DBデータは完全削除**（hard delete）- 今後使わないため復元不要
- **復元が必要になったら**: シードデータから再投入、または再作成
- **依存関係の変化に注意**（数か月後、ライブラリや型定義が変わっている可能性あり）

---

## 実装状況・チェックリスト

削除作業開始前に必ずコミット:
```bash
git add .
git commit -m "chore: backup before na-script deletion"
```

| # | タスク | ステータス | 確認コマンド | 完了日 |
|---|--------|-----------|-------------|--------|
| 1 | ファイル削除 - `app/(authenticated)/na-script/page.tsx` | ⏸️ | `ls app/(authenticated)/na-script/page.tsx` | - |
| 2 | ファイル削除 - `app/api/transcripts/route.ts` | ⏸️ | `ls app/api/transcripts/route.ts` | - |
| 3 | ファイル削除 - `prompts/transcript-format.ts` | ⏸️ | `ls prompts/transcript-format.ts` | - |
| 4 | コード修正 - `lib/chat/agents.ts` (na-script削除) | ⏸️ | `grep "na-script" lib/chat/agents.ts` | - |
| 5 | コード修正 - `lib/chat/chat-config.ts` (na-script削除) | ⏸️ | `grep "na-script" lib/chat/chat-config.ts` | - |
| 6 | コード修正 - `lib/prompts/constants/keys.ts` (TRANSCRIPT*削除) | ⏸️ | `grep "TRANSCRIPT" lib/prompts/constants/keys.ts` | - |
| 7 | コード修正 - `components/layout/Sidebar.tsx` (コメント削除) | ⏸️ | `grep -n "NA原稿作成" components/layout/Sidebar.tsx` | - |
| 8 | DB削除 - SystemPrompt (TRANSCRIPT, TRANSCRIPT_FORMAT) | ⏸️ | `node query.mjs find SystemPrompt "key=TRANSCRIPT"` | - |
| 9 | DB削除 - FeaturePrompt (na-script) | ⏸️ | `node query.mjs find FeaturePrompt "featureId=na-script"` | - |
| 10 | DBシード更新 - `prisma/migrations/*/seed.sql` | ⏸️ | `grep "TRANSCRIPT" prisma/migrations/*/seed.sql` | - |
| 11 | 検証 - 型チェック通過 | ⏸️ | `npx tsc --noEmit` | - |
| 12 | 検証 - ビルド通過 | ⏸️ | `npm run build` | - |
| 13 | 検証 - Lint通過 | ⏸️ | `npm run lint` | - |
| 14 | 最終 - 削除確認スクリプト実行 | ⏸️ | 本文中の確認スクリプト | - |

---

## 備考

- ~~DBの`SystemPrompt`テーブルには既存データを保持~~ → **完全削除（hard delete）**
- `Transcript`モデル（`prisma/schema.prisma`）は他機能で使用している可能性があるため、削除しない
- 将来的に復活する場合は、この計画書を参照して逆順に実装する（DBはシードデータから再投入）
