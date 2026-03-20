# 無視コメント（biome-ignore）のレビュー記録

> **最終更新**: 2026-03-20
> **作成日**: 2026-02-26
> **優先度**: 🟡 中（技術的負債の管理）
> **関連**: Lintエラー修正, 技術的負債

---

## 概要

Lintエラー修正の過程で、`// biome-ignore` コメントで一時的に対応した箇所があります。本ドキュメントでは、各無視コメントの判断根拠と、将来の対応方針を記録します。

**重要**: これらの無視コメントは「技術的負債」です。定期的な見直し（3ヶ月ごとを推奨）を行い、解消可能なものから対応していく必要があります。

---

## 無視コメント一覧

### 1. 🔴 `noDangerouslySetInnerHtml`（最優先で見直し推奨）

**場所**:
- `app/(authenticated)/meeting-notes/page.tsx`
- `app/(authenticated)/transcripts/page.tsx`

**現状の対応**:
```json
// biome.json
{
  "linter": {
    "rules": {
      "security": {
        "noDangerouslySetInnerHtml": "off"
      }
    }
  }
}
```

**判断根拠**:
- `sanitizeAndFormatMarkdown()` と `formatResult()` でDOMPurifyを使用してサニタイズ済み
- ユーザー入力を直接表示しているわけではなく、LLM出力を整形したもの

**⚠️ リスク**:
- サニタイズ関数の実装ミスや将来の変更による脆弱性の可能性
- DOMPurifyの設定が不十分な場合のXSS攻撃リスク

**推奨される対応**:
1. **短期的（1-2週間以内）**:
   - `sanitizeAndFormatMarkdown()` と `formatResult()` のテストを追加
   - XSSペイロードを含むテストケースを作成

2. **中期的（1-2ヶ月以内）**:
   - Markdownを純粋なReactコンポーネントに変換する実装に変更
   - `dangerouslySetInnerHTML` を使用しないレンダリング方式に移行
   - 例: `react-markdown` を使用した安全なレンダリング

```tsx
// 推奨される実装（将来）
import ReactMarkdown from 'react-markdown';

// dangerouslySetInnerHTML を使わない
<ReactMarkdown>{sanitizedContent}</ReactMarkdown>
```

**確認項目**:
- [ ] DOMPurifyの設定が最新のベストプラクティスに沿っているか
- [ ] 許可するタグ・属性のホワイトリストが適切か
- [ ] 定期的なセキュリティレビュー（四半期ごと）

---

### 2. 🟡 `noGlobalEval`（動的インポートの制限による仕方なし）

**場所**:
- `lib/parsers/document.ts` (3箇所: 59行目, 85行目, 109行目)

**現状の対応**:
```typescript
// biome-ignore lint/security/noGlobalEval: 動的インポートに必要
const pdfParseModule = await eval('import("pdf-parse")');
// biome-ignore lint/security/noGlobalEval: 動的インポートに必要
const mammothModule = await eval('import("mammoth")');
// biome-ignore lint/security/noGlobalEval: 動的インポートに必要
const xlsxModule = await eval('import("xlsx")');
```

**判断根拠**:
- これらのライブラリはCommonJSモジュールで、ESMの動的インポート(`import()`)が正常に動作しない
- サーバーサイドでのみ実行されるコード（クライアントには到達しない）
- Next.jsのAPI Routesでのみ使用

**⚠️ リスク**:
- eval()はコードインジェクションのリスクがある
- ファイルパスが改ざんされた場合の脆弱性

**推奨される対応**:
1. **ライブラリの更新確認**（3ヶ月ごと）:
   - `pdf-parse`, `mammoth`, `xlsx` がESMに対応していないか確認
   - ESM対応版がリリースされたら即座に移行

2. **代替ライブラリの検討**:
   - `pdf-parse` → `pdf-lib` または `unpdf` (ESM対応)
   - `mammoth` → ESM対応のフォーク版を探す
   - `xlsx` → `sheetjs` のESM版または `exceljs`

3. **入力検証の強化**（即座に対応推奨）:
   ```typescript
   // filePathが予期せぬ値でないか確認
   if (!/^[a-zA-Z0-9-_./]+$/.test(filePath)) {
     throw new Error('Invalid file path');
   }
   ```

**確認項目**:
- [ ] 使用ライブラリのバージョンとESM対応状況（3ヶ月ごと）
- [ ] 入力ファイルパスのサニタイズ確認
- [ ] サーバーサイドのみ実行される制限の維持

---

### 3. 🟡 `useExhaustiveDependencies`（設計の問題）

**場所**:
- `components/ui/FeatureChat.tsx`
- `components/ui/FileAttachment.tsx`
- `components/ui/FileUpload.tsx`
- `app/admin/usage/page.tsx`

**現状の対応**:
```typescript
// biome-ignore lint/correctness/useExhaustiveDependencies: 依存関係は安定
const fetchData = useCallback(async () => { ... }, []);

// または
// eslint-disable-next-line react-hooks/exhaustive-deps
```

**判断根拠**:
- `useCallback` で関数をメモ化し、無限ループを防ぐため
- 依存配列に関数を含めると毎回再生成されるため意味がない
- `useRef` で回避可能なケースもあるが、コードが複雑になる

**⚠️ リスク**:
- 依存関係が変わった際に、古い値が使用されるバグの可能性
- コードの意図が明確でないと、将来の開発者が誤解する可能性

**推奨される対応**:
1. **カスタムフックへの分割**（中期的対応）:
   ```typescript
   // 推奨：ロジックをカスタムフックに分離
   function useFetchData() {
     const fetchData = useCallback(async () => { ... }, []);
     return { fetchData };
   }
   ```

2. **React Query (TanStack Query) の導入検討**（長期的対応）:
   - データフェッチングのロジックを大幅に簡略化
   - 依存関係の管理が自動化される

3. **ドキュメントコメントの強化**（即座に対応）:
   - なぜ無視しているかを詳細に記載
   - 依存関係が「安定」である根拠を明記

**確認項目**:
- [ ] 各無視コメントに詳細な理由を記載
- [ ] カスタムフックへのリファクタリング計画

---

### 4. 🟢 `noControlCharactersInRegex`（正規表現の文字クラス）

**場所**:
- `app/api/drive/files/route.ts`

**現状の対応**:
```typescript
// biome-ignore lint/suspicious/noControlCharactersInRegex: 正規表現の文字クラス範囲指定
.replace(/[\x00-\x1F\x7F]/g, "")
```

**判断根拠**:
- 制御文字を除去するための正規表現パターン
- `[\x00-\x1F]` はUnicode範囲指定で、実際には制御文字を対象としている
- セキュリティ上の問題はない

**推奨される対応**:
特に対応不要。ただし、将来的に以下の書き換えも可能:

```typescript
// 代替実装（可読性向上）
const controlChars = /[\0-\x1f\x7f]/g;
```

**確認項目**:
- [ ] 正規表現が正しく制御文字を除去できているかテストで確認済み

---

### 5. 🟢 `noStaticElementInteractions` / `useKeyWithClickEvents`

**場所**:
- `components/layout/SplitPaneLayout.tsx`
- `components/ui/FileUpload.tsx`
- `components/ui/FileAttachment.tsx`

**現状の対応**:
```tsx
{/* biome-ignore lint/a11y/noStaticElementInteractions: ドラッグ&ドロップエリアはdivで実装 */}
<div
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
```

**判断根拠**:
- ドラッグ&ドロップはマウス操作が前提
- キーボードでのドラッグ&ドロップは標準的でない
- 代替のキーボード操作（ファイル選択ダイアログ）を提供

**⚠️ リスク**:
- キーボードユーザーの利便性が低下
- WCAG 2.1の「キーボード操作可能」要件に違反する可能性

**推奨される対応**:
1. **代替キーボード操作の提供**（中期的対応）:
   - ドラッグ&ドロップエリアにフォーカス可能にする
   - Enter/Spaceキーでファイル選択ダイアログを開く

2. **ARIA属性の強化**（即座に対応推奨）:
   ```tsx
   <div
     role="button"
     tabIndex={0}
     aria-label="ファイルをドロップするかEnterキーで選択"
     onKeyDown={(e) => e.key === 'Enter' && openFileDialog()}
   >
   ```

**確認項目**:
- [ ] キーボードでの代替操作が可能か
- [ ] スクリーンリーダーでの操作性

---

### 6. 🟢 `noArrayIndexKey`（固定長リスト）

**場所**:
- `components/ui/slider.tsx`
- `app/admin/programs/[id]/page.tsx`

**現状の対応**:
```tsx
// biome-ignore lint/suspicious/noArrayIndexKey: スライダーのThumbは順序固定
key={index}
```

**判断根拠**:
- スライダーのThumbは順序が変わらない
- 追加・削除・並び替えが発生しない
- indexをkeyとして使用しても問題ない

**推奨される対応**:
特に対応不要。ただし、以下の場合は再検討:
- リストが動的になる（並び替え・追加・削除）
- コンポーネントに状態が追加される

**確認項目**:
- [ ] リストが静的（順序変更なし）であることを確認済み

---

## 優先度別対応ロードマップ

### 🔴 高優先度（1-2週間以内）

1. **`noDangerouslySetInnerHtml`**
   - XSSペイロードテストの追加
   - サニタイズ関数のセキュリティレビュー

### 🟡 中優先度（1-2ヶ月以内）

2. **`useExhaustiveDependencies`**
   - カスタムフックへのリファクタリング計画
   - React Query導入の検討

3. **`noStaticElementInteractions`**
   - ドラッグ&ドロップのキーボード対応
   - ARIA属性の強化

### 🟢 低優先度（3ヶ月ごとのレビュー）

4. **`noGlobalEval`**
   - ESM対応ライブラリの更新確認

5. **`noControlCharactersInRegex`** / `noArrayIndexKey`
   - 特別な対応不要（継続監視のみ）

---

## 定期レビューチェックリスト

**3ヶ月ごとに実施**:

- [ ] 無視コメントの再評価（解消可能なものは対応）
- [ ] 使用ライブラリの更新確認（ESM対応状況）
- [ ] セキュリティレビュー（サニタイズ関数）
- [ ] アクセシビリティテスト（キーボード操作）

**レビュー担当**: テックリードまたはセキュリティ担当

---

## 参考

- [React Hooks依存配列の完全ガイド](https://react.dev/reference/react/useCallback)
- [DOMPurify設定ベストプラクティス](https://github.com/cure53/DOMPurify/wiki/Default-Templates-and-Hooks)
- [WCAG 2.1 キーボード操作](https://www.w3.org/WAI/WCAG21/Understanding/keyboard)
- [ESM対応ライブラリ検索](https://esm.sh/)

---

## 関連ドキュメント

- [Backlog README](./README.md) - Backlog管理ガイド
- [AGENTS.md](../../AGENTS.md) - エージェント行動指針

---

**最終更新**: 2026-03-20 14:35
