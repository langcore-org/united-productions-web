# Vercel プレビュー環境での認証設定

このドキュメントでは、Vercelの開発環境（プレビュー環境）でGoogle認証を機能させる方法を説明します。

## 概要

Vercelでは以下の3種類の環境があります：

1. **本番環境 (Production)** - メインドメイン（例: `ai-hub.vercel.app`）
2. **プレビュー環境 (Preview)** - ブランチごとの一時的なURL（例: `ai-hub-git-feature-xxx.vercel.app`）
3. **ローカル開発** - `localhost:3000`

## 設定手順

### 1. Google Cloud Console での設定

Google OAuth 認証をVercelのプレビュー環境で動作させるには、承認済みリダイレクトURIを追加する必要があります。

#### 手順:

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) にアクセス
2. プロジェクトを選択 → 「APIとサービス」→「認証情報」
3. OAuth 2.0 クライアントIDをクリック
4. 「承認済みリダイレクトURI」に以下を追加：

```
# 本番環境
https://your-domain.vercel.app/api/auth/callback/google

# プレビュー環境（ワイルドカードは使用できないため、個別に追加が必要）
https://*.vercel.app/api/auth/callback/google
```

> ⚠️ **重要**: Google OAuthはワイルドカードをサポートしていません。プレビュー環境のURLは個別に追加するか、以下の回避策を使用してください。

### 2. Vercel ダッシュボードでの環境変数設定

Vercelダッシュボード → プロジェクト → Settings → Environment Variables

#### 本番環境 (Production)

| 変数名 | 値 |
|--------|-----|
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` |
| `NEXTAUTH_SECRET` | （opensslで生成した秘密鍵） |
| `GOOGLE_CLIENT_ID` | （Google Cloudから取得） |
| `GOOGLE_CLIENT_SECRET` | （Google Cloudから取得） |

#### プレビュー環境 (Preview)

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `NEXTAUTH_SECRET` | （同じ秘密鍵） | 本番と同じ値 |
| `GOOGLE_CLIENT_ID` | （同じクライアントID） | 本番と同じ値 |
| `GOOGLE_CLIENT_SECRET` | （同じクライアントシークレット） | 本番と同じ値 |
| `AUTH_TRUST_HOST` | `true` | プレビューURLを信頼する |

> **注意**: `NEXTAUTH_URL` はプレビュー環境では自動的に設定されるため、明示的に設定する必要はありません。

### 3. プレビュー環境のURL問題への対処

Google OAuthはワイルドカードリダイレクトURIをサポートしていないため、プレビュー環境ごとにURLを登録する必要があります。

#### 回避策 1: 固定プレビューURLの使用

Vercelの「Preview Deployment Suffix」機能を使用して、固定のサブドメインを使用します。

#### 回避策 2: 認証 Bypass（開発時のみ）

開発用に認証をバイパスするオプションを追加（本番環境では使用しないでください）：

```typescript
// middleware.ts でプレビュー環境の場合は認証をスキップ
if (process.env.VERCEL_ENV === 'preview') {
  // 開発用の簡易認証
}
```

#### 回避策 3: Vercel Integration（推奨）

Vercelの「Deploy Summary」機能を使用して、プレビューURLを自動的にGoogle Cloud Consoleに登録するスクリプトを作成します。

## 環境変数の設定例

### ローカル開発 (.env.local)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

### Vercel 本番環境

```env
NEXTAUTH_URL=https://ai-hub.vercel.app
NEXTAUTH_SECRET=your_secret_here
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

### Vercel プレビュー環境

```env
# NEXTAUTH_URL は自動設定される
AUTH_TRUST_HOST=true
NEXTAUTH_SECRET=your_secret_here
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

## トラブルシューティング

### エラー: "redirect_uri_mismatch"

**原因**: Google Cloud Consoleに登録されたリダイレクトURIと実際のURLが一致していない

**解決策**: 
1. VercelのプレビューURLを確認（デプロイログから取得）
2. Google Cloud Consoleに正確なURLを追加：
   `https://[preview-url]/api/auth/callback/google`

### エラー: "Unable to verify authorization request state"

**原因**: セッションの状態が一致しない（複数ホスト間でCookieが共有されない）

**解決策**:
- `AUTH_TRUST_HOST=true` を設定
- `trustHost: true` を `auth-options.ts` に設定（既に設定済み）

### エラー: "Invalid client"

**原因**: 環境変数が正しく設定されていない

**解決策**:
- Vercelダッシュボードで環境変数が正しく設定されているか確認
- プレビュー環境用の環境変数が設定されているか確認

## セキュリティに関する注意事項

1. **プレビュー環境の認証制限**
   - 本番データにアクセスできるため、プレビュー環境へのアクセスを制限することを検討
   - Vercelの「Deployment Protection」を有効化

2. **環境変数の管理**
   - `NEXTAUTH_SECRET` は本番と同じ値を使用可能（トークンの互換性のため）
   - Google OAuthの認証情報は複数環境で共有可能

3. **ドメイン制限**
   - `callbacks.signIn` で特定ドメインのみ許可することを検討：

```typescript
async signIn({ user }) {
  // United Productionsのドメインのみ許可
  if (user.email && !user.email.endsWith("@united-productions.jp")) {
    return false;
  }
  return true;
}
```

## 参考リンク

- [NextAuth.js Vercel Deployment](https://authjs.dev/getting-started/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Google OAuth 2.0 Redirect URI](https://developers.google.com/identity/protocols/oauth2/web-server#uri-validation)
