# サイドバー・メイン画面アイコン統一計画

> **作成日**: 2026-03-13  
> **目的**: サイドバーの機能アイコンとメイン画面タイトルのアイコンを統一し、UXの一貫性を向上させる

---

## 現状の問題

| 場所 | 現在のアイコン | 問題 |
|------|---------------|------|
| **サイドバー** | 機能ごとに異なるアイコン（Users, Shield, FileText等） | ✅ 適切 |
| **メイン画面タイトル** | すべての機能で共通の `Sparkles` アイコン | ❌ 統一感がない |

### スクリーンショットで確認できる問題

- **サイドバー**: 「出演者リサーチ」には人アイコン（Users）が表示される
- **メイン画面**: 「出演者リサーチ」のタイトル横には星アイコン（Sparkles）が表示される

→ 同じ機能なのにアイコンが異なり、ユーザーが困惑する可能性がある

---

## 解決方針

### 推奨案: 機能アイコンをメイン画面タイトルにも反映

メイン画面のタイトル部分（ChatHeader）で、現在選択されている機能に応じたアイコンを表示する。

**変更対象ファイル:**
- `components/ui/ChatHeader.tsx` - アイコン表示部分の修正
- `lib/chat/navigation.ts` - アイコン取得関数の追加（必要に応じて）

### 実装アプローチ

```typescript
// chat-config.ts で定義されている icon を ChatHeader で使用
// 現在: Sparkles（固定）
// 変更後: featureId に応じたアイコン（Users, Shield, FileText等）
```

---

## 実装ステップ

### Step 1: 機能ID→アイコンのマッピングを共通化（30分）

`lib/chat/chat-config.ts` で定義されている `icon` プロパティを、ChatHeader でも利用できるようにする。

```typescript
// lib/chat/chat-config.ts
export function getFeatureIcon(featureId: ChatFeatureId): string {
  return chatFeatureConfigs[featureId]?.icon || "MessageSquare";
}
```

### Step 2: ChatHeader で動的アイコンを表示（45分）

`components/ui/ChatHeader.tsx` を修正し、機能IDに応じたアイコンを表示する。

```typescript
// 変更前（固定アイコン）
<Sparkles className="w-4 h-4 text-gray-900" />

// 変更後（動的アイコン）
const FeatureIcon = getFeatureIconComponent(featureId);
<FeatureIcon className="w-4 h-4 text-gray-900" />
```

### Step 3: 各機能のアイコンを最適化（30分）

現在設定されているアイコンが機能のイメージに合っているか確認・調整：

| 機能 | 現在のアイコン | 適切か？ |
|------|---------------|---------|
| チャット | MessageSquare | ✅ |
| 出演者リサーチ | Users | ✅ |
| エビデンスリサーチ | Shield | ⚠️ 検討（Shieldは保護/安全のイメージ） |
| 議事録作成 | FileText | ✅ |
| 新企画立案 | Lightbulb | ✅ |

**検討事項**: 
- エビデンスリサーチは `Search` や `CheckCircle` の方が適切かもしれない

### Step 4: 動作確認（15分）

- [ ] 各機能で適切なアイコンが表示される
- [ ] リロード時もアイコンが正しく表示される
- [ ] レスポンシブで問題ない

---

## 実装時間見積もり

| ステップ | 時間 |
|---------|------|
| Step 1: マッピング共通化 | 30分 |
| Step 2: ChatHeader修正 | 45分 |
| Step 3: アイコン最適化 | 30分 |
| Step 4: 動作確認 | 15分 |
| **合計** | **約2時間** |

---

## 代替案（もっと簡単な対応）

### 案B: タイトルからアイコンを削除

アイコンを完全に削除し、テキストタイトルのみ表示する。

**メリット:**
- 実装が最も簡単（5分で完了）
- シンプルな見た目

**デメリット:**
- ビジュアル的なアイコン識別ができなくなる

### 案C: 固定アイコンを変更

`Sparkles` の代わりに、TV制作/AI関連の共通アイコンを使用する。

**候補:**
- `Bot` - AIアシスタント感
- `Tv` - TV制作感
- `Sparkles` - 現状維持（魔法/AI感）

---

## 推奨結論

**推奨案（機能別アイコン表示）を採用する。**

理由:
1. サイドバーとメイン画面の統一感が生まれる
2. ユーザーは視覚的に「今どの機能を使っているか」把握しやすい
3. 実装コストは低い（約2時間）
4. 将来の機能追加時も自然に拡張できる

---

## タスク一覧

- [ ] **実装タスク作成**: 上記 Step 1-4 を個別タスク化
- [ ] **実装**: ChatHeader の動的アイコン対応
- [ ] **レビュー**: 各機能でアイコンが正しく表示されるか確認
- [ ] **本番反映**: デプロイ

---

## 関連ファイル

| ファイル | 用途 |
|---------|------|
| `components/ui/ChatHeader.tsx` | メイン画面タイトル表示 |
| `lib/chat/chat-config.ts` | 機能設定（アイコン定義） |
| `lib/chat/navigation.ts` | ナビゲーションアイコン取得 |
| `components/layout/Sidebar.tsx` | サイドバー表示 |

---

## 備考

- Lucide React アイコンを使用（すでにプロジェクトに導入済み）
- 新しいアイコンの追加が必要な場合は `lucide-react` からインポート
