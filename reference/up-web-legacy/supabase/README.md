# Supabase Local Development

## ポート設定

| サービス | ポート |
|----------|--------|
| API (Kong) | 55321 |
| PostgreSQL | 55322 |
| Studio | 55323 |
| Inbucket | 54324 |

## 環境設定ファイル

```
supabase/
├── .env              # ローカル開発用 (localhost:3110)
└── .env.production   # 本番用 (up.actraise.org)
```

## 使い方

### ローカル開発

```bash
# .env がデフォルトで使用される
supabase start
```

### 本番環境テスト

```bash
# .env.production を .env にコピーしてから起動
cp supabase/.env.production supabase/.env
supabase start
```

### 環境を戻す

```bash
# ローカル開発に戻す場合
git checkout supabase/.env
```

## 関連URL

- WebApp (dev): http://localhost:3110
- WebApp (prod): https://up.actraise.org
- Supabase Studio: http://localhost:55323
- Inbucket (メールテスト): http://localhost:54324
