# ADコパイロット リファクタリング計画

## 概要

調査日: 2026年2月19日  
調査範囲: コードベース全体（並列5視点調査）

---

## 🔴 P0: 即座に対応（クリティカル）

### 1. XSS脆弱性の修正
**優先度**: 🔴🔴🔴 **最高**  
**場所**: `app/(authenticated)/meeting-notes/page.tsx`  
**問題**: LLM出力をサニタイズせずにHTML挿入

```tsx
// ❌ 危険
dangerouslySetInnerHTML={{
  __html: result.replace(/### (.*)/g, '<h3...>$1</h3>')
}}

// ✅ 修正
import DOMPurify from 'isomorphic-dompurify';

const sanitizedHtml = DOMPurify.sanitize(
  formatMarkdown(result),
  { ALLOWED_TAGS: ['h1','h2','h3','strong','li','span','div'] }
);
```

---

### 2. CSPヘッダー設定
**優先度**: 🔴🔴🔴 **最高**  
**場所**: `next.config.ts`

```typescript
async headers() {
  return [{
    source: "/:path*",
    headers: [{
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
      ].join("; ")
    }]
  }];
}
```

---

### 3. Error Boundary共通化
**優先度**: 🔴🔴 **高**  
**場所**: 6つの `error.tsx` ファイル  
**工数**: 2時間

```tsx
// components/error/ErrorBoundary.tsx
export function ErrorBoundary({ error, reset, context }: ErrorBoundaryProps) {
  // 共通化されたエラーUI
}

// 各ページでの使用
export default function Error(props) {
  return <ErrorBoundary {...props} context="議事録" />;
}
```

---

### 4. LLMError重複定義の統合
**優先度**: 🔴🔴 **高**  
**場所**: `lib/llm/errors.ts` と `lib/api/utils.ts`

**対応**:
- `lib/api/utils.ts` の `LLMError` を削除
- `lib/llm/errors.ts` のものを統一使用

---

## 🟠 P1: 1週間以内（重要）

### 5. ファイルアップロード検証
**優先度**: 🟠🟠 **高**  
**場所**: `app/api/drive/files/route.ts`

```typescript
const ALLOWED_TYPES = ["text/plain", "text/markdown", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;

function validateFile(file: File): FileValidationResult {
  if (file.size > MAX_SIZE) return { valid: false, error: "ファイルサイズ超過" };
  if (!ALLOWED_TYPES.includes(file.type)) return { valid: false, error: "無効なファイルタイプ" };
  return { valid: true };
}
```

---

### 6. ResearchChatコンポーネント分割
**優先度**: 🟠🟠 **高**  
**場所**: `components/research/ResearchChat.tsx` (934行)  
**工数**: 2日

```
components/research/
├── ResearchChat.tsx          # メイン（200行程度）
├── EmptyState.tsx            # 空状態
├── ChatMessage.tsx           # メッセージ表示
├── StreamingMessageBubble.tsx # ストリーミング
└── hooks/
    └── useResearchChat.ts    # ロジック抽出
```

---

### 7. API Routes共通化
**優先度**: 🟠 **中**  
**場所**: 全API Routes

```typescript
// lib/api/withHandler.ts
export function createApiHandler<T>(
  handler: (req: NextRequest, data: T, userId: string) => Promise<NextResponse>,
  options: { schema?: ZodSchema<T> } = {}
) {
  return async (request: NextRequest) => {
    // 認証チェック
    // バリデーション
    // エラーハンドリング
    return handler(request, data, userId);
  };
}
```

---

### 8. SplitPaneLayoutパフォーマンス修正
**優先度**: 🟠 **中**  
**場所**: `components/layout/SplitPaneLayout.tsx`

```typescript
// useRefを使用して依存配列から除外
const isDraggingRef = useRef(isDragging);
useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

const handleMouseMove = useCallback((e: MouseEvent) => {
  if (!isDraggingRef.current) return;
  // ...
}, [minLeftWidth, minRightWidth]); // 状態を除外
```

---

## 🟡 P2: 1ヶ月以内（推奨）

### 9. 型定義の統一
**優先度**: 🟡🟡 **中**  
**対象**: `types/llm.ts` と `lib/llm/types.ts`

- `types/llm.ts` をソースオブトゥルースに統合
- プロバイダーID命名を統一（`gemini-2.5` vs `gemini-25`）

### 10. テスト基盤導入
**優先度**: 🟡🟡 **中**  
**工数**: 1日

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

### 11. FeatureCard共通化
**優先度**: 🟡 **低**  
**場所**: `meeting-notes/page.tsx`, `transcripts/page.tsx`

```typescript
// components/ui/FeatureCard.tsx
export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-4 rounded-xl bg-white border border-gray-200">
      <div className="w-10 h-10 rounded-lg bg-black/10 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
```

### 12. Markdown変換関数共通化
**優先度**: 🟡 **低**

```typescript
// lib/markdown.ts
export function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/### (.*)/g, '<h3 class="...">$1</h3>')
    .replace(/## (.*)/g, '<h2 class="...">$1</h2>')
    // ...
}
```

---

## 🟢 P3: 将来対応（改善）

### 13. アクセシビリティ対応
**工数**: 3日
- `aria-label` 追加
- キーボードナビゲーション対応
- フォーカスインジケーター改善

### 14. i18n国際化基盤
**工数**: 2日

```typescript
// next-intl 導入
import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('MeetingNotes');
  return <h1>{t('title')}</h1>;
}
```

### 15. キャッシュ戦略強化
**工数**: 1日

```typescript
// lib/cache/research-cache.ts
export async function getCachedResearch(
  userId: string,
  agentType: string,
  query: string
): Promise<ResearchResult | null> {
  const key = `research:${userId}:${agentType}:${hash(query)}`;
  return redis.get(key);
}
```

---

## 📊 改善効果予測

| カテゴリ | 改善項目数 | 期待効果 |
|---------|-----------|---------|
| セキュリティ | 4件 | XSS/API攻撃防止 |
| パフォーマンス | 3件 | レンダリング最適化 |
| 保守性 | 5件 | コード重複削減 |
| 品質 | 3件 | テスト・型安全性 |

---

## 🎯 推奨実装順序

```
Week 1: P0項目（XSS, CSP, Error Boundary, LLMError統合）
Week 2: P1項目（ファイル検証, ResearchChat分割, API共通化）
Week 3: P2項目（型統一, テスト導入, FeatureCard共通化）
Month 2-3: P3項目（アクセシビリティ, i18n, キャッシュ強化）
```

---

## 📝 メモ

- 各P0項目は1-2時間で完了可能
- P1のResearchChat分割は最も工数がかかる（2日）
- テスト導入後はカバレッジ70%を目標に
- アクセシビリティはWCAG 2.1 Level AAを目標に
