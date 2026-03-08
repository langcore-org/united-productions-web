import { expect, test } from "@playwright/test";

/**
 * スモークテスト
 *
 * 基本的なページアクセスと認証状態の確認を行います。
 * これらのテストは auth.setup.ts で保存された storageState を使用します。
 */

test.describe("認証済みユーザー", () => {
  test.skip("ダッシュボードにアクセスできる", async ({ page }) => {
    await page.goto("/");

    // ページが正常に表示されることを確認
    await expect(page).toHaveURL("/");

    // AI Hubのロゴまたはタイトルが表示されていることを確認
    const title = page.locator('h1, [class*="text-4xl"]').first();
    await expect(title).toBeVisible();
  });

  test.skip("リサーチページにアクセスできる", async ({ page }) => {
    await page.goto("/research");

    // ページが正常に表示されることを確認
    await expect(page).toHaveURL("/research");

    // リサーチ関連の要素が表示されていることを確認
    await expect(page.locator("body")).toContainText("リサーチ");
  });

  test.skip("議事録ページにアクセスできる", async ({ page }) => {
    await page.goto("/meeting-notes");

    // ページが正常に表示されることを確認
    await expect(page).toHaveURL("/meeting-notes");

    // 議事録関連の要素が表示されていることを確認
    await expect(page.locator("body")).toContainText("議事録");
  });

  test.skip("起こし・NAページにアクセスできる", async ({ page }) => {
    await page.goto("/transcripts");

    // ページが正常に表示されることを確認
    await expect(page).toHaveURL("/transcripts");

    // 起こし関連の要素が表示されていることを確認
    await expect(page.locator("body")).toContainText("起こし");
  });

  test.skip("設定ページにアクセスできる", async ({ page }) => {
    await page.goto("/settings");

    // ページが正常に表示されることを確認
    await expect(page).toHaveURL("/settings");

    // 設定関連の要素が表示されていることを確認
    await expect(page.locator("body")).toContainText("設定");
  });

  test.skip("サイドバーナビゲーションが機能する", async ({ page }) => {
    await page.goto("/");

    // サイドバーが表示されていることを確認
    const sidebar = page.locator('aside, [class*="sidebar"], nav').first();
    await expect(sidebar).toBeVisible();

    // 各ナビゲーションリンクをクリックして遷移を確認
    const navLinks = [
      { selector: "text=議事録", url: "/meeting-notes" },
      { selector: "text=起こし", url: "/transcripts" },
      { selector: "text=リサーチ", url: "/research" },
      // { selector: 'text=ロケスケ', url: '/schedules' }, // 削除
    ];

    for (const link of navLinks) {
      // リンクをクリック
      await page.click(link.selector);

      // 遷移を確認
      await expect(page).toHaveURL(link.url);

      // 少し待機（ページ遷移のアニメーションなど）
      await page.waitForTimeout(500);
    }
  });
});

test.describe("未認証ユーザー", () => {
  // 未認証状態でテスト（storageStateを使用しない）
  test.use({ storageState: undefined });

  test.skip("保護されたページにアクセスするとログインページにリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/research");

    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
