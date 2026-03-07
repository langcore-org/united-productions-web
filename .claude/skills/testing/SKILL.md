---
name: testing
description: テスト戦略と実装。E2Eテスト（Playwright）とユニット/統合テスト（Vitest）を統合サポート。ユーザーが「テスト」「E2E」「Playwright」「Vitest」「カバレッジ」「品質保証」などに関する質問や実装要望をした時に使用。
---

# Testing

Webアプリケーションのテスト統合スキル。E2Eテスト（Playwright）とユニット/統合テスト（Vitest）を網羅。

## When to use

- 「テスト」「E2E」「テストコード」などの実装時
- 「Playwright」「Vitest」に関する質問時
- 「カバレッジ」「品質保証」などの発言時
- テスト戦略の策定時
- テストが失敗、動作しない時
- CI/CD へのテスト統合時

## Quick Start

```bash
# ユニットテスト実行
npm run test

# E2Eテスト実行
npm run test:e2e

# カバレッジ付き
npm run test:coverage

# 特定ファイルのみ
npx playwright test tests/e2e/auth.spec.ts
npm run test -- lib/utils.test.ts
```

## Project Configuration

### テスト構成

| 種別 | ツール | 用途 |
|------|--------|------|
| E2E | Playwright | ブラウザテスト |
| ユニット | Vitest | 関数・コンポーネントテスト |

### ファイル構成

```
tests/
├── e2e/              # Playwright E2Eテスト
│   ├── auth.spec.ts
│   ├── chat.spec.ts
│   └── features/
├── unit/             # Vitest ユニットテスト
│   └── lib/
└── integration/      # 統合テスト
playwright.config.ts  # Playwright設定
vitest.config.ts      # Vitest設定
```

---

## チェックリストテンプレート

### テスト作成前チェックリスト

```markdown
## テスト実装前

- [ ] テストの種別を決定（E2E / ユニット / 統合）
- [ ] テスト対象の機能・要件を明確にした
- [ ] 正常系・異常系のケースを洗い出した
- [ ] モックが必要か判断した
- [ ] テストデータの準備方法を決定した
```

### E2Eテストレビューチェックリスト

```markdown
## E2Eテストレビュー

- [ ] データ-testidが適切に設定されている
- [ ] 適切な待機処理が入っている（toBeVisible等）
- [ ] テストが独立している（順序依存していない）
- [ ] テスト前後でクリーンアップしている
- [ ] 環境依存の値（日時等）を適切に扱っている
```

### ユニットテストレビューチェックリスト

```markdown
## ユニットテストレビュー

- [ ] 純粋関数を優先してテストしている
- [ ] モックは必要最小限にしている
- [ ] テスト名が明確（「〜すべき」「〜すること」）
- [ ] 境界値・エッジケースをカバーしている
- [ ] エラーケースもテストしている
```

---

## 対話例：よくあるシナリオ

### シナリオ1: 新機能のテスト戦略

```
ユーザー: 「新しいチャット機能のテストを作りたい"

AI: 「テスト戦略を立てましょう。

【確認事項】
1. テストの範囲は？
   A. フロントエンドのみ
   B. APIも含む統合テスト
   C. フルE2Eテスト

2. 重要な機能は？
   - メッセージ送信
   - ストリーミング表示
   - エラーハンドリング

まずはE2Eテストから始めますか？」

→ 「E2Eでメッセージ送信をテストしたい"

AI: 「承知しました。以下のテストを作成します：

```typescript
test('メッセージを送信して応答が表示される', async ({ page }) => {
  // 1. チャットページへ移動
  // 2. メッセージ入力
  // 3. 送信ボタンクリック
  // 4. 応答が表示されることを確認
});
```

作成しますか？」
```

### シナリオ2: テストが不安定（flaky）

```
ユーザー: 「テストが時々失敗するんだけど..."

AI: 「flakyテストの原因を調査します。

一般的な原因：
1. 適切な待機処理がない
2. 非同期処理の完了を待っていない
3. 環境依存の値（日時、ランダム値等）
4. テスト間の依存関係

テストコードを確認させてください。」

[コード確認]

AI: 「問題が見つかりました。

【問題】
- 要素の表示を待たずにクリックしている
- API応答を待たずにアサーションしている

【修正】
```typescript
// Before
await page.click('[data-testid="send"]');
await expect(page.locator('[data-testid="message"]')).toHaveText('Hello');

// After
await page.click('[data-testid="send"]');
await expect(page.locator('[data-testid="message"]')).toBeVisible();
await expect(page.locator('[data-testid="message"]')).toHaveText('Hello');
```

修正してよろしいですか？」
```

### シナリオ3: カバレッジ向上

```
ユーザー: 「テストカバレッジを上げたい"

AI: 「現在のカバレッジを確認します。

```bash
npm run test:coverage
```

[結果確認]

AI: 「現在のカバレッジ状況：
- 全体: 65%
- lib/utils.ts: 40%
- components/ui/: 30%

優先的にカバーすべき部分：
1. lib/utils.ts（複雑なロジック）
2. hooks/use-chat.ts（カスタムフック）

どこから対応しますか？」
```

---

## E2E Testing (Playwright)

### 基本的なテスト構造

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("認証", () => {
  test.beforeEach(async ({ page }) => {
    // テスト前のセットアップ
    await page.goto("/login");
  });

  test("ログインページが表示される", async ({ page }) => {
    await expect(page).toHaveTitle(/ログイン/);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test("Googleログインでリダイレクトされる", async ({ page }) => {
    await page.click('[data-testid="google-login"]');
    await expect(page).toHaveURL(/accounts.google.com/);
  });
});
```

### ページオブジェクトパターン

```typescript
// tests/e2e/pom/ChatPage.ts
export class ChatPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/chat");
  }

  async sendMessage(text: string) {
    await this.page.fill('[data-testid="chat-input"]', text);
    await this.page.click('[data-testid="send-button"]');
  }

  async getLastMessage() {
    return this.page.locator('[data-testid="message"]').last();
  }

  async expectMessageVisible(text: string) {
    await expect(this.page.locator('[data-testid="message"]')
      .filter({ hasText: text }))
      .toBeVisible();
  }
}

// 使用例
test("メッセージを送信できる", async ({ page }) => {
  const chatPage = new ChatPage(page);
  await chatPage.goto();
  await chatPage.sendMessage("Hello");
  await chatPage.expectMessageVisible("Hello");
});
```

### APIモック

```typescript
test("APIエラー時の表示", async ({ page }) => {
  // APIをモック
  await page.route("/api/chat", async (route) => {
    await route.fulfill({
      status: 500,
      body: JSON.stringify({ error: "Server error" }),
    });
  });

  await page.goto("/chat");
  await page.fill('[data-testid="input"]', "test");
  await page.click('[data-testid="send"]');

  await expect(page.locator('[data-testid="error"]')).toHaveText("エラーが発生しました");
});
```

---

## Unit Testing (Vitest)

### 基本的なテスト

```typescript
// tests/unit/lib/utils.test.ts
import { describe, it, expect } from "vitest";
import { formatDate, truncate } from "@/lib/utils";

describe("formatDate", () => {
  it("日付を日本語形式でフォーマットする", () => {
    const result = formatDate("2024-01-15");
    expect(result).toBe("2024年1月15日");
  });

  it("無効な日付の場合は空文字を返す", () => {
    const result = formatDate("invalid");
    expect(result).toBe("");
  });
});
```

### Reactコンポーネントテスト

```typescript
// tests/unit/components/Button.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("クリック時にonClickが呼ばれる", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### モックの使用

```typescript
// tests/unit/lib/api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// fetchをモック
global.fetch = vi.fn();

describe("fetchUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("ユーザー情報を取得する", async () => {
    const mockUser = { id: "1", name: "Taro" };
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const result = await fetchUser("1");
    expect(result).toEqual(mockUser);
  });
});
```

---

## Test Organization

### テストファイルの命名規則

| 種別 | 命名規則 | 例 |
|------|---------|-----|
| E2E | `*.spec.ts` | `auth.spec.ts` |
| ユニット | `*.test.ts` | `utils.test.ts` |
| コンポーネント | `*.test.tsx` | `Button.test.tsx` |

### テストカバレッジ目標

| 対象 | 目標カバレッジ |
|------|--------------|
| ユーティリティ関数 | 80%+ |
| API Routes | 70%+ |
| 複雑なコンポーネント | 60%+ |
| 単純なUIコンポーネント | 省略可 |

---

## Best Practices

### DO

- ✅ `data-testid` を重要な要素に付与
- ✅ テストは独立させる（順序依存にしない）
- ✅ テスト前後でクリーンアップ
- ✅ 意味のあるアサーションを書く

### DON'T

- ❌ 実装の詳細をテスト（どうやってではなく、何を）
- ❌ 外部APIに実際にリクエスト（モック使用）
- ❌ 長いテスト（1テスト1アサーションを心がける）
- ❌ スリープで待機（Playwrightの自動待機を活用）

---

## CI Integration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run test
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## References

- [Playwright Documentation](https://playwright.dev/docs)
- [Vitest Documentation](https://vitest.dev/guide/)
- [Testing Library](https://testing-library.com/docs/)
- Project: `playwright.config.ts`, `vitest.config.ts`, `tests/`
