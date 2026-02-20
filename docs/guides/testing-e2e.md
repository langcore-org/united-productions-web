# E2Eテストガイド

Playwrightを使用したE2Eテストの設定と実行方法。

## 概要

- **フレームワーク**: [Playwright](https://playwright.dev/)
- **テストディレクトリ**: `tests/e2e/`
- **認証方式**: Preview環境専用のメール/パスワード認証

## ディレクトリ構造

```
tests/e2e/
├── .auth/
│   └── user.json          # 自動生成（ログイン状態の保存）
├── auth.setup.ts          # 認証セットアップ
└── smoke.spec.ts          # スモークテスト
```

## クイックスタート

### 1. ブラウザインストール

```bash
npx playwright install
```

### 2. 環境変数設定

```bash
# .env.local
VERCEL_ENV=preview
PREVIEW_E2E_USER=test@example.com
PREVIEW_E2E_PASS=yourpassword
```

### 3. テスト実行

```bash
# 全テスト実行
npm run test:e2e

# UIモード
npm run test:e2e:ui

# 特定のテストのみ
npm run test:e2e -- smoke.spec.ts

# デバッグモード
npm run test:e2e:debug
```

## 認証フロー

### 自動ログイン（推奨）

`auth.setup.ts` で一度ログインし、以降のテストでセッションを再利用：

```typescript
// tests/e2e/example.spec.ts
import { test } from '@playwright/test';

// storageStateが自動的に適用される
test('ダッシュボードにアクセス', async ({ page }) => {
  await page.goto('/');
  // 既にログイン済み
});
```

### 手動ログイン

```typescript
import { test } from '@playwright/test';

test.use({ storageState: undefined }); // 自動ログインを無効化

test('ログインテスト', async ({ page }) => {
  await page.goto('/preview-login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
});
```

## テスト作成

### 基本パターン

```typescript
import { test, expect } from '@playwright/test';

test.describe('機能名', () => {
  test('テストケース名', async ({ page }) => {
    // Arrange
    await page.goto('/path');
    
    // Act
    await page.click('button');
    
    // Assert
    await expect(page).toHaveURL('/new-path');
    await expect(page.locator('h1')).toContainText('Expected');
  });
});
```

### 便利なマッチャー

```typescript
// URL確認
await expect(page).toHaveURL('/dashboard');

// 要素の表示確認
await expect(page.locator('h1')).toBeVisible();
await expect(page.locator('h1')).toContainText('Title');

// 要素の数
await expect(page.locator('.item')).toHaveCount(5);

// 入力値
await expect(page.locator('input')).toHaveValue('test');
```

### モバイル対応

```typescript
import { devices } from '@playwright/test';

test.use({
  ...devices['Pixel 5'],
});

test('モバイル表示', async ({ page }) => {
  await page.goto('/');
  // モバイル表示でのテスト
});
```

## CI/CD統合

### GitHub Actions

```yaml
name: E2E Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - run: npm ci
      
      - run: npx playwright install --with-deps
      
      - run: npm run build
      
      - run: npm run test:e2e
        env:
          VERCEL_ENV: preview
          PREVIEW_E2E_USER: ${{ secrets.PREVIEW_E2E_USER }}
          PREVIEW_E2E_PASS: ${{ secrets.PREVIEW_E2E_PASS }}
          
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Vercel Preview環境でのテスト

```yaml
name: E2E Tests on Preview
on:
  deployment_status:
jobs:
  test:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ github.event.deployment_status.target_url }}
          PREVIEW_E2E_USER: ${{ secrets.PREVIEW_E2E_USER }}
          PREVIEW_E2E_PASS: ${{ secrets.PREVIEW_E2E_PASS }}
```

## デバッグ

### スクリーンショット

```typescript
test('テスト', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'screenshot.png' });
});
```

### トレース

```bash
# トレース付きで実行
npx playwright test --trace on

# トレースビューアで開く
npx playwright show-trace trace.zip
```

### デバッグモード

```bash
# ヘッドレスなしで実行
npx playwright test --headed

# ステップ実行
npx playwright test --debug
```

## ベストプラクティス

1. **テストの独立性**
   - 各テストは独立して実行できるように
   - `test.beforeEach` でセットアップ

2. **セレクターの安定性**
   - `data-testid` 属性を使用
   - テキストやクラス名に依存しすぎない

3. **待機の適切な使用**
   - `await page.waitForSelector()` は避ける
   - アサーションの自動待機を活用

4. **並列実行**
   - テスト間で干渉しないように
   - 固有のデータを使用

## 参考リンク

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Next.js Testing](https://nextjs.org/docs/testing)
