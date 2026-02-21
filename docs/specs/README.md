# specs/ - 全体仕様

> **永続的に更新し続けるドキュメント群**
> 
> **最終更新**: 2026-02-21 17:16

## 更新ルール

- 仕様変更があれば**即座に更新**
- 更新時は変更履歴をファイル末尾に記録
- 削除は禁止（過去バージョンとして保持）

## ディレクトリ構成

```
specs/
├── README.md                    # 本ファイル
│
├── architecture/                # 設計・構成（4ファイル）
│   ├── system-architecture.md   # 全体アーキテクチャ
│   ├── component-design.md      # コンポーネント設計
│   ├── data-flow.md             # データフロー
│   └── state-management.md      # 状態管理
│
├── api-integration/             # API・外部連携（6ファイル）
│   ├── api-specification.md     # REST API定義
│   ├── database-schema.md       # DBスキーマ設計
│   ├── llm-integration.md       # LLM統合
│   ├── prompt-engineering.md    # プロンプト設計
│   ├── authentication.md        # 認証・認可
│   └── external-services.md     # 外部サービス連携
│
└── operations/                  # 運用・品質（7ファイル）
    ├── deployment-guide.md      # デプロイ構成
    ├── logging-monitoring.md    # ログ・監視設計
    ├── error-handling.md        # エラーハンドリング
    ├── security.md              # セキュリティ
    ├── performance.md           # パフォーマンス
    ├── testing-strategy.md      # テスト戦略
    └── change-history.md        # 変更履歴
```

## 各ディレクトリの役割

| ディレクトリ | 内容 | 主な更新タイミング |
|-------------|------|------------------|
| `architecture/` | アプリケーションの構造と設計 | アーキテクチャ変更時 |
| `api-integration/` | API、DB、外部サービス連携 | 外部接続変更時 |
| `operations/` | 運用、監視、品質管理 | インフラ・運用変更時 |

## 関連ガイド

| 内容 | 参照先 |
|-----|--------|
| 環境構築手順 | [guides/setup/](../guides/setup/) |
| 開発ガイド | [guides/development/](../guides/development/) |
| API変更履歴 | [api-changelog.md](./api-changelog.md) |
| API詳細実装 | `app/api/` ディレクトリ |
| スキーマ定義 | `prisma/schema.prisma` |
| コンポーネント実装 | `components/` ディレクトリ |
| カスタムフック | `hooks/` ディレクトリ |
