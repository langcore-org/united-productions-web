import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * 認証セットアップテスト
 * 
 * Preview環境でのログインを実行し、storageStateを保存します。
 * 以降のテストはこのstorageStateを使用してログイン状態を再利用します。
 */

const authFile = path.join(__dirname, '.auth/user.json');

// 環境変数から認証情報を取得
const PREVIEW_E2E_USER = process.env.PREVIEW_E2E_USER || 'test@example.com';
const PREVIEW_E2E_PASS = process.env.PREVIEW_E2E_PASS || 'testpassword';

setup('Preview環境にログイン', async ({ page }) => {
  // 1. プレビューログインページにアクセス
  await page.goto('/preview-login');
  
  // 2. ページがロードされたことを確認（Preview環境判定メッセージが出ていないか確認）
  const heading = page.locator('h1');
  await expect(heading).toContainText('Preview Login');
  
  // 3. フォームに入力
  await page.fill('input[name="email"]', PREVIEW_E2E_USER);
  await page.fill('input[name="password"]', PREVIEW_E2E_PASS);
  
  // 4. ログインボタンをクリック
  await page.click('button[type="submit"]');
  
  // 5. ログイン成功を確認（ダッシュボードへリダイレクト）
  await expect(page).toHaveURL('/');
  
  // 6. ダッシュボードの要素が表示されていることを確認
  await expect(page.locator('body')).toContainText('AI Hub');
  
  // 7. 認証状態を保存
  await page.context().storageState({ path: authFile });
  
  console.log(`✅ 認証状態を保存しました: ${authFile}`);
});
