# テーマシステム

> **最終更新**: 2026-02-20
> **ステータス**: ✅ モノトーン統一完了

---

## 概要

AI Hubは**モノトーン（グレースケール）**ベースのデザインシステムを採用しています。

### 設計方針

- **単一のカラーパレット**: グレーのみを使用し、保守性を向上
- **セマンティック命名**: 用途に基づいたクラス命名
- **一貫性**: 全ページで統一された視覚体験

---

## カラーパレット

### グレースケール

| トークン | Tailwind | HEX | 用途 |
|---------|----------|-----|------|
| `gray-50` | `bg-gray-50` | `#f9fafb` | 背景（管理画面）、ホバー |
| `gray-100` | `bg-gray-100` | `#f3f4f6` | ホバー背景、軽い強調 |
| `gray-200` | `border-gray-200` | `#e5e7eb` | ボーダー、区切り線 |
| `gray-300` | `text-gray-300` | `#d1d5db` | 無効状態、プレースホルダー |
| `gray-400` | `text-gray-400` | `#9ca3af` | 補助テキスト |
| `gray-500` | `text-gray-500` | `#6b7280` | セカンダリテキスト、説明 |
| `gray-600` | `text-gray-600` | `#4b5563` | アイコン、ラベル |
| `gray-700` | `text-gray-700` | `#374151` | 強調テキスト |
| `gray-800` | `bg-gray-800` | `#1f2937` | （使用制限） |
| `gray-900` | `text-gray-900` | `#111827` | 主要テキスト、アクセント |
| `white` | `bg-white` | `#ffffff` | メイン背景、カード |

### セマンティックマッピング

```typescript
// 推奨される色の使い方
const theme = {
  // 背景
  background: {
    main: 'bg-white',           // メイン背景
    sidebar: 'bg-gray-50',      // サイドバー
    card: 'bg-white',           // カード
    hover: 'bg-gray-100',       // ホバー
    active: 'bg-gray-50',       // アクティブ
  },
  
  // テキスト
  text: {
    primary: 'text-gray-900',   // 主要テキスト
    secondary: 'text-gray-500', // セカンダリ
    muted: 'text-gray-400',     // ミュート
    disabled: 'text-gray-300',  // 無効
  },
  
  // ボーダー
  border: {
    default: 'border-gray-200', // 標準
    hover: 'border-gray-300',   // ホバー
    active: 'border-gray-900',  // アクティブ
  },
  
  // アクセント
  accent: {
    bg: 'bg-gray-900',          // アクセント背景
    text: 'text-gray-900',      // アクセントテキスト
    border: 'border-gray-900',  // アクセントボーダー
  }
};
```

---

## CSS変数

### `app/globals.css`

```css
:root {
  /* 背景 */
  --background: #ffffff;
  --foreground: #111827;
  
  /* カード */
  --card: #ffffff;
  --card-foreground: #111827;
  
  /* プライマリー（アクセント） */
  --primary: #111827;        /* gray-900 */
  --primary-foreground: #ffffff;
  
  /* セカンダリー */
  --secondary: #f3f4f6;      /* gray-100 */
  --secondary-foreground: #111827;
  
  /* ミュート */
  --muted: #f3f4f6;          /* gray-100 */
  --muted-foreground: #6b7280; /* gray-500 */
  
  /* ボーダー */
  --border: #e5e7eb;         /* gray-200 */
  --input: #e5e7eb;          /* gray-200 */
  --ring: #111827;           /* gray-900 */
  
  /* サイドバー */
  --sidebar: #f9f9f9;        /* gray-50相当 */
  --sidebar-foreground: #111827;
  --sidebar-primary: #111827;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #f3f4f6; /* gray-100 */
  --sidebar-accent-foreground: #111827;
  --sidebar-border: #e5e7eb; /* gray-200 */
  --sidebar-ring: #111827;
}
```

---

## コンポーネント別スタイル

### ボタン

```typescript
// プライマリー
'bg-gray-900 text-white hover:bg-gray-800'

// セカンダリー
'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50'

// ゴースト
'text-gray-600 hover:text-gray-900 hover:bg-gray-100'

// 無効
'bg-gray-200 text-gray-400 cursor-not-allowed'
```

### カード

```typescript
// 標準
'bg-white border border-gray-200 rounded-xl'

// ホバー
'hover:border-gray-300 hover:shadow-sm transition-all'

// アクティブ
'border-gray-900 bg-gray-50'
```

### 入力欄

```typescript
// 標準
'bg-gray-50 border-gray-200 text-gray-900'
'placeholder:text-gray-400'
'focus:border-gray-900 focus:ring-gray-900/20'
```

### ナビゲーション

```typescript
// 非アクティブ
'text-gray-600 hover:bg-gray-100 hover:text-gray-900'

// アクティブ
'bg-white text-gray-900 border-gray-200'
// + 左インジケーター
'before:absolute before:left-0 before:w-[3px] before:h-5 before:bg-gray-900'
```

---

## 画面別設定

### ユーザー画面

```typescript
const userTheme = {
  background: 'bg-white',
  sidebar: 'bg-[#f9f9f9]',
  sidebarBorder: 'border-[#e5e5e5]',
  activeNav: 'bg-white border-[#e5e5e5]',
  activeIndicator: 'bg-gray-900',
};
```

### 管理画面

```typescript
const adminTheme = {
  background: 'bg-gray-50',
  sidebar: 'bg-white',
  sidebarBorder: 'border-gray-200',
  activeNav: 'bg-amber-50 text-amber-700 border-amber-200', // 唯一の例外
};
```

---

## 移行履歴

### 2026-02-20: モノトーン統一

**変更前**:
- ブランドカラー: `#ff6b00` (orange)
- アクセント: amber, blue, green など
- エージェント別カラー: blue, green, amber

**変更後**:
- 全て `gray-*` に統一
- 管理画面のみ `amber` をアクセントとして維持

**対象ファイル**:
- `components/layout/Sidebar.tsx`
- `components/ui/FeatureChat.tsx`
- `components/ui/MessageBubble.tsx`
- `components/ui/ModelSelector.tsx`
- `components/ui/StreamingMessage.tsx`
- `components/icons/TeddyIcon.tsx`
- その他30+ファイル

---

## 関連ドキュメント

- [UI/UX ガイドライン](./guides/ui-ux-guidelines.md)
- [コンポーネント設計](./specs/architecture/component-design.md)
- [globals.css](../app/globals.css)
