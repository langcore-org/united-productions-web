# Practical Guide

実例・エラー対応・スキル改善ガイド

削除作業中のトラブル対応や、スキルの継続的改善方法をまとめた実践的リファレンス。

---

## 1. 実例：na-script削除の完全フロー

実際の作業フロー例。削除作業の具体像を把握する際に参照。

### Step 1: 初期調査

```
【エージェントの作業】

1. analyze.mjs を実行
   → 候補ファイル一覧を取得

2. 自分でファイルを開いて確認
   → app/(authenticated)/na-script/page.tsx を読む
   → 「ChatPageコンポーネントを使っているだけ、単純なページ」
   → lib/chat/agents.ts を読む  
   → 「Agent定義がある、他にも影響ありそう」
```

### Step 2: 依存関係の把握

```
【エージェントの作業】

1. 自分でgrep検索
   → grep -r "na-script" lib/ --include="*.ts"
   → 「agents.ts, chat-config.ts, settings/db.ts に影響あり」

2. 各ファイルを開いて確認
   → agents.ts: Union型の定義、AGENTS配列
   → chat-config.ts: ChatFeatureConfigsの定義
   → settings/db.ts: ツール設定
   → 「3箇所の修正が必要」
```

### Step 3: リスク判断

```
【エージェントの作業】

1. analyze-risk.mjs を実行（参考として）
   → 「重大リスク: 型定義への依存」という出力

2. 自分で判断
   → 「型定義は単純なUnion型から削除するだけ、機械的に修正可能」
   → 「他機能への影響はなさそう（na-script固有の設定）」
   → 「削除可能と判断」
```

### Step 4: 削除実行

```
【エージェントの作業】

自分でファイル編集:
  → page.tsx を削除
  → agents.ts から na-script を削除
  → chat-config.ts から na-script を削除
  → settings/db.ts から na-script を削除
```

### Step 5: 検証

```
【エージェントの作業】

1. verify.mjs を実行（最終チェック）
   → 「すべてクリア」の出力

2. 自分で最終確認
   → 型チェック: npx tsc --noEmit
   → ビルド: npm run build
   → 「問題なし」
```

**重要なポイント：**
- スクリプトは「全体像把握」や「最終チェック」で使用
- 実際の判断や編集はエージェントが自分で行う
- スクリプトの出力は**参考**であって**絶対**ではない

---

## 2. 実例：複数機能の一括削除

### 2026-02-27: research-location, research-info, na-script の削除

**背景:**
- 3機能ともSidebarには表示されていないが、実装は完了していた
- 今後使用予定がないため完全削除を決定
- DBデータも含めて完全に削除

**削除対象:**
```
research-location（場所リサーチ）
research-info（情報リサーチ）
na-script（NA原稿作成）
```

**実行手順:**

```bash
# 1. 調査（audit-unused.mjs + エージェント詳細調査）
node audit-unused.mjs --deep
# → 4機能が「非表示だが使用中」として検出
# → エージェントが各機能を調査し、3機能を削除対象と判断

# 2. 個別にanalyze.mjsで詳細調査
node analyze.mjs "research-location"
node analyze.mjs "research-info"
node analyze.mjs "na-script"

# 3. コード修正
# - lib/chat/chat-config.ts: 型定義・設定削除
# - lib/chat/agents.ts: na-scriptのAgent定義削除
# - lib/settings/db.ts: ツール設定削除
# - app/page.tsx: na-scriptクイックアクセス削除
# - app/(authenticated)/chat/history/page.tsx: フィルター削除
# - components/layout/Sidebar.tsx: コメント削除

# 4. ページ削除
rm app/(authenticated)/agent/location/page.tsx
rm app/(authenticated)/agent/info/page.tsx
rm app/(authenticated)/na-script/page.tsx

# 5. DB削除（Prismaスクリプト）
node scripts/delete-features.mjs
# → FeaturePrompt 3件削除
# → SystemPrompt 4件削除（RESEARCH_LOCATION, RESEARCH_INFO, TRANSCRIPT, TRANSCRIPT_FORMAT）
# → SystemPromptVersion 12件削除

# 6. ドキュメントアーカイブ
mv docs/specs/features/research-location.md docs/archive/features/
mv docs/specs/features/research-info.md docs/archive/features/
mv docs/plans/na-script.md docs/archive/features/

# 7. 検証
npx tsc --noEmit
# → .next/types/validator.ts でエラー（削除したページを参照）
rm -rf .next  # キャッシュ削除
npx tsc --noEmit  # 再実行 → 成功
```

**学び:**
- Next.jsは`.next`キャッシュに型情報を保持しているため、ページ削除後はキャッシュ削除が必要
- DB削除はPrisma Clientを直接使用するスクリプトが最も確実
- 複数機能を同時削除する場合は、1機能ずつコミットするか、まとめてコミットするかをユーザーと相談

---

## 3. スクリプト過度依存の警告サイン

以下の状態になったら、スクリプトへの依存が強すぎる可能性：

| 警告サイン | 対応 |
|-----------|------|
| 「スクリプトが言うから」だけで判断している | 自分でコードを読み直す |
| スクリプト出力を鵜呑みにしてファイルを削除している | 削除前に自分でファイル内容を確認する |
| スクリプトエラーを無視して進めようとしている | エラーの原因を自分で調査する |
| スクリプトが検出しない箇所を無視している | 自分で追加の検索を行う |

**目標：スクリプト無しでも作業できる状態**

```
スクリプトが動かない環境でも、エージェントは以下で作業できる：
- grep / find コマンド
- ファイルの直接読み書き
- コードの手動分析
```

---

## 4. エラー対応・問題解決

### 4.1 削除中にエラーが発生した場合

```
「⚠️ 削除中に問題が発生しました：

[エラー内容]

対処方法を選択してください：
A) エラーを無視して続行（リスクあり）
B) 手動で修正してから再開
C) このステップをスキップ
D) 削除を中断して全体を見直す」
```

### 4.2 スクリプトが誤検出/検出漏れした場合

**誤検出（実際には存在しないのに検出）：**
```
エージェント: 「スクリプトが 'xxx' を検出しましたが、実際に存在しますか？
  該当ファイル: [パス]
  
  A) はい、存在する → 削除対象に含める
  B) いいえ、存在しない → スクリプトの誤検出、無視して続行
  C) 確認する → 手動でファイル確認」
```

**検出漏れ（実際に存在するのに検出されない）：**
```
エージェント: 「スクリプトは検出しませんでしたが、他に削除すべきものはありますか？
  
  確認すべき場所:
  - middleware.ts（認証設定）
  - tests/e2e/（E2Eテスト）
  - docs/（ドキュメント）
  
  A) 追加削除対象がある → 手動で追加
  B) なし → 削除対象確定として続行
  C) 念のため目視確認 → ファイル一覧表示」
```

### 4.3 スクリプトが失敗した場合のフォールバック

```
「⚠️ スクリプトの実行に失敗しました：
[エラーメッセージ]

手動での進行方法：
1. grep -r "[KEYWORD]" app/ lib/ components/ --include="*.ts" --include="*.tsx"
   → コード参照を手動検索
   
2. find . -name "*[KEYWORD]*" -type f
   → ファイルを手動検索
   
3. node .claude/skills/db-query/scripts/query.mjs find SystemPrompt "key~[KEYWORD]"
   → DBデータを手動確認

手動で検出した内容に基づいて削除を続行しますか？
A) 手動検出結果で続行
B) スクリプトの修正を試みる
C) 削除を中止」
```

### 4.4 verifyで失敗した場合

```
「❌ 削除確認で問題が検出されました：

- ❌ lib/chat/agents.ts: 参照残存
- ❌ DB: 2件残存

修正方法：
1. agents.ts の "na-script" を削除
2. DB削除スクリプトを実行

修正後、再度 verify を実行しますか？」
```

### 4.5 Next.js 型チェックエラーの対処

**現象:**
```
.next/types/validator.ts(71,39): error TS2307: 
Cannot find module '../../app/(authenticated)/agent/info/page.js'
```

**原因:**
Next.jsの型検証が`.next`キャッシュ内の古いページ情報を参照している

**解決:**
```bash
# .next キャッシュを削除
rm -rf .next

# 再度型チェック
npx tsc --noEmit
```

---

## 5. 人間の目視確認チェックリスト

**スクリプトの結果に関わらず、人間が必ず目視確認すること：**

### Phase 1: 調査後の確認
- [ ] **ファイルリストの妥当性**: スクリプトが検出したファイルが本当に削除対象か
- [ ] **重要ファイルの除外**: middleware.ts、auth設定等の重要ファイルが誤って含まれていないか
- [ ] **パターン検出の確認**: grep結果を数件サンプリングして確認

### Phase 2: リスク分析後の確認
- [ ] **型定義の影響範囲**: Union型から削除するとどこまで影響するか目視確認
- [ ] **共有設定の確認**: settings/db.ts等の変更が他に影響しないか確認
- [ ] **ユーザーデータの実在**: DBの件数と実際のレコードをサンプリング確認

### Phase 3: 削除実行前の最終確認
- [ ] **git status**: 未コミットの変更がないか目視確認
- [ ] **削除対象ファイルの最終確認**: `ls -la` で実在確認
- [ ] **バックアップ存在確認**: git logでコミット確認

### Phase 4: 削除後の検証
- [ ] **IDE/エディタの確認**: 型エラーが出ていないか目視確認
- [ ] **ブラウザでの動作確認**: 実際に画面が動作するか確認
- [ ] **コンソールエラーの確認**: サーバーログにエラーが出ていないか確認

**重要**: スクリプトはあくまで「候補を提示」するもの。最終的な判断と確認は**必ず人間が行う**。

---

## 6. 臨機応変対応の具体例

| 状況 | スクリプト出力 | エージェントの対応 |
|------|--------------|------------------|
| **小規模・低リスク** | `RISK_LEVEL: LOW` | 「迅速に削除します。一度に実行しますか？」 |
| **大規模・高リスク** | `RISK_LEVEL: CRITICAL` | 「段階的に進めます。Step 1から開始しますか？」 |
| **ユーザーデータあり** | `HAS_USER_DATA: YES` | 「過去のチャット履歴がN件あります。A)完全削除 B)アーカイブ C)統合 D)中止」 |
| **自動修正可能** | `CAN_AUTOFIX: YES` | 「自動修正が可能です。実行しますか？」 |
| **削除中に問題** | `verify.mjs` でエラー | 「問題が発生。A)自動修正 B)手動修正 C)スキップ D)ロールバック」 |
| **Next.jsキャッシュエラー** | 型チェック失敗 | 「.nextキャッシュを削除して再実行します」 |

---

## 7. スキルの継続的改善（オプション）

このスキルは**使用パターンに基づいて継続的に改善**される。

### 7.1 使用ログの記録（オプション）

```bash
# 使用ログを記録（分析用）
echo "$(date '+%Y-%m-%d %H:%M:%S') [KEYWORD] [MODE] [RESULT]" >> .claude/skills/feature-cleanup/usage.log

# 例:
# 2026-02-27 14:30:00 na-script step-by-step success
# 2026-02-27 15:00:00 langchain gradual failed
```

### 7.2 パターン学習による改善

**収集するデータ：**
- どの機能が最も削除されたか
- どのパターンで失敗が多いか
- どんな選択肢が選ばれたか

**改善サイクル：**
```
使用 → ログ記録 → パターン分析 → スキル改善 → 再使用
```

### 7.3 自動化レベルの進化

使用頻度と成功率に基づいて、自動化レベルを段階的に上げる：

| 段階 | 条件 | 自動化内容 |
|------|------|-----------|
| **Level 1** | 初回使用 | すべて確認を取る |
| **Level 2** | 同じ機能で3回成功 | 低リスクは自動実行 |
| **Level 3** | 同じ機能で10回成功 | 中リスクまで自動実行 |
| **Level 4** | プロジェクト全体で50回成功 | テンプレート自動生成 |

### 7.4 進化スクリプトの使用

```bash
# 使用後にログを記録
node .claude/skills/feature-cleanup/scripts/evolve.mjs log na-script step-by-step success

# パターンを分析
node .claude/skills/feature-cleanup/scripts/evolve.mjs analyze
# → 総使用回数: 3回
# → na-script: 2回（成功率100%）
# → langchain: 1回（失敗）

# 改善提案を取得
node .claude/skills/feature-cleanup/scripts/evolve.mjs suggest na-script
# → 推奨モード: simple
# → 自動実行: 低リスクは自動で実行
```

---

## 参照タイミングまとめ

| 状況 | 参照先 |
|------|--------|
| Phase 4でユーザーへの提示文が必要 | dialog-templates.md |
| 削除作業中にエラーが発生 | practical-guide.md の「4. エラー対応」 |
| スクリプトが失敗した | practical-guide.md の「4.3 フォールバック」 |
| Next.js型エラーが出た | practical-guide.md の「4.5 Next.js 型チェックエラー」 |
| 最終確認チェックリストが必要 | practical-guide.md の「5. 目視確認チェックリスト」 |
| スキルの改善・カスタマイズ | practical-guide.md の「7. スキルの継続的改善」 |
| 複数機能削除の実例が知りたい | practical-guide.md の「2. 実例：複数機能の一括削除」 |
