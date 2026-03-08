# Neon（PostgreSQL）・Upstash Redis 設定手順

`.env.local` の `DATABASE_URL` と Upstash の環境変数を設定するための手順です。

---

## 1. Neon（PostgreSQL）の設定

### 1.1 アカウントとプロジェクト作成

1. [Neon](https://neon.tech/) にアクセスし、**Sign up**（GitHub などでログイン可）
2. **Create a project** でプロジェクト名とリージョンを選択して作成

### 1.2 接続文字列（DATABASE_URL）の取得

1. プロジェクトの **Dashboard** で **Connect** ボタンをクリック
2. **Connection details** モーダルで以下を確認：
   - **Branch**: 通常は `main`
   - **Database**: デフォルトのデータベース名
   - **Role**: デフォルトのロール
3. **Connection string** の形式を選ぶ：
   - **Pooled connection**（推奨）: `-pooler` が含まれるホスト名
   - Prisma 利用時はそのまま使える形式が表示される
4. 表示された文字列をコピー（例）:
   ```text
   postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```

### 1.3 .env.local に反映

```env
DATABASE_URL=postgresql://（コピーした文字列をそのまま貼り付け）
```

- **注意**: パスワードに特殊文字が含まれる場合は URL エンコードが必要な場合があります。Neon ダッシュボードの「Password」で再生成してシンプルなものを使うこともできます。

---

## 2. Upstash Redis の設定

### 2.1 アカウントとデータベース作成

1. [Upstash Console](https://console.upstash.com/) にアクセスし、**Sign up**（GitHub など可）
2. **Create Database** をクリック
3. 以下を設定：
   - **Name**: 任意（例: `ai-hub-cache`）
   - **Region**: アプリに近いリージョン（例: `ap-northeast-1`）
   - **Type**: **Regional** で無料枠（10,000 コマンド/日）
4. **Create** で作成

### 2.2 REST URL とトークンの取得

1. 作成したデータベースをクリックして詳細を開く
2. **REST API** セクションで以下をコピー：
   - **UPSTASH_REDIS_REST_URL**: `https://xxxx.upstash.io` 形式
   - **UPSTASH_REDIS_REST_TOKEN**: 長いトークン文字列

### 2.3 .env.local に反映

```env
UPSTASH_REDIS_REST_URL=https://（表示されたURLをそのまま）
UPSTASH_REDIS_REST_TOKEN=（表示されたトークンをそのまま）
```

---

## 3. 設定後の確認

1. `.env.local` を保存
2. 開発サーバーを再起動: `npm run dev`
3. データベースを使う機能（ログイン・セッションなど）が動作するか確認
4. Prisma を使っている場合はマイグレーションを実行: `npx prisma migrate deploy` または `npx prisma db push`

---

## リンク

| サービス | コンソール / ドキュメント |
|----------|---------------------------|
| Neon     | [Console](https://console.neon.tech/) / [Connect from any app](https://neon.tech/docs/connect/connect-from-any-app) |
| Upstash  | [Console](https://console.upstash.com/redis) / [REST API](https://upstash.com/docs/redis/features/restapi) |
