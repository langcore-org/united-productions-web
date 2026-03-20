# AI Hub UI/UX ガイドライン

> **最終更新**: 2026-03-20 14:35

---

## 1. デザイン哲学

### 1.1 モノトーン・ミニマリズム

AI Hubは**モノトーン（グレースケール）**を基調としたミニマルなデザインを採用しています。

**理由**:
- **コンテンツの優先**: 色の競合を避け、コンテンツ自体が主役になる
- **統一感**: 全ページで一貫した視覚体験を提供
- **アクセシビリティ**: 色覚特性に依存しない設計
- **保守性**: 色の管理が容易

### 1.2 デザイン原則

```
1. シンプリシティ: 不要な装飾を排除
2. 階層性: サイズ、濃淡、スペースで視覚的階層を構築
3. 一貫性: 同じパターンを全ページで統一
4. フィードバック: ユーザーのアクションに対する明確な応答
```

---

## 2. カラーパレット

### 2.1 プライマリーカラー（モノトーン）

| カラー名 | Tailwind | HEX | 用途 |
|---------|----------|-----|------|
| Black | `gray-900` | `#111827` | 主要テキスト、アクセント |
| Dark Gray | `gray-700` | `#374151` | セカンダリテキスト |
| Medium Gray | `gray-500` | `#6b7280` | 補助テキスト、プレースホルダー |
| Light Gray | `gray-300` | `#d1d5db` | 無効状態、ボーダー |
| Lighter Gray | `gray-200` | `#e5e7eb` | ボーダー、区切り線 |
| Lightest Gray | `gray-100` | `#f3f4f6` | ホバー背景 |
| Off White | `gray-50` | `#f9fafb` | サイドバー背景 |
| White | `white` | `#ffffff` | メイン背景、カード |

### 2.2 セマンティックカラー

| 用途 | カラー | 例 |
|------|--------|-----|
| アクティブ/選択 | `gray-900` + `gray-50`背景 | ナビゲーション |
| ホバー | `gray-100` | リスト項目 |
| ボーダー | `gray-200` | カード、入力欄 |
| 無効 | `gray-300` | 無効ボタン |

---

## 3. コンポーネントスタイル

### 3.1 ボタン

```typescript
// プライマリーボタン
"bg-gray-900 text-white hover:bg-gray-800"

// セカンダリーボタン
"bg-white border border-gray-200 text-gray-900 hover:bg-gray-50"

// ゴーストボタン
"text-gray-600 hover:text-gray-900 hover:bg-gray-100"

// 無効状態
"bg-gray-200 text-gray-400 cursor-not-allowed"
```

### 3.2 カード

```typescript
// 標準カード
"bg-white border border-gray-200 rounded-xl shadow-sm"

// ホバー時
"hover:shadow-md transition-shadow"

// アクティブ/選択時
"border-gray-900 bg-gray-50"
```

### 3.3 入力欄

```typescript
// テキスト入力
"bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
"focus:border-gray-900 focus:ring-gray-900/20"

// 無効状態
"bg-gray-100 text-gray-500"
```

### 3.4 バッジ

```typescript
// 標準バッジ
"bg-gray-100 text-gray-700 border border-gray-200"

// アクセントバッジ
"bg-gray-900 text-white"
```

---

## 4. レイアウト

### 4.1 スペーシング

| サイズ | 用途 |
|--------|------|
| `p-2` (8px) | アイコンボタン、小要素 |
| `p-3` (12px) | リスト項目、メニュー |
| `p-4` (16px) | カード内padding |
| `p-6` (24px) | セクションpadding |
| `p-8` (32px) | ページpadding |

### 4.2 ボーダー半径

| サイズ | 用途 |
|--------|------|
| `rounded-lg` (8px) | ボタン、入力欄 |
| `rounded-xl` (12px) | カード、ナビ項目 |
| `rounded-2xl` (16px) | メッセージバブル |
| `rounded-full` | アバター、アイコン |

---

## 5. タイポグラフィ

### 5.1 フォントサイズ

| サイズ | 用途 |
|--------|------|
| `text-xs` (12px) | キャプション、ラベル |
| `text-sm` (14px) | ボディテキスト、ボタン |
| `text-base` (16px) | 標準テキスト |
| `text-lg` (18px) | 小見出し |
| `text-xl` (20px) | 中見出し |
| `text-2xl` (24px) | 大見出し |
| `text-3xl` (30px) | ページタイトル |

### 5.2 フォントウェイト

| ウェイト | 用途 |
|----------|------|
| `font-normal` (400) | 標準テキスト |
| `font-medium` (500) | ボタン、ラベル |
| `font-semibold` (600) | 見出し、強調 |
| `font-bold` (700) | ページタイトル |

---

## 6. アニメーション

### 6.1 トランジション

```typescript
// 標準
"transition-all duration-200 ease-out"

// ホバー
"hover:scale-105 transition-transform duration-200"

// 色変化
"transition-colors duration-150"
```

### 6.2 状態変化

| 状態 | 表現 |
|------|------|
| ホバー | 背景色の変化 (`bg-gray-50`) |
| アクティブ | ボーダー色の変化 (`border-gray-900`) |
| 無効 | 透明度の低下 + カーソル変更 |
| 読み込み中 | スピナーアニメーション |

---

## 7. 画面別ガイドライン

### 7.1 管理画面（/admin/*）

- **背景**: `bg-gray-50`
- **サイドバー**: `bg-white border-gray-200`
- **アクティブ**: `bg-amber-50 text-amber-700`（唯一の例外）

### 7.2 ユーザー画面

- **背景**: `bg-white`
- **サイドバー**: `bg-[#f9f9f9] border-[#e5e5e5]`
- **アクティブ**: `bg-white border-gray-200` + 左インジケーター

---

## 8. 実装チェックリスト

新規コンポーネント作成時:

- [ ] 色は `gray-*` または `white` のみ使用
- [ ] ボーダーは `gray-200` を標準とする
- [ ] ホバーは `gray-100` を使用
- [ ] アクティブは `gray-900` + `gray-50` を検討
- [ ] トランジションは `duration-200` を標準とする
- [ ] スペーシングは4の倍数を使用

---

## 9. 関連ファイル

- `app/globals.css` — CSS変数定義
- `components/ui/*` — 基本コンポーネント
- `docs/theme-system.md` — テーマシステム詳細

---

## 関連ドキュメント

- [Guides README](./README.md) - ガイド一覧
- [AGENTS.md](../../AGENTS.md) - エージェント行動指針

---

**最終更新**: 2026-03-20 14:35
