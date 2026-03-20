# Google OAuth 設定ガイド

Supabase Authを使用したGoogle認証で以下のエラーが発生した場合の解決手順です：

```
Access blocked: agent1-brown.vercel.app has not completed the Google verification process
Error 403: access_denied
```

---

## 目次

1. [原因](#原因)
2. [解決方法の概要](#解決方法の概要)
3. [手順1: OAuth同意画面の設定](#手順1-oauth同意画面の設定)
4. [手順2: テストユーザーの追加（推奨・即座に解決）](#手順2-テストユーザーの追加推奨即座に解決)
5. [手順3: 承認済みリダイレクトURIの追加](#手順3-承認済みリダイレクトuriの追加)
6. [手順4: Supabase Authでの設定](#手順4-supabase-authでの設定)
7. [手順5: 本番公開（必要に応じて）](#手順5-本番公開必要に応じて)
8. [トラブルシューティング](#トラブルシューティング)

---

## 原因

Google OAuthは「テストモード」と「本番モード」の2つの状態があります：

| モード | 説明 | 制限 |
|--------|------|------|
| **テストモード** | 開発中のデフォルト状態 | テストユーザーとして登録されたユーザーのみログイン可能 |
| **本番モード** | Googleの審査を通過した状態 | 誰でもログイン可能 |

Vercelにデプロイ後、ドメインが変わるため、Google Cloud ConsoleとSupabase Authで設定が必要になります。

---

## 解決方法の概要

| 方法 | 所要時間 | 対象ユーザー | 用途 |
|------|----------|--------------|------|
| **テストユーザー追加** | 5分 | 特定のユーザー（最大100名） | 開発・テスト用 |
| **本番公開** | 1-3営業日 | 全ユーザー | 公開サービス用 |

---

## 手順1: OAuth同意画面の設定

### 1.1 Google Cloud Consoleにアクセス

1. [Google Cloud Console](https://console.cloud.google.com/) にログイン
2. プロジェクトを選択（または新規作成）
3. 左上のメニュー → **「APIとサービス」** → **「OAuth同意画面」** を選択

### 1.2 ユーザー情報の設定

| 項目 | 設定値 | 説明 |
|------|--------|------|
| **アプリ名** | `AI Hub` | ユーザーに表示されるアプリ名 |
| **ユーザーサポートメール** | あなたのメールアドレス | サポート問い合わせ先 |
| **アプリケーションロゴ** | （任意） | アプリのアイコン |
| **デベロッパー連絡先** | あなたのメールアドレス | Googleからの連絡先 |

### 1.3 スコープの設定

**「スコープを追加または削除」** をクリックし、以下を追加：

| スコープ | 用途 |
|----------|------|
| `openid` | OpenID Connect認証 |
| `email` | メールアドレス取得 |
| `profile` | プロフィール情報取得 |

### 1.4 テストユーザー（手順2で詳細設定）

この時点ではスキップ可能。次の手順で詳細に設定します。

---

## 手順2: テストユーザーの追加（推奨・即座に解決）

これが**最も早く解決できる方法**です。デプロイ直後や開発中はこの方法を推奨します。

> **注意**: テストユーザーの追加に公式のCLI/APIはありません。Google Cloud Console の Web UI から手動で行う必要があります。

### 2.1 テストユーザーセクションへ移動

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials/consent) のOAuth同意画面
2. **「テストユーザー」** セクションを展開

### 2.2 ユーザーを追加

1. **「ユーザーを追加」** をクリック
2. 使用するメールアドレスを入力：
   - 例: `kb2hhs@gmail.com`
   - 最大100名まで追加可能
3. **「保存」** をクリック

### 2.3 反映を待つ

- 設定の反映には**数分〜10分**かかる場合があります
- ブラウザのキャッシュをクリアしてから再試行してください

---

## 手順3: 承認済みリダイレクトURIの追加

Supabase AuthのコールバックURLをGoogle OAuthに登録する必要があります。

### 3.1 認証情報ページへ移動

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) の **「認証情報」** ページ
2. **「OAuth 2.0 クライアント ID」** をクリック（Webクライアント）

### 3.2 リダイレクトURIを追加

**「承認済みリダイレクトURI」** セクションで以下を追加：

| 環境 | URI |
|------|-----|
| 開発（ローカル） | `http://localhost:3000/api/auth/callback/google` |
| 本番（Vercel） | `https://your-project.supabase.co/auth/v1/callback` |

> **重要**: Supabase Authでは、コールバックURLが `https://your-project.supabase.co/auth/v1/callback` 形式になります。
> 
> ドメインが異なる場合（カスタムドメインなど）、適切なURIに置き換えてください。

### 3.3 保存

**「保存」** をクリックして変更を適用。

---

## 手順4: Supabase Authでの設定

### 4.1 Supabaseダッシュボードで設定

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択
3. **Authentication** → **Providers** → **Google** を選択

### 4.2 Google認証情報を入力

| 項目 | 値 |
|------|-----|
| **Client ID** | Google Cloud Console で取得したクライアントID |
| **Client Secret** | Google Cloud Console で取得したクライアントシークレット |
| **Authorized Redirect URI** | `https://your-project.supabase.co/auth/v1/callback` |

### 4.3 保存

**「Save」** をクリックして設定を保存。

---

## 手順5: 本番公開（必要に応じて）

一般公開する場合は、Googleの審査を受ける必要があります。

### 5.1 公開ステータスの変更

1. [OAuth同意画面](https://console.cloud.google.com/apis/credentials/consent) を開く
2. **「公開ステータス」** セクションで **「本番環境」** を選択
3. **「確認」** をクリック

### 5.2 必要な情報を確認

本番公開には以下が必要です：

- ✅ アプリ名
- ✅ ユーザーサポートメール
- ✅ デベロッパー連絡先
- ✅ 必要なスコープ（openid, email, profile）
- ✅ プライバシーポリシーURL（推奨）
- ✅ サービス利用規約URL（推奨）

### 5.3 審査プロセス

| ステップ | 所要時間 | 内容 |
|----------|----------|------|
| 申請提出 | 即時 | 上記情報を入力して送信 |
| Google審査 | 1-3営業日 | 自動・手動チェック |
| 承認通知 | メール | 承認または追加情報の要求 |

---

## トラブルシューティング

### エラー: `access_denied`

**原因**: ユーザーがテストユーザーとして登録されていない、または本番公開されていない

**解決策**:
1. テストユーザーに該当メールアドレスが追加されているか確認
2. 公開ステータスが「テスト」または「本番」か確認

### エラー: `redirect_uri_mismatch`

**原因**: リダイレクトURIがGoogle Cloud Consoleに登録されていない

**解決策**:
1. 認証情報 → 承認済みリダイレクトURIを確認
2. SupabaseのコールバックURL（`https://your-project.supabase.co/auth/v1/callback`）が正確に登録されているか確認

### エラー: `invalid_client`

**原因**: クライアントIDまたはシークレットが間違っている

**解決策**:
1. Google Cloud Consoleの認証情報を確認
2. Supabase Authの環境変数 `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` を確認

### ログイン後にアプリに戻らない

**原因**: SupabaseのサイトURLが正しく設定されていない

**解決策**:
1. Supabase Dashboard → Authentication → URL Configuration を確認
2. **Site URL** は `https://your-app.vercel.app` である必要があります
3. **Redirect URLs** にアプリのURLが追加されているか確認

---

## クイックチェックリスト

デプロイ後に確認すること：

- [ ] Google Cloud Console → OAuth同意画面 → テストユーザーに自分のメールを追加
- [ ] Google Cloud Console → 認証情報 → 承認済みリダイレクトURIにSupabaseコールバックURLを追加
- [ ] Supabase Dashboard → Authentication → Providers → Google で認証情報を設定
- [ ] Supabase Dashboard → Authentication → URL Configuration でサイトURLを設定
- [ ] ブラウザキャッシュをクリアして再試行

---

## 参考リンク

- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 スコープ](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Supabase Auth Google Provider](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

---

## 関連ドキュメント

- [Guides README](../README.md) - ガイド一覧
- [database-cache.md](./database-cache.md) - データベース設定
- [vercel-authentication.md](./vercel-authentication.md) - Vercel認証設定
- [AGENTS.md](../../../AGENTS.md) - エージェント行動指針

---

**最終更新**: 2026-03-20 14:35
