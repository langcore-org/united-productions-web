# レイアウト・サイドバー リファクタリングプラン

**ステータス: Phase A 完了（2026-03-26）**

---

## 実施済み（Phase A: 構造修正）

### Step 1: トップページを (authenticated) 配下に移動 -- 完了
- `app/page.tsx` → `app/(authenticated)/page.tsx` に移動
- `<AppLayout>` ラッパーを削除（layout.tsx が担当）
- AppLayout使用箇所が1箇所に統一

### Step 2: forceCollapsed 廃止 → パスベース判定 -- 完了
- Sidebar が `usePathname()` で `/` を検知し自動縮小
- `forceCollapsed` プロップを Sidebar, AppLayout から完全削除
- `const effectiveCollapsed = pathname === "/" ? true : isCollapsed;`

### Step 3: MobileChatHeader → MobileHeader にリネーム・移動 -- 完了
- `components/chat/MobileChatHeader.tsx` → `components/layout/MobileHeader.tsx`
- コンポーネント名・エクスポート名も `MobileHeader` に変更

### Step 4: 未使用ファイル削除 -- 完了
- `components/layout/Header.tsx` を削除（未使用、ダークテーマ）

---

## 修正前の問題点（参考）

### 1. トップページが認証レイアウトの外にある

```
app/
├── page.tsx                    ← 認証なし、AppLayoutを直接使用
├── (authenticated)/
│   ├── layout.tsx              ← 認証チェック + AppLayout
│   └── chat/
│       ├── page.tsx
│       └── history/page.tsx
```

- `app/page.tsx` は認証外なのにAppLayoutでサイドバーを表示している
- `(authenticated)/layout.tsx` のAppLayoutとは別インスタンスになるため、ページ遷移時にSidebarが再マウントされる
- `forceCollapsed` はこの構造上の問題を回避するためのワークアラウンド

### 2. forceCollapsed の設計が中途半端

- トップページ専用のプロップだが、Sidebar内のtoggleボタンは動作する（見た目に反映されないが内部状態とlocalStorageは変わる）
- 「特定ページでサイドバーを強制縮小」という要件自体が、レイアウト設計で解決すべき問題

### 3. MobileChatHeader の命名と配置

- `components/chat/MobileChatHeader.tsx` にあるが、チャット専用ではなく全ページ共通で使われている
- 名前が `MobileChatHeader` なのに AppLayout に配置されている

### 4. Sidebar の SSR フォールバック

- `isMounted` フラグで SSR/CSR の不一致を防いでいるが、フォールバック時は空のasideを表示
- SSRフォールバック幅とデフォルト状態の整合性を手動で維持する必要がある

---

## 理想の設計

### ルーティング構造

```
app/
├── layout.tsx                   # RootLayout（HTML/body）
├── (public)/
│   └── auth/signin/page.tsx     # サインインページ
├── (authenticated)/
│   ├── layout.tsx               # 認証チェック + AppLayout（唯一のAppLayout使用箇所）
│   ├── page.tsx                 # トップページ（/ パス）
│   ├── chat/
│   │   └── page.tsx             # チャットページ
│   └── chat/history/
│       └── page.tsx             # 履歴ページ
```

**ポイント:**
- トップページを `(authenticated)` 配下に移動
- AppLayout は `(authenticated)/layout.tsx` の1箇所のみで使用
- 各ページは自分自身のコンテンツだけを返す（レイアウトをラップしない）

### コンポーネント構造

```
AppLayout (components/layout/AppLayout.tsx)
├── props: children, className のみ（forceCollapsed 削除）
├── デスクトップ: flex レイアウト
│   ├── Sidebar（flex-shrink-0）
│   └── main（flex-1）
├── モバイル: MobileHeader + スワイプでオーバーレイSidebar
│   ├── MobileHeader（md:hidden）
│   └── MobileSidebarOverlay
└── タッチジェスチャー: AppLayout内で管理

Sidebar (components/layout/Sidebar.tsx)
├── props: className のみ（forceCollapsed 削除）
├── 状態: isCollapsed（localStorage同期）
├── パス判定でトップページ（/）なら自動縮小
└── SSR: getInitialCollapsedState() でサーバー/クライアント一貫

MobileHeader (components/layout/MobileHeader.tsx)  ← リネーム
├── 旧: MobileChatHeader
└── 全ページ共通のモバイルヘッダー
```

### サイドバー状態管理

```
┌──────────────────────────────────────────┐
│ getInitialCollapsedState()               │
│   SSR: true（縮小）                       │
│   Client: localStorage → デフォルト true  │
└──────────────────┬───────────────────────┘
                   │
         ┌─────────▼─────────┐
         │ Sidebar useState   │
         │ isCollapsed        │
         │                    │
         │ pathname === "/"   │
         │ → 強制縮小          │
         │ それ以外            │
         │ → isCollapsed に従う│
         └────────────────────┘
```

- forceCollapsed プロップを廃止
- Sidebar自身がpathname（`/`）を見て縮小を判断
- AppLayoutはSidebarの状態を一切知らない（flex で自動追従）

---

## 実装ステップ

### Step 1: トップページを (authenticated) 配下に移動

**変更ファイル:**
- `app/page.tsx` → `app/(authenticated)/page.tsx` に移動
- 移動先で `<AppLayout>` ラッパーを削除（layout.tsx が担当）

**検証:**
- `/` にアクセスで認証チェックが走ること
- 未認証時に `/auth/signin` にリダイレクトされること
- サイドバーが表示されること

### Step 2: forceCollapsed を廃止し、パスベースの縮小に変更

**変更ファイル:**
- `components/layout/Sidebar.tsx` — forceCollapsed プロップ削除、pathname === "/" で縮小
- `components/layout/AppLayout.tsx` — forceCollapsed プロップ削除

**Sidebar の変更イメージ:**
```typescript
const effectiveCollapsed = pathname === "/" ? true : isCollapsed;
```

**検証:**
- トップページでサイドバーが常に縮小
- チャットページでサイドバーが展開/縮小可能
- 遷移時に正しい状態が反映されること

### Step 3: MobileChatHeader を MobileHeader にリネーム・移動

**変更ファイル:**
- `components/chat/MobileChatHeader.tsx` → `components/layout/MobileHeader.tsx`
- `components/layout/AppLayout.tsx` — import パス更新

**検証:**
- モバイルでハンバーガーメニューが動作すること

### Step 4: Sidebar の SSR フォールバック改善

**現状:**
```typescript
if (!isMounted) {
  return <aside className={cn("h-screen w-[64px]", baseClasses, className)} />;
}
```

**改善:**
- フォールバック時も同じJSX構造を返す（幅だけ固定）
- `isMounted` を使わず、`suppressHydrationWarning` または CSS による初期状態制御を検討

**検証:**
- ハイドレーション警告が出ないこと
- 初回表示でチラつきがないこと

---

## 完成後の状態

| 観点 | Before | After |
|------|--------|-------|
| AppLayout使用箇所 | 2箇所（page.tsx, layout.tsx） | 1箇所（layout.tsx のみ） |
| Sidebar状態同期 | forceCollapsed + localStorage | pathname判定 + localStorage |
| ページ遷移時のSidebar | 再マウント（別AppLayout） | 維持（同一AppLayout） |
| MobileHeader | chat/に配置、全ページで使用 | layout/に配置、名前も汎用的 |
| 各ページの責務 | レイアウトをラップする場合あり | コンテンツのみ返す |

## Phase B: アーキテクチャ改善（将来検討）

Phase A で構造的な問題は解決済み。以下は同じパターンが3箇所以上で繰り返されたら検討。

- `SidebarContext` / `useSidebar` — Sidebarの状態を外部コンポーネントから参照する需要が出た場合
- `useSwipeGesture` フック抽出 — スワイプ機能を他でも使う場合
- `useLocalStorage` フック — localStorage利用箇所が増えた場合
- `ResponsiveSidebar` — デスクトップ/モバイルの切り替えロジックが複雑化した場合
