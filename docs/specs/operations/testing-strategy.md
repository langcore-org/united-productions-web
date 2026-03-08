# テスト戦略

> **テストの種類と方針**

## テストピラミッド

```
      /\
     /  \  E2E (少ない)
    /____\
   /      \  統合テスト
  /________\
 /          \  単体テスト (多い)
/____________\
```

## 単体テスト

| 対象 | フレームワーク | 配置 |
|-----|--------------|------|
| ユーティリティ関数 | Vitest | `lib/**/*.test.ts` |
| コンポーネント | React Testing Library | `components/**/*.test.tsx` |
| APIハンドラ | Vitest | `app/api/**/*.test.ts` |

### 実行

```bash
npm run test        # 単体テスト
npm run test:watch  # ウォッチモード
```

## 統合テスト

- APIエンドポイントの統合テスト
- DB操作を含むテスト
- テストDB: SQLite（インメモリ）

## E2Eテスト

- **フレームワーク**: Playwright
- **範囲**: クリティカルパスのみ
- **配置**: `tests/e2e/`

### カバレッジ対象

| 機能 | テスト内容 |
|-----|-----------|
| 認証 | ログイン/ログアウトフロー |
| 議事録 | 作成→編集→削除 |
| 書き起こし | アップロード→整形→エクスポート |

### 実行

```bash
npm run test:e2e      # ヘッドレス
npm run test:e2e:ui   # UIモード
```

詳細: [guides/testing-e2e.md](../guides/testing-e2e.md)

## 品質ゲート

| チェック | ツール | タイミング |
|---------|--------|-----------|
| 型チェック | TypeScript | ビルド前 |
| Lint | ESLint | コミット前 |
| フォーマット | Prettier | 保存時 |
| テスト | Vitest | PR時 |

## カバレッジ目標

| 種別 | 目標 |
|-----|------|
| 単体テスト | 70%以上 |
| 統合テスト | クリティカルパスをカバー |
| E2E | 主要ユーザーフロー |

## 関連ファイル

- `vitest.config.ts` - 単体テスト設定
- `playwright.config.ts` - E2Eテスト設定
- `.github/workflows/test.yml` - CI設定
