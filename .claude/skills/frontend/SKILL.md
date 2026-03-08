---
name: frontend
description: フロントエンド開発（Next.js + React）。App Router、Server Components/Actions、コンポーネント設計、フック活用、パフォーマンス最適化を統合サポート。ユーザーが「画面」「UI」「コンポーネント」「React」「フォーム」「ダッシュボード」などに関する質問や実装要望をした時に使用。
---

# Frontend Developer

Next.js 14+ と React のフロントエンド開発スキル。App Router、Server Components/Actions、コンポーネント設計、パフォーマンス最適化を網羅。

## When to use

- 「画面」「UI」「コンポーネント」などの実装時
- 「React」「Next.js」に関する質問時
- 「フォーム」「ダッシュボード」「リスト」などの実装時
- App Router、Server Componentsの使用時
- パフォーマンス問題、レンダリング問題発生時
- Hydrationエラー、型エラー発生時
- Tailwind CSS、スタイリングに関する質問時

## Project Stack

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | ^16.0.10 | フレームワーク |
| React | 19.2.3 | UIライブラリ |
| TypeScript | 5.9.3 | 型システム |
| Tailwind CSS | ^4 | スタイリング |
| Radix UI | ^1.4.3 | ヘッドレスUI |

## Quick Reference

```bash
# 型チェック
npx tsc --noEmit

# ビルドテスト
npm run build

# 開発サーバー
npm run dev
```

---

## ユースケース別実装ガイド

### ユースケース1: フォーム実装

#### ステップバイステップ

```
ユーザー: 「ユーザー登録フォームを作りたい"

AI: 「フォーム実装の計画を立てます。

【実装ステップ】
1. スキーマ定義（Zod）
2. Server Action作成
3. フォームコンポーネント実装
4. バリデーション・エラーハンドリング
5. 送信後の処理（リダイレクト等）

どこまで実装しますか？」
```

#### 実装パターン

```typescript
// 1. スキーマ定義
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  role: z.enum(["USER", "ADMIN"]),
});

type UserFormData = z.infer<typeof userSchema>;

// 2. Server Action
"use server";

export async function createUser(formData: FormData) {
  const data = Object.fromEntries(formData);
  const parsed = userSchema.safeParse(data);
  
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  
  await prisma.user.create({ data: parsed.data });
  revalidatePath("/users");
  redirect("/users");
}

// 3. フォームコンポーネント
"use client";

export function UserForm() {
  const [state, action] = useFormState(createUser, null);
  
  return (
    <form action={action}>
      <div>
        <label>名前</label>
        <input name="name" />
        {state?.error?.name && <span>{state.error.name}</span>}
      </div>
      
      <div>
        <label>メール</label>
        <input name="email" type="email" />
        {state?.error?.email && <span>{state.error.email}</span>}
      </div>
      
      <button type="submit">作成</button>
    </form>
  );
}
```

### ユースケース2: ダッシュボード実装

#### レイアウト構成

```typescript
// app/(authenticated)/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-100">
        <Sidebar />
      </aside>
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
```

#### データ表示パターン

```typescript
// app/(authenticated)/dashboard/page.tsx
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  // 並列でデータ取得
  const [userCount, recentChats, systemStatus] = await Promise.all([
    prisma.user.count(),
    prisma.chat.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
    getSystemStatus(),
  ]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard title="ユーザー数" value={userCount} />
      <RecentChatsCard chats={recentChats} />
      <SystemStatusCard status={systemStatus} />
    </div>
  );
}
```

### ユースケース3: リスト・テーブル実装

#### 無限スクロール

```typescript
"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

export function ChatList() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["chats"],
    queryFn: ({ pageParam }) => fetchChats({ cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  return (
    <div>
      {data?.pages.map((page) =>
        page.chats.map((chat) => <ChatItem key={chat.id} chat={chat} />)
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>さらに読み込む</button>
      )}
    </div>
  );
}
```

#### ソート・フィルター付きテーブル

```typescript
"use client";

import { useState } from "react";

export function DataTable<T extends { id: string }>({
  data,
  columns,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");

  const sortedData = [...data]
    .filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(filter.toLowerCase())
      )
    )
    .sort((a, b) => {
      if (!sortKey) return 0;
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  return (
    <div>
      <input
        placeholder="検索..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={() => {
                  setSortKey(col.key);
                  setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={String(col.key)}>
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## App Router Best Practices

### Server Components vs Client Components

```typescript
// Server Component（デフォルト）
// ✅ DBアクセス、ファイルシステム、API呼び出し
// ❌ useState, useEffect, イベントハンドラ
export default async function Page() {
  const data = await fetchData(); // サーバー側で実行
  return <div>{data.title}</div>;
}

// Client Component
// ✅ useState, useEffect, ブラウザAPI
// ❌ DBアクセス、ファイルシステム
"use client";

export function ClientComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### コンポーネント配置ルール

| ディレクトリ | 用途 | コンポーネントタイプ |
|-------------|------|-------------------|
| `app/` | ページ、レイアウト | Server Component |
| `components/` | UIコンポーネント | 必要に応じて |
| `components/ui/` | 基本UI（Button等） | Client Component |
| `hooks/` | カスタムフック | "use client" |
| `lib/` | ユーティリティ | Server |

---

## 対話例：よくあるシナリオ

### シナリオ1: Hydrationエラーの解決

```
ユーザー: 「コンソールにHydrationエラーが出てる"

AI: 「Hydrationエラーの原因を調査します。

一般的な原因：
1. ServerとClientのレンダリング結果が異なる
2. 日時フォーマットの違い
3. localStorage/sessionStorageへのアクセス

コードを確認します。」

[コード確認]

AI: 「原因が特定できました。`Date`オブジェクトのフォーマット違いです。

解決策：
1. 日時はuseEffect内でフォーマットする
2. またはsuppressHydrationWarningを使用

どちらで対応しますか？」
```

### シナリオ2: パフォーマンス問題

```
ユーザー: 「リストが重い、スクロールがもっさりする"

AI: 「パフォーマンス問題を調査します。

チェックリスト：
1. 大量のレンダリングが発生していないか
2. useMemo/useCallbackが適切に使われているか
3. 仮想化が必要か

React DevToolsでProfilerを確認しますか？
それともコードを見せていただけますか？」
```

---

## チェックリスト

### コンポーネント実装前チェックリスト

```markdown
## 実装前チェック

- [ ] Server ComponentかClient Componentか決定した
- [ ] Propsの型定義を決定した
- [ ] 必要なデータフェッチ方法を決定した
- [ ] エラーハンドリング方針を決定した
- [ ] ローディング状態の表示方針を決定した
```

### コードレビューチェックリスト

```markdown
## フロントエンドコードレビュー

- [ ] TypeScriptの型が適切に定義されている
- [ ] Server/Clientの使い分けが適切
- [ ] 不要なuseMemo/useCallbackがない
- [ ] useEffectの依存配列が正しい
- [ ] アクセシビリティ（alt, aria-label等）
- [ ] レスポンシブ対応が必要か
- [ ] エラーバウンダリでラップしている
```

---

## Component Patterns

### Compound Components

```typescript
// components/ui/Tabs.tsx
"use client";

import { createContext, useContext, useState } from "react";

const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (id: string) => void;
} | null>(null);

export function Tabs({ children, defaultTab }: { 
  children: React.ReactNode; 
  defaultTab: string;
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

export function TabList({ children }: { children: React.ReactNode }) {
  return <div className="flex border-b">{children}</div>;
}

export function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tab must be used within Tabs");
  
  return (
    <button
      className={cn(
        "px-4 py-2",
        ctx.activeTab === id && "border-b-2 border-blue-500"
      )}
      onClick={() => ctx.setActiveTab(id)}
    >
      {children}
    </button>
  );
}
```

### Server Actions

```typescript
// app/actions.ts
"use server";

import { revalidatePath } from "next/cache";

export async function createChat(formData: FormData) {
  const title = formData.get("title") as string;
  
  await prisma.chat.create({
    data: { title, userId: session.user.id }
  });
  
  revalidatePath("/chat");
}
```

---

## Custom Hooks

### useChat

```typescript
// hooks/use-chat.ts
"use client";

import { useState, useCallback } from "react";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: content }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { messages, sendMessage, isLoading };
}
```

---

## Performance Optimization

### 不要な再レンダリング防止

```typescript
// React.memo でラップ
export const MessageBubble = React.memo(function MessageBubble({ 
  message 
}: { 
  message: Message;
}) {
  return <div>{message.content}</div>;
});

// useMemo で計算結果をキャッシュ
const sortedMessages = useMemo(() => {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
}, [messages]);
```

### 遅延ロード

```typescript
import { lazy, Suspense } from "react";

const HeavyComponent = lazy(() => import("./HeavyComponent"));

export function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

---

## Common Issues

| 問題 | 原因 | 解決策 |
|------|------|--------|
| Hydration mismatch | Server/Client の差異 | `useEffect` で初期化、または `suppressHydrationWarning` |
| useStateが使えない | Server Component | `"use client"` を追加 |
| async/awaitエラー | Client Component | Server Componentに移動、またはuseEffectで処理 |
| スタイルが適用されない | Tailwind設定 | `content`にファイルパスが含まれているか確認 |

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/reference/react)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- Project: `app/`, `components/`, `hooks/` ディレクトリ
