---
name: prisma
description: Prisma ORMによるデータベース開発。スキーマ設計、マイグレーション、クライアントAPI、クエリ最適化を統合サポート。ユーザーが「DB」「データベース」「Prisma」「スキーマ」「マイグレーション」「テーブル」などに関する質問や実装要望をした時に使用。
---

# Prisma Developer

Prisma ORM を使ったデータベース開発スキル。スキーマ設計、マイグレーション、クライアントAPI、クエリ最適化を網羅。

## When to use

- 「DB」「データベース」に関する質問や実装時
- 「Prisma」「スキーマ」「マイグレーション」などの発言時
- 「テーブル」「カラム」「リレーション」などの設計時
- マイグレーションエラー、型エラー発生時
- クエリのパフォーマンス問題発生時
- データベース接続、トランザクション問題時

## Quick Start

```bash
# スキーマからクライアント生成
npx prisma generate

# マイグレーション作成（開発用）
npx prisma migrate dev --name add_user_role

# Prisma Studio起動（GUI管理ツール）
npx prisma studio
```

---

## 対話例：よくあるシナリオ

### シナリオ1: 新しいテーブルの作成

```
ユーザー: 「ChatMessageテーブルを作りたい"

AI: 「テーブル設計を行います。

【確認事項】
1. どんな情報を保存しますか？
   - メッセージ内容
   - 送信者（ユーザー/AI）
   - タイムスタンプ
   - チャットとの紐付け

2. リレーションは？
   - Chatテーブルとの1対多
   - Userテーブルとの紐付けも必要？

設計案を提示します：

```prisma
model ChatMessage {
  id        String   @id @default(cuid())
  chatId    String   @map("chat_id")
  role      String   // "user" | "assistant"
  content   String
  createdAt DateTime @default(now()) @map("created_at")

  chat Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)

  @@index([chatId])
  @@map("chat_messages")
}
```

この設計でよろしいですか？」

→ 「はい"

AI: 「マイグレーションを作成します。

```bash
npx prisma migrate dev --name add_chat_message
```

実行しますか？」
```

### シナリオ2: マイグレーションエラーの解決

```
ユーザー: 「migrate dev が失敗する"

AI: 「エラーの詳細を確認します。

```bash
npx prisma migrate dev
```

[エラーログを確認]

AI: 「エラーが特定できました。

【エラー】
P3005: Database schema drift

【原因】
データベーススキーマとマイグレーションファイルが一致していない

【解決策】
A. データベースをリセット（開発環境のみ）
B. マイグレーションを手動で修正

どちらを選択しますか？
（開発環境ならAを推奨）"

→ 「Aで"

AI: "```bash
npx prisma migrate reset
```

データベースがリセットされ、マイグレーションが再適用されます。"
```

### シナリオ3: パフォーマンス問題

```
ユーザー: 「クエリが重い"

AI: 「パフォーマンスを調査します。

確認項目：
1. N+1問題がないか
2. インデックスが適切に設定されているか
3. 必要なフィールドのみ取得しているか

クエリコードを見せていただけますか？」

[コード確認]

AI: 「N+1問題が見つかりました。

【問題】
```typescript
// ❌ N+1問題
const users = await prisma.user.findMany();
for (const user of users) {
  const chats = await prisma.chat.findMany({ where: { userId: user.id } });
  // ユーザー数分のクエリが発行される
}
```

【解決策】
```typescript
// ✅ includeで1クエリにまとめる
const usersWithChats = await prisma.user.findMany({
  include: { chats: true },
});
```

修正しますか？」
```

---

## Schema Design

### 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| Model | PascalCase | `User`, `ChatMessage` |
| Field | camelCase | `firstName`, `createdAt` |
| Table | snake_case（@@map） | `chat_messages` |
| Enum | PascalCase | `UserRole` |

### モデル定義例

```prisma
// prisma/schema.prisma

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      UserRole @default(USER)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // リレーション
  chats     Chat[]
  sessions  Session[]

  @@map("users")
}

model Chat {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  title     String
  featureId String?  @map("feature_id")
  createdAt DateTime @default(now()) @map("created_at")

  // リレーション
  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages ChatMessage[]

  @@index([userId])
  @@index([featureId])
  @@map("chats")
}

enum UserRole {
  USER
  ADMIN
}
```

---

## チェックリスト

### スキーマ変更前チェックリスト

```markdown
## スキーマ変更前

- [ ] 破壊的変更かどうか判断した
- [ ] 既存データの移行計画がある（破壊的変更時）
- [ ] リレーションの整合性を確認した
- [ ] インデックスが必要か検討した
- [ ] 命名規則に従っている
```

### マイグレーション前チェックリスト

```markdown
## マイグレーション前

- [ ] ローカルで十分にテストした
- [ ] 本番データのバックアップがある（重要）
- [ ] 破壊的変更の影響範囲を確認した
- [ ] ロールバック手順を確認した
```

---

## Migration Workflow

### 安全なマイグレーション手順

```
1. スキーマ変更 → 2. ローカルで検証 → 3. マイグレーション作成 → 4. 本番適用
```

```bash
# Step 1: スキーマを編集
# prisma/schema.prisma

# Step 2: ローカルでマイグレーション作成・検証
npx prisma migrate dev --name add_new_field

# Step 3: 問題なければコミット
git add prisma/
git commit -m "db: add new_field to User"

# Step 4: 本番適用（デプロイ時）
npx prisma migrate deploy
```

### 破壊的変更の対応

**カラム削除時:**
```prisma
// 1. まずオプショナルに
model User {
  oldField String?  // nullableにしておく
}

// 2. データ移行スクリプト実行

// 3. 後で完全削除
```

---

## Quick Commands

```bash
# スキーマからクライアント生成
npx prisma generate

# マイグレーション作成（開発用）
npx prisma migrate dev --name [name]

# 本番マイグレーション適用
npx prisma migrate deploy

# データベース同期（プロトタイプ用）
npx prisma db push

# データベースリセット（注意！）
npx prisma migrate reset

# Prisma Studio（GUI管理ツール）
npx prisma studio
```

---

## Client Patterns

### PrismaClientインスタンス管理

```typescript
// lib/db/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### 基本的なCRUD

```typescript
// Create
const user = await prisma.user.create({
  data: {
    email: "user@example.com",
    name: "Taro",
  },
});

// Read
const users = await prisma.user.findMany({
  where: { role: "ADMIN" },
  orderBy: { createdAt: "desc" },
  take: 10,
});

// Update
const updated = await prisma.user.update({
  where: { id: userId },
  data: { name: "Jiro" },
});

// Delete
await prisma.user.delete({
  where: { id: userId },
});
```

### リレーションクエリ

```typescript
// includeで関連データを取得
const chats = await prisma.chat.findMany({
  where: { userId },
  include: {
    messages: {
      orderBy: { createdAt: "asc" },
    },
    user: {
      select: { name: true, email: true },
    },
  },
});

// selectで必要なフィールドのみ
const userNames = await prisma.user.findMany({
  select: { id: true, name: true },
});
```

### トランザクション

```typescript
// 複数操作を原子化
const result = await prisma.$transaction(async (tx) => {
  const chat = await tx.chat.create({
    data: { userId, title: "New Chat" },
  });
  
  const message = await tx.chatMessage.create({
    data: { chatId: chat.id, content: "Hello" },
  });
  
  return { chat, message };
});
```

---

## Performance Optimization

### N+1問題の回避

```typescript
// ❌ N+1問題
const users = await prisma.user.findMany();
for (const user of users) {
  const chats = await prisma.chat.findMany({ where: { userId: user.id } });
  // ユーザー数分のクエリが発行される
}

// ✅ 1クエリで解決
const usersWithChats = await prisma.user.findMany({
  include: { chats: true },
});
```

### クエリログ

```typescript
// 開発時にSQLを確認
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});
```

---

## Troubleshooting

| エラー | 原因 | 解決策 |
|-------|------|--------|
| `P1001` | DB接続失敗 | DATABASE_URLを確認 |
| `P2002` | 一意制約違反 | 重複データを確認 |
| `P2025` | レコードが見つからない | where条件を確認 |
| `P3005` | マイグレーション失敗 | スキーマ drift を確認 |
| 型エラー | generate未実行 | `npx prisma generate` |

### よくある問題

**問題**: `Cannot find module '@prisma/client'`
```bash
解決策: npx prisma generate
```

**問題**: `Invalid prisma.user.create() invocation`
```
解決策: 必須フィールドが欠けていないか確認
```

**問題**: マイグレーションコンフリクト
```bash
# 開発環境でリセット
npx prisma migrate reset

# または手動で修正
npx prisma migrate resolve --rolled-back <migration_name>
```

---

## Security Best Practices

- ✅ 本番DBのURLは厳重に管理
- ✅ Prisma Studioは開発環境のみ使用
- ✅ migrate resetは本番では絶対に実行しない
- ✅ マイグレーションは必ずレビュー後に適用

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- Project: `prisma/schema.prisma`, `lib/db/prisma.ts`
