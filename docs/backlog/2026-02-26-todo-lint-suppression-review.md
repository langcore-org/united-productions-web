# Lint無視コメント（biome-ignore）の対応タスク

> **優先度**: 🔴 高〜🟡 中〜🟢 低（項目による）
> **最終更新**: 2026-03-20
> **発見日**: 2026-02-26
> **期限**: 3ヶ月ごとのレビュー（高リスク項目は1-2週間以内）
> **関連**: Lintエラー修正, セキュリティ, 技術的負債

---

## 概要

2026-02-26のLintエラー修正で、`// biome-ignore` コメントで一時的に対応した箇所があります。これらは**技術的負債**であり、定期的な見直しと解消が必要です。

詳細なレビュー記録: `docs/backlog/review-suppression-comments.md`

---

## 🔴 高優先度（1-2週間以内に対応）

### 1. `dangerouslySetInnerHTML` のセキュリティテスト追加

**対象ファイル**:
- `app/(authenticated)/meeting-notes/page.tsx`
- `app/(authenticated)/transcripts/page.tsx`

**現状**:
- DOMPurifyでサニタイズしているが、テストがない
- XSS脆弱性のリスクがある

**対応内容**:
```typescript
// tests/lib/xss-sanitizer.test.ts を作成

describe('sanitizeAndFormatMarkdown', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("xss")</script>Hello';
    const output = sanitizeAndFormatMarkdown(input);
    expect(output).not.toContain('<script>');
  });

  it('should remove event handlers', () => {
    const input = '<img src="x" onerror="alert(\'xss\')">';
    const output = sanitizeAndFormatMarkdown(input);
    expect(output).not.toContain('onerror');
  });

  it('should sanitize while preserving allowed tags', () => {
    const input = '# Title\n\n**Bold** text';
    const output = sanitizeAndFormatMarkdown(input);
    expect(output).toContain('<h1>'); // または適切なタグ
    expect(output).toContain('<strong>');
  });
});
```

**完了条件**:
- [ ] テストファイル作成
- [ ] 全てのXSSパターンでテスト通過
- [ ] CIに組み込み

**担当**: セキュリティ担当またはバックエンド担当

---

### 2. DOMPurify設定のセキュリティレビュー

**対象**: `lib/xss-sanitizer.ts`

**確認項目**:
- [ ] 許可するタグのリストが適切か
- [ ] 許可する属性のリストが適切か
- [ ] 最新のDOMPurifyベストプラクティスに沿っているか

**参考**:
- https://github.com/cure53/DOMPurify/wiki/Default-Templates-and-Hooks
- OWASP XSS Prevention Cheat Sheet

---

## 🟡 中優先度（1-2ヶ月以内に対応）

### 3. `dangerouslySetInnerHTML` の排除（ react-markdown への移行）

**対象**:
- `app/(authenticated)/meeting-notes/page.tsx`
- `app/(authenticated)/transcripts/page.tsx`

**現状の問題**:
- `dangerouslySetInnerHTML` はXSSリスクが常にある
- DOMPurifyに依存し続ける必要がある

**移行案**:
```typescript
// Before
<div dangerouslySetInnerHTML={{ __html: sanitizeAndFormatMarkdown(result) }} />

// After（推奨）
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {result}
</ReactMarkdown>
```

**検討事項**:
- [ ] 現在のスタイルが維持できるか
- [ ] パフォーマンスへの影響
- [ ] カスタムコンポーネントの対応

**担当**: フロントエンド担当

---

### 4. ドラッグ&ドロップのキーボード対応

**対象**:
- `components/ui/FileUpload.tsx`
- `components/ui/FileAttachment.tsx`

**現状**:
- マウス操作のみ対応
- キーボードユーザーがアクセスできない

**対応内容**:
```tsx
// 追加すべき機能
<div
  role="button"
  tabIndex={0}
  aria-label="ファイルをドロップするかEnterキーで選択"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFileDialog();
    }
  }}
/>
```

**完了条件**:
- [ ] Enter/Spaceキーでファイル選択ダイアログが開く
- [ ] スクリーンリーダーで正しく読み上げられる
- [ ] フォーカスインジケータが表示される

---

### 5. `useExhaustiveDependencies` の根本解決

**対象**: 複数ファイル
- `components/ui/FeatureChat.tsx`
- `components/ui/FileAttachment.tsx`
- `components/ui/FileUpload.tsx`
- `app/admin/usage/page.tsx`

**現状**:
- `useCallback` の依存配列が複雑
- `// biome-ignore` で回避している

**対応案（選択肢）**:

**案A: カスタムフックへの分割**（推奨）
```typescript
// useChatData.ts
export function useChatData() {
  const fetchData = useCallback(async () => {
    // ...
  }, []); // 依存関係を内部で管理
  
  return { fetchData };
}
```

**案B: React Query (TanStack Query) の導入**（長期的）
- データフェッチングの簡略化
- 依存関係の自動管理

**完了条件**:
- [ ] 無視コメントを削除できる
- [ ] 無限ループが発生しない
- [ ] テストが通過する

---

## 🟢 低優先度（3ヶ月ごとのレビュー）

### 6. ESM対応ライブラリの更新確認

**対象**: `lib/parsers/document.ts`

**現状**:
```typescript
// biome-ignore lint/security/noGlobalEval: 動的インポートに必要
const pdfParseModule = await eval('import("pdf-parse")');
const mammothModule = await eval('import("mammoth")');
const xlsxModule = await eval('import("xlsx")');
```

**確認項目（3ヶ月ごと）**:
- [ ] `pdf-parse` がESMに対応したか
- [ ] `mammoth` がESMに対応したか
- [ ] `xlsx` (`sheetjs`) がESMに対応したか

**代替ライブラリ候補**:
- `pdf-parse` → `unpdf` または `pdf-lib`
- `mammoth` → ESM対応のフォークを探す
- `xlsx` → `exceljs` または `xlsx` のESM版

**移行条件**:
- ESM対応版がリリースされたら即座に移行
- 機能互換性を確認してから移行

---

### 7. 正規表現の可読性向上（低リスク）

**対象**: `app/api/drive/files/route.ts`

**現状**:
```typescript
// biome-ignore lint/suspicious/noControlCharactersInRegex: 正規表現の文字クラス範囲指定
.replace(/[\x00-\x1F\x7F]/g, "")
```

**改善案**（必須ではない）:
```typescript
const CONTROL_CHARS = /[\0-\x1f\x7f]/g;
input.replace(CONTROL_CHARS, "");
```

---

## 定期レビュースケジュール

### 3ヶ月ごとのレビュー（カレンダーに登録）

**レビュー担当**: テックリード or セキュリティ担当

**チェックリスト**:
- [ ] 本ドキュメントの各項目の進捗確認
- [ ] 新たな無視コメントが増えていないか確認
- [ ] 解消可能な無視コメントがないか確認
- [ ] ライブラリのESM対応状況確認
- [ ] セキュリティレビュー実施

**次回レビュー予定**: 2026-05-26

---

## 関連ドキュメント

- `docs/backlog/review-suppression-comments.md` - 詳細なレビュー記録
- `docs/backlog/improvement-accessibility.md` - アクセシビリティ改善候補
- `docs/backlog/css-parse-errors.md` - CSS parseエラー（対応不要）
- `docs/lessons/2026-02-26-lint-error-fixes.md` - 修正の教訓

---

## メモ

### なぜこれらを後回しにしたか

1. **セキュリティテスト** - 緊急だが、現状のDOMPurify実装でリスクは低いと判断
2. **react-markdown移行** - 大きな変更であり、現状の動作を優先
3. **キーボード対応** - アクセシビリティ重要だが、マウスユーザーが大半と判断
4. **ESM移行** - ライブラリ側の対応待ち

### リスク受容の条件

- セキュリティレビューを3ヶ月ごとに実施
- XSSテストを追加して脆弱性を早期発見
- 新規機能では `dangerouslySetInnerHTML` を使用しない

---

## 関連ドキュメント

- [Backlog README](./README.md) - Backlog管理ガイド
- [AGENTS.md](../../AGENTS.md) - エージェント行動指針

---

**最終更新**: 2026-03-20 14:35
