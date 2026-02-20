# Vercel プレビュー環境での認証設定

このドキュメントでは、Vercelの開発環境（プレビュー環境）での認証設定と、E2Eテスト用のPreview専用認証について説明します。

## 概要

Vercelでは以下の3種類の環境があります：

1. **本番環境 (Production)** - メインドメイン（例: `ai-hub.vercel.app`）
2. **プレビュー環境 (Preview)** - ブランチごとの一時的なURL（例: `ai-hub-git-feature-xxx.vercel.app`）
3. **ローカル開発** - `localhost:3000`

## 認証方式の違い

| 環境 | 認証方式 | 説明 |
|------|----------|------|
| **Production** | Google OAuth | 通常のGoogle認証 |
| **Preview** | Google OAuth + Credentials | E2Eテスト用のメール/パスワード認証を追加 |
| **Development** | Google OAuth | ローカル開発用 |

---

## 1. Preview環境専用E2E認証（推奨）

Google OAuthのredirect URI問題を回避するため、Preview環境ではメール/パスワード認証を使用できます。

### 特徴

- **DB変更なし**: JWT戦略で認証（PrismaAdapter不要）
- **本番影響なし**: Productionでは完全に無効
- **Playwright対応**: 自動E2Eテストが安定

### 使用方法

#### 手動ログイン

1. Preview環境のURLにアクセス
2. `/preview-login` へ移動
3. 環境変数で設定されたメール/パスワードでログイン

#### E2Eテスト

```bash
# 環境変数を設定してテスト実行
VERCEL_ENV=preview \
PREVIEW_E2E_USER=test@example.com \
PREVIEW_E2E_PASS=yourpassword \
npm run test:e2e
```

### 環境変数設定（Vercel Preview環境のみ）

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `PREVIEW_E2E_USER` | `e2e-test@example.com` | E2Eテスト用ユーザー名 |
| `PREVIEW_E2E_PASS` | （強固なパスワード） | E2Eテスト用パスワード |
| `PLAYWRIGHT_BASE_URL` | （自動設定） | テスト対象URL |

> ⚠️ **重要**: これらの変数は **Preview環境のみ** に設定してください。Productionには設定しないでください。

---

## 2. Google OAuth 設定（オプション）

Preview環境でGoogle OAuthも使用可能です（redirect URIの問題があります）。

### Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) にアクセス
2. プロジェクトを選択 → 「APIとサービス」→「認証情報」
3. OAuth 2.0 クライアントIDをクリック
4. 「承認済みリダイレクトURI」に各Preview URLを個別に追加

> ⚠️ **注意**: Google OAuthはワイルドカードをサポートしていません。

### 環境変数設定

| 環境 | 変数名 | 値 |
|------|--------|-----|
| **Production** | `NEXTAUTH_URL` | `https://your-domain.vercel.app` |
| **Preview** | `AUTH_TRUST_HOST` | `true` |

---

## 3. ローカル開発でのテスト

### Previewモードをローカルでテスト

```bash
# .env.local に追加
VERCEL_ENV=preview
PREVIEW_E2E_USER=test@example.com
PREVIEW_E2E_PASS=testpassword
NEXT_PUBLIC_VERCEL_ENV=preview

# 開発サーバー起動
npm run dev

# http://localhost:3000/preview-login にアクセス
```

### Playwrightテスト

```bash
# ブラウザインストール（初回のみ）
npx playwright install

# 全テスト実行
npm run test:e2e

# UIモードで実行
npm run test:e2e:ui

# デバッグモード
npm run test:e2e:debug
```

---

## 4. CI/CD 設定（GitHub Actions例）

```yaml
name: E2E Tests
on:
  deployment_status:
jobs:
  test:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ github.event.deployment_status.target_url }}
          PREVIEW_E2E_USER: ${{ secrets.PREVIEW_E2E_USER }}
          PREVIEW_E2E_PASS: ${{ secrets.PREVIEW_E2E_PASS }}
```

---

## トラブルシューティング

### `/preview-login` にアクセスできない

**原因**: Production環境または`VERCEL_ENV`が設定されていない

**解決策**:
```bash
# .env.local に追加
VERCEL_ENV=preview
NEXT_PUBLIC_VERCEL_ENV=preview
```

### E2Eテストが失敗する

**原因1**: ブラウザがインストールされていない
```bash
npx playwright install
```

**原因2**: 環境変数が設定されていない
```bash
export VERCEL_ENV=preview
export PREVIEW_E2E_USER=test@example.com
export PREVIEW_E2E_PASS=yourpassword
```

### "Invalid credentials" エラー

**原因**: 環境変数の値が一致していない

**確認**:
- Vercelダッシュボードで`PREVIEW_E2E_USER`と`PREVIEW_E2E_PASS`が正しく設定されているか
- 大文字小文字、スペースなどを確認

---

## セキュリティに関する注意事項

1. **ProductionにはPreview認証を設定しない**
   - `PREVIEW_E2E_USER` / `PREVIEW_E2E_PASS` はPreview環境のみに設定

2. **強固なパスワードを使用**
   - ランダムな文字列（32文字以上）を推奨
   - `openssl rand -base64 32` で生成可能

3. **プレビュー環境のアクセス制限**
   - Vercelの「Deployment Protection」を有効化
   - チームメンバーのみアクセス可能に

4. **定期轮换**
   - パスワードは定期的に変更することを推奨

---

## 参考リンク

- [NextAuth.js Credentials Provider](https://next-auth.js.org/providers/credentials)
- [Playwright Authentication](https://playwright.dev/docs/auth)
- [Vercel Preview Deployments](https://vercel.com/docs/concepts/deployments/preview-deployments)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
