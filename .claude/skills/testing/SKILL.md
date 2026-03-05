---
name: testing
description: テスト戦略と実装。E2Eテスト（Playwright）とユニット/統合テスト（Vitest）を統合サポート。
---

# Testing

> **E2E & ユニットテスト統合スキル - Playwright + Vitest**

## Description

Webアプリケーションのテスト統合スキル。E2Eテスト（Playwright）とユニット/統合テスト（Vitest）を網羅。

## When to use

- E2Eテストの作成（Playwright）
- ユニットテストの作成（Vitest）
- テスト戦略の策定
- CI/CD へのテスト統合

## Best Practices

### E2E Testing (Playwright)

- ユーザーフロー中心のテスト設計
- 安定したセレクタ使用（data-testid）
- 適切な待機処理（await expect().toBeVisible()）
- ページオブジェクトパターンの活用
- 並列実行の最適化

### Unit Testing (Vitest)

- 純粋関数のテストを優先
- モックは必要最小限に
- テストの独立性確保
- カバレッジ目標の設定

### Test Organization

```
tests/
├── e2e/              # Playwright E2Eテスト
│   ├── auth.spec.ts
│   ├── chat.spec.ts
│   └── features/
├── unit/             # Vitest ユニットテスト
│   ├── lib/
│   └── components/
└── integration/      # 統合テスト
```

### Common Patterns

```typescript
// Playwright - ページナビゲーション
test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/dashboard');
});

// Vitest - ユーティリティ関数
test('formatDate returns correct string', () => {
  const result = formatDate('2024-01-01');
  expect(result).toBe('2024年1月1日');
});
```

## Commands

```bash
# Playwright
npx playwright test              # 全テスト実行
npx playwright test --ui        # UIモード
npx playwright test --debug     # デバッグモード
npx playwright codegen          # テストコード生成

# Vitest
npm run test                    # テスト実行
npm run test -- --coverage     # カバレッジ付き
npm run test -- --watch        # ウォッチモード
```

## References

- https://playwright.dev/docs
- https://vitest.dev/guide/
