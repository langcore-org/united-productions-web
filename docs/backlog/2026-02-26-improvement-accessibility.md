# アクセシビリティ改善候補

> **最終更新**: 2026-03-20
> **発見日**: 2026-02-26
> **優先度**: 🟢 低（機能に影響なし）
> **関連**: Lintエラー修正, a11y

---

## 概要

Lintエラー修正の過程で、以下のアクセシビリティ改善候補が見つかりました。現在は無視コメントで対応していますが、将来的な改善の参考として記録します。

---

## 関連タスク

詳細な対応計画は `docs/backlog/todo-lint-suppression-review.md` を参照。

---

## 改善候補一覧

### 1. リサイズハンドルのキーボード対応

**対象**: `components/layout/SplitPaneLayout.tsx`

**現状**:
- マウスでのリサイズのみ対応
- キーボード操作ができない

**改善案**:
- キーボードショートカット（Alt+Arrow）でのリサイズ
- リサイズハンドルにフォーカス可能にする
- WAI-ARIAの`separator`ロールの完全実装

```tsx
// 理想形
<div
  role="separator"
  aria-valuenow={splitPosition}
  aria-valuemin={0}
  aria-valuemax={100}
  tabIndex={0}
  onKeyDown={handleKeyResize}
/>
```

---

### 2. ドラッグ&ドロップのアクセシビリティ

**対象**: 
- `components/ui/FileUpload.tsx`
- `components/ui/FileAttachment.tsx`

**現状**:
- ドラッグオーバーレイがキーボード非対応
- スクリーンリーダーでの操作が困難

**改善案**:
- キーボードでのファイル選択ダイアログ起動
- `aria-dropeffect`属性の追加
- ライブリージョンでの状態通知

---

### 3. 無視コメントの削減

**対象**: 複数ファイル

**現状**:
- `useExhaustiveDependencies`の無視コメントが複数存在
- 依存配列が複雑で、完全な対応が困難

**改善案**:
- カスタムフックへのリファクタリング
- 依存関係の整理と単純化
- React Query等の導入による状態管理の簡略化

---

### 4. SVGタイトルの多言語対応

**対象**: `components/icons/*.tsx`, `components/ui/FeatureButtons.tsx`

**現状**:
- `aria-label`は英語で固定
- 国際化（i18n）対応が必要

**改善案**:
- `next-intl`等の導入
- SVGコンポーネントに翻訳キーを渡す

```tsx
<svg aria-label={t('icons.search')} ... />
```

---

## 優先度

| 項目 | 優先度 | 理由 |
|------|--------|------|
| リサイズハンドル | 🟡 中 | キーボードユーザーの利便性向上 |
| ドラッグ&ドロップ | 🟡 中 | WCAG 2.1準拠のため |
| 無視コメント削減 | 🟢 低 | コード品質向上 |
| SVG多言語対応 | 🟢 低 | 将来の国際化に備えて |

---

## 参考資料

- [WCAG 2.1](https://www.w3.org/TR/WCAG21/)
- [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)
- [React Accessibility](https://react.dev/accessibility)

---

## 関連ドキュメント

- [Backlog README](./README.md) - Backlog管理ガイド
- [AGENTS.md](../../AGENTS.md) - エージェント行動指針

---

**最終更新**: 2026-03-20 14:35
