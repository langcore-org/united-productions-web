---
name: prisma
description: Prisma ORMによるデータベース開発。スキーマ設計、マイグレーション、クライアントAPI、クエリ最適化を統合サポート。
---

# Prisma Developer

> **Prisma ORM 開発統合スキル - スキーマ設計、クエリ、マイグレーション**

## Description

Prisma ORM を使ったデータベース開発の統合スキル。スキーマ設計、クライアントAPI、マイグレーション、クエリパターンを網羅。

## When to use

- Prisma スキーマの設計・修正
- データベースマイグレーションの作成・実行
- Prisma Client を使ったクエリ実装
- リレーション設計
- パフォーマンス最適化

## Best Practices

### Schema Design

- 命名規則の統一（PascalCase for models, camelCase for fields）
- 適切なインデックス設定
- リレーションの明示的定義
- `@map` と `@@map` の適切な使用
- フィールド制約（@unique, @default, @relation）

### Migrations

- マイグレーションは段階的に作成
- 本番適用前に必ず検証
- `prisma migrate dev` でローカル開発
- `prisma migrate deploy` で本番適用
- 破壊的変更は注意が必要

### Client Queries

- 必要なフィールドのみ選択（select）
- リレーションは適切に include
- トランザクションで整合性確保
- 型安全性を活用
- N+1問題を回避

### Performance

- クエリログで確認
- Connection pooling の設定
- Raw queries は必要時のみ
- キャッシュ戦略の検討

## Quick Commands

```bash
# スキーマからクライアント生成
npx prisma generate

# マイグレーション作成
npx prisma migrate dev --name [name]

# 本番マイグレーション適用
npx prisma migrate deploy

# データベース同期（開発用）
npx prisma db push

# スキーマからデータベースをリセット
npx prisma migrate reset

# Prisma Studio 起動
npx prisma studio
```

## References

- https://www.prisma.io/docs
- https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference
