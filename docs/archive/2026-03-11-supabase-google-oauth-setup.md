# Supabase で Google Provider を有効化する手順

> **最終更新**: 2026-03-11  
> **ステータス**: ✅ 完了  
> **前提**: Supabase プロジェクトは作成済み（本番: `united-productions` 等）

---

## 概要

1. **Google Cloud Console** で OAuth 2.0 のクライアント ID/Secret を作成する  
2. **Supabase Dashboard** で Google Provider を有効化し、上記を設定する  

---

## ステップ 1: Google Cloud Console で認証情報を作成

### 1.1 プロジェクトと OAuth 同意画面

1. [Google Cloud Console](https://console.cloud.google.com/) にログイン
2. 対象プロジェクトを選択（または新規作成）
3. **API とサービス** → **OAuth 同意画面**
   - ユーザータイプ: **外部**（一般ユーザー向け）または **内部**（組織内のみ）
   - アプリ名・ユーザーサポートメール・デベロッパー連絡先を入力して保存
   - **スコープ**: 必要なら「メール、プロフィール、openid」を追加（Supabase は標準でこれらを使用）

### 1.2 OAuth 2.0 クライアント ID の作成

1. **API とサービス** → **認証情報** → **認証情報を作成** → **OAuth クライアント ID**
2. アプリケーションの種類: **ウェブ アプリケーション**
3. **名前**: 例）`Teddy Supabase` など任意
4. **承認済みの JavaScript 生成元**（本番・開発で使うオリジン）:
   - 本番: `https://<あなたのドメイン>`
   - Vercel プレビュー: `https://<プロジェクト>-xxx.vercel.app`
   - ローカル: `http://localhost:3000`
5. **承認済みのリダイレクト URI** に以下を **1件ずつ** 追加:
   - 本番: `https://<プロジェクト参照ID>.supabase.co/auth/v1/callback`
   - ローカル検証用（任意）: `http://127.0.0.1:54321/auth/v1/callback`（Supabase ローカル利用時）
   - **重要**: Supabase のコールバックは **Supabase の URL** であり、アプリの `/auth/callback` ではない（Supabase が認証後にアプリにリダイレクトする）
6. **作成** をクリック
7. 表示された **クライアント ID** と **クライアント シークレット** をコピー（シークレットは再表示できないので安全な場所に保存）

**Supabase 本番のリダイレクト URI の例**:

- プロジェクト参照 ID が `tbzqswctewjgmhtswssq` の場合:  
  `https://tbzqswctewjgmhtswssq.supabase.co/auth/v1/callback`

---

## ステップ 2: Supabase Dashboard で Google Provider を設定

### 2.1 認証設定を開く

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. 対象プロジェクト（例: **united-productions**）を選択
3. 左メニュー **Authentication** → **Providers**

### 2.2 Google を有効化

1. **Providers** 一覧で **Google** の行をクリック（または「Google」を探して開く）
2. **先に Client ID と Client Secret を入力してから Save**
   - **Client ID (for OAuth)**  
     → Google Cloud Console でコピーした「クライアント ID」
   - **Client Secret (for OAuth)**  
     → Google Cloud Console でコピーした「クライアント シークレット」
3. **Save** をクリック
4. 保存に成功すると、Google が有効になり **Enable Sign in with Google** が ON になることが多いです。  
   **トグルが最初から ON にできない場合** は、トグルに触れずに上記の通り「ID・Secret を入力 → Save」だけ行ってください。

### 2.3 サイト URL の確認（リダイレクト先）

1. **Authentication** → **URL Configuration**
2. **Site URL** を確認・設定:
   - 本番: `https://<あなたのドメイン>`
   - ローカル検証: `http://localhost:3000`
3. **Redirect URLs** に、アプリ側のコールバック URL が許可されているか確認:
   - 例: `https://<あなたのドメイン>/auth/callback`  
   - 必要なら **Add URL** で追加

これで、Supabase が Google 認証後に **Site URL** や **Redirect URLs** に登録した URL（例: `https://.../auth/callback`）へリダイレクトします。

---

## ステップ 3: アプリ側の確認

- 環境変数が設定されていること:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- サインイン画面から「Google でログイン」等のリンクが、Supabase の `signInWithOAuth({ provider: 'google' })` を呼ぶ実装になっていること
- コールバック Route Handler が `app/auth/callback/route.ts` にあり、`exchangeCodeForSession` 後にリダイレクトする実装になっていること

---

## チェックリスト

| 項目 | 確認 |
|------|------|
| Google Cloud で OAuth クライアント（ウェブ）を作成した | ☑ |
| 承認済みリダイレクト URI に `https://<project-ref>.supabase.co/auth/v1/callback` を追加した | ☑ |
| Supabase Dashboard → Authentication → Providers で Google を有効にした | ☑ |
| Client ID と Client Secret を Supabase に保存した | ☑ |
| URL Configuration の Site URL / Redirect URLs を確認した | ☑ |

---

## トラブルシューティング

- **「Enable Sign in with Google」のトグルが ON にならない**
  1. **トグルは触らずに**、先に **Client ID** と **Client Secret** の両方を入力する
  2. 画面下部の **Save** をクリックする  
     → 保存が成功すると、Google が有効になりトグルが ON になることが多いです
  3. それでも ON にならない場合:
     - 別ブラウザ（Chrome / Firefox / Safari）やシークレットウィンドウで試す
     - ページを再読み込みしてから、もう一度 ID/Secret を入力して Save
     - [Supabase Dashboard](https://supabase.com/dashboard) の **Authentication** → **Providers** で、Google の行に「Enabled」等の表示が出ているか確認する（トグルが無くても保存されていれば有効のことがあります）
- **「redirect_uri_mismatch」**
  - Google の「承認済みのリダイレクト URI」に、Supabase のコールバック URL（`https://<project-ref>.supabase.co/auth/v1/callback`）が **完全一致** で入っているか確認する
- **ログイン後にアプリに戻らない**
  - Supabase の **Redirect URLs** に、アプリの `https://<ドメイン>/auth/callback` が含まれているか確認する
- **ローカルで試す場合**
  - Site URL を `http://localhost:3000` にし、Redirect URLs に `http://localhost:3000/auth/callback` を追加する

---

## 参考

- [Supabase Auth - Google Login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud - OAuth 2.0 設定](https://console.cloud.google.com/apis/credentials)
