---
name: feature-cleanup
description: 機能を安全に削除・移行。対象調査、リスク評価、段階的削除、検証をガイド。エージェンティック調査とスクリプトの組み合わせで網羅的な調査を実現。
---

# Feature Cleanup Skill

機能を安全に削除・移行するためのエージェント行動指針。

**重要**: このスキルは「スクリプトだけでなく、エージェントによる補完・詳細調査」を組み合わせた**エージェンティックアプローチ**を採用しています。

---

> **参照ガイド**
> - **dialog-templates.md** - Phase 4の詳細対話例（削除実行時に参照）
> - **practical-guide.md** - 実例・エラー対応・スキル改善方法（トラブル時・学習時に参照）

---

## エージェントの基本姿勢

### 判断基準：いつこのスキルを使うか

| ユーザーの発言パターン | エージェントの対応 |
|---------------------|------------------|
| 「〜を削除したい」 | 削除対象の調査から開始 |
| 「〜はもう使ってない」 | 使用状況の確認を提案 |
| 「整理したい」「掃除したい」 | クリーンアップ対象の洗い出し |
| 「LangChainを消したい」等 | 技術的負債解消として対応 |
| 「〜をアーカイブしたい」 | 移行・整理として対応 |

### 臨機応変な対応パターン

| 状況 | エージェントの対応 |
|------|------------------|
| 削除対象が明確 | analyze-risk.mjs → 即座に削除実行 |
| 削除対象が不明確 | audit-unused.mjs → **エージェントによる詳細調査** → ユーザー選択委譲 |
| 🔴重大リスク検出 | 段階的削除を推奨 |
| 🟡中リスク以下 | 一括削除を推奨 |
| ユーザーが迷っている | 判断材料を提示 |
| 削除中に問題発生 | 自動修正/手動修正/スキップ/ロールバックの選択肢を提示 |

### 重要：スクリプトとエージェントの役割分担

**基本原則：スクリプトは「候補発見」、エージェントが「最終判断」**

| 作業タイプ | スクリプトの役割 | エージェントの役割 |
|-----------|----------------|------------------|
| **候補発見** | `audit-unused.mjs` で候補リスト作成 | リストを確認し、違和感があれば追加調査 |
| **詳細調査** | `analyze.mjs` で全体像提示 | **ファイルを開いて内容を確認し、実際の使用状況を判断** |
| **リスク分析** | `analyze-risk.mjs` で候補提示 | コードを読み、本当の影響範囲を判断 |
| **削除実行** | `verify.mjs` で最終チェック | エディタでファイル編集 |

**エージェンティック調査の重要性:**
```
❌ 悪い例:
   audit-unused.mjs の結果だけを見て「削除候補はありません」と報告

✅ 良い例:
   audit-unused.mjs を実行 → 結果を確認
   → 「na-scriptはSidebarにないがページがある。実際に使われているか確認が必要」
   → grep で使用箇所を確認
   → page.tsx を開いて内容を確認
   → 「実際には無効化されており、直接URLアクセスのみ可能」と判断
   → ユーザーに「完全削除か無効化か」を確認
```

---

## エージェンティック調査ワークフロー

### Phase 0: 候補発見（スクリプト実行）

```bash
# 基本調査
node .claude/skills/feature-cleanup/scripts/audit-unused.mjs

# 深層調査（prisma/schema, types/, config/ も含む）
node .claude/skills/feature-cleanup/scripts/audit-unused.mjs --deep
```

**スクリプト出力の読み方:**
- 【✅ アクティブ機能】→ 無視
- 【⚠️ 非表示だが使用中】→ **エージェント詳細調査対象**
- 【📄 設定のみ】→ **エージェント詳細調査対象**
- 【🗑️ 削除候補】→ 即座に削除検討
- 【💬 コメントアウト済み】→ 即座に削除検討

### Phase 1: エージェントによる詳細調査（必須）

**スクリプトの結果だけで判断してはいけない。**

#### Step 1: 定義ファイルを確認

```bash
# 機能IDがどこで定義されているか確認
grep -rn "featureId.*\"機能ID\"" lib/ types/ config/ --include="*.ts"
```

該当ファイルを開いて：
- 型定義のみか、実際の設定オブジェクトもあるか
- 他の設定とどう関連しているか

#### Step 2: コード参照を確認

```bash
# どこから参照されているか
grep -rn "機能ID" app/ lib/ components/ --include="*.ts" --include="*.tsx" | head -30
```

該当ファイルを開いて：
- import されているか、文字列リテラルとしてのみ使われているか
- 実際のロジックで使用されているか、型定義のみか

#### Step 3: 実際の使用状況を判断

**判断チェックリスト:**

| 確認項目 | 削除可能サイン | 要注意サイン |
|---------|--------------|------------|
| 型定義 | 型のみで実体なし | 他の型と相互参照 |
| import | されていない | 複数ファイルからimport |
| 実行時使用 | 条件分岐で使われていない | 動的に呼び出されている |
| 将来的使用 | TODOコメントあり | 「将来使う」コメントあり |

### Phase 2: リスク評価と方針決定

```bash
node .claude/skills/feature-cleanup/scripts/analyze-risk.mjs "[機能ID]"
```

**エージェント判断ポイント:**
- スクリプトの「🔴重大」は本当に重大か？
- 「🟡中」は実際に影響があるか？

### Phase 3-5: 以降は従来通り

Phase 3以降は「Phase 0-5: 削除ワークフロー」セクションを参照。

---

## 対話型ワークフロー

削除作業は**対話的に進行**。ユーザーの判断を仰ぐポイントを明示。

### 特別モード: 未使用機能の発見と選択的削除

**「未使用機能を整理したい」などの要望があった場合：**

```bash
# まずスクリプトで候補発見
node .claude/skills/feature-cleanup/scripts/audit-unused.mjs

# 違和感があれば深層調査
node .claude/skills/feature-cleanup/scripts/audit-unused.mjs --deep
```

**エージェントによる詳細調査（必須）:**

```
スクリプト結果:
【⚠️ 非表示だが使用中】
  na-script
    参照: 11件 (app: 4, lib: 6)
    ページ: あり | API: なし

エージェントの対応:
→ 「na-script は Sidebar にないがページがあります。詳細を確認します。」
→ grep -rn "na-script" app/ --include="*.tsx"
→ page.tsx を開いて内容確認
→ 「実際には isActive=false で無効化されています。完全削除できます。」
```

**ユーザーへの提示と選択後のフロー：**
- A/B/C（削除選択）→ 通常の削除ワークフロー（Phase 2以降）へ
- D（個別確認）→ 各機能の詳細調査（analyze.mjs + エージェント調査）を実行
- E（削除しない）→ 理由を確認して記録

### 未使用機能の判断基準

| 状態 | 判断基準 | 推奨アクション |
|------|---------|--------------|
| **未使用** | Sidebarなし + 参照≤1 | 削除検討 |
| **コメントアウト** | コードがコメントアウト | 削除検討 |
| **非表示使用中** | Sidebarなし + 参照>1 | **エージェント調査必須** |
| **設定のみ** | 定義あり + コード参照なし | **エージェント調査必須** |
| **ページのみ** | ページあり + 参照なし | **エージェント調査必須** |

---

## Phase 0-5: 削除ワークフロー

### Phase 0: 意図の確認（必須）

**ユーザーが削除を示唆したら確認：**

```
「〜を削除しますね。以下を確認：
1. 完全に削除（復元時はgit revert）でよろしいですか？
2. それとも一時的に無効化（isActive=false）ですか？
3. 削除理由は？（今後の判断材料として記録）」
```

**判断基準：**
- 「完全に消す」「もう使わない」→ Hard delete
- 「いったん無効化」「将来使うかも」→ Soft delete（isActive=false）
- 「整理したい」「どれが不要か調べて」→ **audit-unused.mjs → エージェント調査**

### Phase 1: 調査・発見（スクリプト + エージェント）

```bash
# スクリプトで候補発見
node .claude/skills/feature-cleanup/scripts/audit-unused.mjs

# または特定キーワードで調査
node .claude/skills/feature-cleanup/scripts/analyze.mjs "[KEYWORD]"
```

**エージェントによる詳細調査:**

```bash
# 定義場所を確認
grep -rn "featureId.*\"機能ID\"" lib/ types/ config/ --include="*.ts"

# 参照箇所を確認
grep -rn "機能ID" app/ lib/ components/ --include="*.ts" --include="*.tsx"
```

**該当ファイルを開いて内容を確認し、実際の使用状況を判断する。**

### Phase 2: リスク評価と方針決定（ユーザー判断必須）

```bash
node .claude/skills/feature-cleanup/scripts/analyze-risk.mjs "[KEYWORD]"
```

**提示情報：**

```
「[KEYWORD] の削除リスク分析：

📊 削除対象サマリー
• ファイル: N件、コード参照: N件、DB: N件

⚠️ リスク評価
🔴 重大: 型定義への依存
🟠 高: ユーザーデータ N件
🟡 中: テストへの影響

【選択肢】
A) 完全削除 B) 一部のみ削除 C) 無効化のみ D) 段階的削除 E) 中止」
```

### Phase 3: 依存関係の評価（対話的）

**重要な依存関係がある場合、ユーザーに提示：**

```
「⚠️ 以下の重要な依存関係が検出：

1. lib/settings/db.ts にツール設定あり
   → 削除すると他機能に影響する可能性

2. DBにXX件のデータあり
   → 削除すると履歴が見えなくなる

これらへの影響を許容しますか？」
```

### Phase 4: 段階的削除（柔軟な進行）

> **詳細対話例は [references/dialog-templates.md](references/dialog-templates.md) を参照**

**各ステップでユーザーに提示：**

| Step | 内容 | 選択肢 |
|------|------|--------|
| 4.1 | ファイル削除 | 削除/スキップ/確認/中止 |
| 4.2 | コード参照修正 | 自動修正/手動修正/選択/スキップ |
| 4.3 | DBデータ削除 | 完全削除/無効化/保持/スキップ |

**DB削除手順（Prisma使用）:**
```bash
# スクリプトを作成して実行
cat > scripts/delete-feature.mjs << 'EOF'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const featureId = '削除する機能ID';
const promptKeys = ['RESEARCH_LOCATION', 'RESEARCH_INFO']; // 関連するSystemPromptキー

async function deleteFeature() {
  // 1. FeaturePrompt削除
  await prisma.featurePrompt.deleteMany({ where: { featureId } });
  
  // 2. SystemPromptVersion削除
  for (const key of promptKeys) {
    const prompt = await prisma.systemPrompt.findUnique({ where: { key } });
    if (prompt) {
      await prisma.systemPromptVersion.deleteMany({ where: { promptId: prompt.id } });
      await prisma.systemPrompt.delete({ where: { key } });
    }
  }
}

deleteFeature().finally(() => prisma.$disconnect());
EOF

node scripts/delete-feature.mjs
rm scripts/delete-feature.mjs
```
| 4.4 | 検証 | 問題あれば自動修正/手動修正/やり直し |

**反復的進行：**
```
ファイル削除 → 検証 → コード修正 → 検証 → DB削除 → 検証 → 完了
     ↑___________|    ↑__________|    ↑_________|
       （問題があれば戻る）
```

### Phase 5: 検証と完了（自動+確認）

```bash
node .claude/skills/feature-cleanup/scripts/verify.mjs "[KEYWORD]"
```

**検証時の注意点:**

1. **Next.js キャッシュ削除**
   ```bash
   # 型チェックエラーが出る場合はキャッシュを削除
   rm -rf .next
   npx tsc --noEmit
   ```

2. **Lint自動修正**
   ```bash
   # 未使用importなどはbiomeが自動修正
   npx biome check --write .
   # または lefthook経由で自動修正
   git commit -m "..."  # pre-commitフックで自動修正
   ```

**結果を提示：**

```
「削除検証結果：

✅ ファイル削除: 完了
✅ コード参照削除: 完了  
✅ DBデータ削除: 完了
✅ 型チェック: 通過
✅ Lint: 通過

すべての削除が完了しました。

最終確認：
- 削除をコミットしますか？
  git add . && git commit -m "cleanup: remove [feature]"
- 削除理由を docs/lessons/ に記録しますか？」
```

---

## ユーザー介入が必要なポイント

| # | 介入ポイント | 判断内容 | デフォルト動作 |
|---|------------|---------|--------------|
| 1 | **削除方針決定** | Hard/Soft delete | 確認を求める |
| 2 | **依存関係評価** | 影響を許容するか | 確認を求める |
| 3 | **各ステップ実行** | 実行/中断/変更 | 確認を求める |
| 4 | **問題発見時** | 続行/中断/方針変更 | 選択肢を提示 |
| 5 | **最終コミット** | コミットメッセージ | 確認を求める |

**自動実行してよいもの：**
- ✅ 調査（analyze.mjs, audit-unused.mjs）
- ✅ 事前チェック（pre-check.mjs）
- ✅ 検証（verify.mjs）
- ✅ 型チェック

**確認が必要なもの：**
- ❌ スクリプト結果のみでの最終判断
- ❌ ファイル削除
- ❌ コード修正
- ❌ DB削除
- ❌ gitコミット

---

## スクリプト一覧

| スクリプト | 用途 | 実行タイミング | エージェント補完 |
|-----------|------|--------------|-----------------|
| `audit-unused.mjs` | 未使用機能の発見 | Phase 1 | **必須** - 結果を確認し追加調査 |
| `analyze.mjs` | 削除対象の自動検出 | Phase 1 | 推奨 - ファイル内容確認 |
| `analyze-risk.mjs` | 削除リスクの詳細分析 | Phase 2 | 推奨 - 本当の影響範囲確認 |
| `pre-check.mjs` | 削除前の状態確認 | Phase 2 | - |
| `verify.mjs` | 削除後の検証 | Phase 5 | - |

### スクリプト使用時の注意

**audit-unused.mjs:**
```bash
# 基本調査（app/, lib/, components/ のみ）
node audit-unused.mjs

# 深層調査（prisma/schema, types/, config/ も含む）
node audit-unused.mjs --deep
```

**重要**: `--deep` でも網羅的ではない。エージェントによる追加調査が必要。

---

## 削除対象カテゴリと対応

### 1. フロントエンドファイル

| 対象 | パターン | 対応 |
|------|---------|------|
| ページ | `app/**/[feature]/page.tsx` | 削除 |
| レイアウト | `app/**/[feature]/layout.tsx` | 削除 |
| API | `app/api/[feature]/route.ts` | 削除 |
| コンポーネント | `components/**/[Feature]*` | 削除 |

### 2. コード（修正必須）

| 対象 | パターン | 優先度 |
|------|---------|--------|
| 型定義 | `type FeatureId = \| "feature"` | 🔴 高 |
| 定数 | `FEATURES = { "feature": ... }` | 🔴 高 |
| Agent定義 | `AGENTS = [{ id: "feature" }]` | 🔴 高 |
| 設定 | `featureConfigs = { "feature": ... }` | 🔴 高 |
| DB設定 | `db.ts` のマッピング | 🔴 高 |
| UI | Sidebar, ボタン | 🟡 中 |
| ページリンク | `page.tsx` のリンク | 🟡 中 |

### 3. DBデータ

| 対象 | テーブル | Hard Delete | Soft Delete |
|------|---------|-------------|-------------|
| プロンプト | SystemPrompt | DELETE | isActive=false |
| 機能紐付け | FeaturePrompt | DELETE | isActive=false |
| バージョン履歴 | SystemPromptVersion | CASCADE DELETE | - |
| ユーザーデータ | Chat, Message | 別途検討 | 別途検討 |

### 4. ドキュメント

| 種類 | 対応 | 理由 |
|------|------|------|
| plans/ | archiveへ移動 | 完了した計画 |
| backlog/ | 削除 | 不要なタスク |
| specs/ | 更新 or 削除 | 仕様の変更 |
| lessons/ | **保持** | 学びは価値がある |
| archive/ | 保持 | すでにアーカイブ済 |

---

## 典型的な削除パターン

| パターン | 特徴 | フロー |
|---------|------|--------|
| **A: シンプル削除** | 依存が少ない | analyze → 削除 → verify → **git commit** |
| **B: 複雑な依存** | 修正が多い | analyze → 段階的修正 → verify → **git commit** |
| **C: ライブラリ削除** | npm関連 | analyze → import削除 → npm uninstall → verify → **git commit** |
| **D: エージェンティック調査** | 不明確な候補 | **audit-unused → エージェント調査** → 削除 → verify → **git commit** |

**すべてのパターン共通**: 最後は必ず `git commit`

---

## 実践ガイド・エラー対応・スキル改善

> **詳細は [references/practical-guide.md](references/practical-guide.md) を参照**

**参照タイミング：**
- **削除実行中に問題が発生した時** → practical-guide.md の「トラブルシューティング」
- **具体的な削除例が知りたい時** → practical-guide.md の「実例：na-script削除」
- **スキルを改善・カスタマイズしたい時** → practical-guide.md の「スキルの継続的改善」
- **人間による最終確認が必要な時** → practical-guide.md の「目視確認チェックリスト」

---

## スキルの継続的改善

このスキルを使用する際、以下の改善機会があれば即座に更新してください：

1. **「この手順がない」** → SKILL.md に追加
2. **「このスクリプトがほしい」** → scripts/ に作成
3. **「説明がわかりにくい」** → SKILL.md を書き換え
4. **「エラーが出た」** → トラブルシューティング追加
5. **「もっと効率的な方法がある」** → ベストプラクティス更新

**改善例:**
```
使用中: 「audit-unused.mjs が [xxx] を検出できていない」
↓
即座に修正: スクリプトに [xxx] の検出ロジックを追加
↓
コミット: git commit -m "refactor(skill): improve audit-unused - add [xxx] detection"
```
