---
name: vercel-deploy
description: Vercelへのデプロイと監視。ビルドエラー対応、環境変数設定、デプロイ状態の確認をサポート。ユーザーが「デプロイ」「Vercel」「本番環境」「環境変数」「ビルドエラー」などを言及した時や、デプロイエラー、環境変数の問題、ビルド失敗時に使用。
---

# Vercel Deploy

Vercelへのデプロイと監視、ビルドエラー対応、環境変数管理を行うためのスキル。

## When to use

- 「デプロイしたい」「Vercelに上げたい」などの発言時
- 「環境変数」を設定・確認したい時
- GitHub Actionsでビルド/デプロイエラーが発生した時
- 本番環境の動作確認が必要な時
- 「Preview環境で確認したい」などの発言時
- 「ビルドエラー」「デプロイ失敗」などの発言時

## Quick Start

```bash
# Gitプッシュ後のデプロイ監視
npm run deploy:monitor

# デプロイ状態確認
npm run deploy:status

# ローカルビルド確認（重要）
npm run build
```

---

## 対話例：よくあるシナリオ

### シナリオ1: 初めてのデプロイ

```
ユーザー: 「本番にデプロイしたいんだけど"

AI: 「デプロイの準備を確認します。

【デプロイ前チェックリスト】
1. [ ] ローカルでビルドが通る
2. [ ] 環境変数がVercelに設定されている
3. [ ] mainブランチにマージされている

まずチェックを行いますか？」

→ 「はい"

AI: 「チェックを開始します。

Step 1: ローカルビルド確認
```bash
npm run build
```

✅ ビルド成功

Step 2: 環境変数確認
Vercelダッシュボードで以下が設定されているか確認：
- DATABASE_URL
- NEXTAUTH_SECRET
- XAI_API_KEY

確認できましたか？」

→ 「設定した"

AI: 「ではデプロイを実行します。

```bash
git push origin main
npm run deploy:monitor
```

デプロイを監視します...」
```

### シナリオ2: ビルドエラーの対応

```
ユーザー: 「デプロイが失敗する"

AI: 「エラーの詳細を確認します。

```bash
npm run deploy:monitor
```

[エラーログを確認]

AI: 「エラーが特定できました。

【エラー内容】
Prisma Client not found

【原因】
postinstallスクリプトが実行されていない

【解決策】
1. package.jsonにpostinstallがあるか確認
2. 手動でPrisma生成

実行しますか？」

→ 「はい"

AI: 「修正を行います。

```bash
# Prisma生成
npx prisma generate

# ビルドテスト
npm run build
```

問題なければコミットして再デプロイします。」
```

### シナリオ3: 環境変数の問題

```
ユーザー: 「本番でAPIが動かない"

AI: 「環境変数の問題を調査します。

確認項目：
1. Vercelに環境変数が設定されているか
2. 環境変数の値が正しいか
3. 変数名にタイポがないか

まずVercelダッシュボードで環境変数を確認してください。
Settings → Environment Variables

または、以下で確認できます：
```bash
vercel env ls
```

結果を教えてください。」

→ 「XAI_API_KEYが設定されてないみたい"

AI: 「環境変数を追加します。

```bash
vercel env add XAI_API_KEY production
```

値を入力してください：
[ユーザーが入力]

追加しました。デプロイを再実行しますか？」
```

---

## Available Commands

### デプロイ監視

```bash
# Gitプッシュ後のデプロイ状態を監視（自動的にReady/Errorを検出）
npm run deploy:monitor

# デプロイ状態の一覧表示
npm run deploy:status
```

### Vercel CLI

```bash
# 最新のデプロイメントを確認
vercel list

# 特定のデプロイメントの詳細を確認
vercel inspect [deployment-url]

# デプロイメントログを確認
vercel logs [deployment-url]

# 本番環境へのデプロイ
vercel --prod
```

---

## Configuration

### 環境変数の設定

```bash
# 開発環境
vercel env add VARIABLE_NAME development

# プレビュー環境
vercel env add VARIABLE_NAME preview

# 本番環境
vercel env add VARIABLE_NAME production
```

### プロジェクト固有の設定

**現在のプロジェクト設定**（`vercel.json`）:
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["hnd1"]
}
```

---

## チェックリスト

### 初回デプロイ前チェックリスト

```markdown
## 初回デプロイ前

- [ ] Vercelアカウント作成済み
- [ ] プロジェクトがVercelにリンク済み
- [ ] 全ての必要な環境変数が設定済み
- [ ] DATABASE_URLが正しい
- [ ] NEXTAUTH_SECRETが設定済み
- [ ] ローカルでビルドが通る
- [ ] Prisma generateが設定済み
```

### 毎回のデプロイ前チェックリスト

```markdown
## デプロイ前

- [ ] `npm run build` がローカルで成功する
- [ ] `npx tsc --noEmit` で型エラーがない
- [ ] `npm run lint` でLintエラーがない
- [ ] 新しい環境変数が必要な場合は設定済み
- [ ] 破壊的変更がある場合は移行手順を確認済み
```

### デプロイ失敗時チェックリスト

```markdown
## デプロイ失敗時

1. [ ] エラーログを確認（`npm run deploy:monitor`）
2. [ ] エラーの種類を特定
   - Build Error → ビルド手順を確認
   - Runtime Error → 環境変数を確認
3. [ ] ローカルで再現確認
4. [ ] 修正を適用
5. [ ] 再デプロイ
```

---

## Deployment Workflow

### 標準的なデプロイフロー

```
1. コード修正 → 2. ローカルビルド確認 → 3. git push → 4. デプロイ監視 → 5. 確認
```

```bash
# Step 1: ローカルでビルド確認
npm run build

# Step 2: 問題なければgit push
git push origin main

# Step 3: デプロイを監視
npm run deploy:monitor
```

### デプロイエラー対応フロー

```bash
# 1. エラーログの確認
npm run deploy:monitor
# → 失敗時に自動的にエラーログが表示される

# 2. エラーの種類を特定
# - Build Error: ビルド時のエラー → ローカルで再現して修正
# - Runtime Error: 実行時エラー → ログを確認して修正

# 3. 修正後、再デプロイ
git push origin main
npm run deploy:monitor
```

---

## Build Error Troubleshooting

| エラー | 原因 | 解決方法 |
|-------|------|---------|
| `Module not found` | importパスエラー | パスを確認、相対パスを修正 |
| `Type error` | TypeScriptエラー | `npx tsc --noEmit` で確認して修正 |
| `Prisma Client not found` | Prisma生成漏れ | `npx prisma generate` を実行 |
| `Environment variable missing` | 環境変数未設定 | Vercelダッシュボードで設定 |
| `Build timeout` | ビルド時間超過 | ビルドキャッシュを確認 |

### よくあるエラーと対処

**Prisma Clientエラー:**
```
Error: @prisma/client did not initialize yet
```
→ `postinstall`スクリプトが実行されているか確認（`package.json`）

**環境変数エラー:**
```
Error: Required environment variable not found
```
→ Vercelダッシュボード → Settings → Environment Variables で設定

---

## Environment Variables

### 必要な環境変数一覧

| 変数名 | 用途 | 環境 |
|-------|------|------|
| `DATABASE_URL` | データベース接続 | production |
| `NEXTAUTH_SECRET` | 認証セッション暗号化 | production |
| `NEXTAUTH_URL` | 認証コールバックURL | production |
| `XAI_API_KEY` | xAI API認証 | production |
| `GOOGLE_CLIENT_ID` | Google OAuth | production |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | production |

### 環境変数の確認方法

```bash
# Vercel上の環境変数を一覧表示
vercel env ls

# 特定の環境変数の値を確認（ローカルのみ）
echo $VARIABLE_NAME
```

---

## Security Best Practices

- ✅ 機密情報は必ず環境変数で管理
- ✅ `.env.local` は `.gitignore` に含める
- ✅ Production環境の環境変数は慎重に変更
- ✅ 環境変数の変更後は再デプロイが必要

## References

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
