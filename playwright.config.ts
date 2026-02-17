import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Preview環境でのE2Eテスト用設定
 * - auth.setup.ts で事前にログインし、storageStateを保存
 * - 以降のテストは保存されたstorageStateを使用
 */

// Base URLの決定（環境変数から、またはデフォルト）
const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  
  // テスト実行の並列度
  fullyParallel: true,
  
  // テスト失敗時のリトライ回数
  retries: process.env.CI ? 2 : 0,
  
  // 並列実行ワーカー数
  workers: process.env.CI ? 1 : undefined,
  
  // レポーター設定
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  
  // グローバル設定
  use: {
    // ベースURL
    baseURL,
    
    // 全テストで共通のstorageStateを使用（auth.setup.tsで生成）
    storageState: 'tests/e2e/.auth/user.json',
    
    // トレース設定（失敗時のみ保存）
    trace: 'on-first-retry',
    
    // スクリーンショット設定（失敗時のみ保存）
    screenshot: 'only-on-failure',
    
    // ビデオ設定（失敗時のみ保存）
    video: 'on-first-retry',
    
    // デフォルトタイムアウト
    actionTimeout: 15000,
    navigationTimeout: 15000,
  },

  // プロジェクト設定
  projects: [
    // 1. 認証セットアッププロジェクト（必ず最初に実行）
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      // setupプロジェクトではstorageStateを使用しない（作成するため）
      use: {
        storageState: undefined,
      },
    },
    
    // 2. メインプロジェクト（Chromium）
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // ビューポートサイズ
        viewport: { width: 1280, height: 720 },
      },
      // setupプロジェクトに依存
      dependencies: ['setup'],
    },
    
    // 3. モバイルプロジェクト（オプション）
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
      dependencies: ['setup'],
    },
  ],

  // ローカル開発サーバー設定（PLAYWRIGHT_BASE_URL未設定時のみ）
  webServer: process.env.PLAYWRIGHT_BASE_URL || process.env.VERCEL_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
