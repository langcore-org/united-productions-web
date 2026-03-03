# Claude Skills カタログ - UPエージェント開発向け

> **調査日**: 2026-03-02  
> **調査対象**: skillsdir.dev / playbooks.com / mcpmarket.com / GitHub  
> **対象プロジェクト**: UPエージェント（AI Hub）- Next.js + TypeScript + Prisma + Playwright + Vercel + xAI

---

## 📋 概要

本ドキュメントは、UPエージェント開発に有用なClaude Skills（およびKimi Code CLIで使用可能なスキル）を網羅的に調査・整理したものです。

### プロジェクト技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | Next.js 14+ (App Router), React, TypeScript |
| スタイリング | Tailwind CSS, shadcn/ui |
| バックエンド | Next.js API Routes, Server Actions |
| データベース | PostgreSQL, Prisma ORM |
| 認証 | NextAuth.js v5 |
| テスト | Playwright (E2E), Vitest |
| デプロイ | Vercel |
| LLM | xAI (Grok) 直接API呼び出し |
| コード品質 | Biome |

---

## 🎯 優先度別スキル一覧

### 🔴 高優先度（即座に導入推奨）

#### 1. react-best-practices
- **提供元**: Vercel公式
- **URL**: https://vercel.com/blog/introducing-react-best-practices
- **GitHub**: https://github.com/vercel/react-best-practices
- **概要**: 10年以上のReact/Next.js最適化知見を凝縮した構造化リポジトリ
- **含まれる内容**:
  - Hooksのベストプラクティス
  - コンポーネントパターン
  - 状態管理
  - パフォーマンス最適化
- **プロジェクト関連性**: ⭐⭐⭐⭐⭐
- **導入検討**: Next.js App Router + React 19対応のベストプラクティス習得に最適

#### 2. nextjs-developer
- **提供元**: fastmcp.me / rohitg00/awesome-claude-code-toolkit
- **URL**: https://fastmcp.me/Skills/Details/341/nextjs-developer
- **概要**: Next.js 14+ App Routerとフルスタック機能をマスターした専門家スキル
- **含まれる内容**:
  - Server Components / Server Actions
  - データフェッチング（SSR/SSG/Streaming）
  - パフォーマンス最適化
  - セキュリティベストプラクティス
- **プロジェクト関連性**: ⭐⭐⭐⭐⭐
- **導入検討**: 現在のプロジェクトアーキテクチャと完全に一致

#### 3. prisma-developer
- **提供元**: mcpmarket.com / Prisma公式
- **URL**: https://mcpmarket.com/tools/skills/prisma-developer
- **GitHub**: https://github.com/prisma/skills
- **概要**: Prisma ORMの全ライフサイクル管理ツールキット
- **含まれる内容**:
  - スキーマ設計・管理
  - マイグレーション
  - クエリ最適化
  - データベースプロバイダー設定（PostgreSQL等）
- **プロジェクト関連性**: ⭐⭐⭐⭐⭐
- **導入検討**: 現在のPrisma使用と完全に一致

#### 4. playwright-testing-framework
- **提供元**: mcpmarket.com / lackeyjb / currents-dev
- **URL**: https://mcpmarket.com/zh/tools/skills/playwright-testing-framework
- **GitHub**: https://github.com/lackeyjb/playwright-skill, https://github.com/currents-dev/playwright-best-practices-skill
- **概要**: E2Eテスト自動化 + CI/CD連携
- **含まれる内容**:
  - ブラウザ自動化
  - クロスブラウザテスト（Chrome, Firefox, Safari）
  - コンポーネントテスト
  - APIテスト
  - 視覚的回帰テスト
  - アクセシビリティテスト
  - WSL2対応
- **プロジェクト関連性**: ⭐⭐⭐⭐⭐
- **導入検討**: 現在のPlaywright使用と完全に一致

#### 5. vercel-deploy
- **提供元**: OpenAI公式 / Vercel Labs / skillcreatorai
- **URL**: https://github.com/openai/skills/tree/main/skills/.curated/vercel-deploy
- **GitHub**: https://github.com/vercel-labs/agent-skills/tree/main/skills/claude.ai/vercel-deploy-claimable
- **概要**: Vercelへの即時デプロイ（プレビュー優先）
- **含まれる内容**:
  - デプロイ自動化
  - Edge Functions
  - Serverless
  - ISR（Incremental Static Regeneration）
  - 環境変数管理
- **プロジェクト関連性**: ⭐⭐⭐⭐⭐
- **導入検討**: 現在のVercelデプロイフローと完全に一致

#### 6. biome-linting
- **提供元**: yonatangross / beshkenadze / PaulRBerg (Smithery)
- **URL**: https://playbooks.com/skills/yonatangross/orchestkit/biome-linting
- **GitHub**: https://github.com/biomejs/biome
- **概要**: Biomeによる超高速Lint・フォーマット（Rust製）
- **含まれる内容**:
  - TypeScript/React向けLint
  - フォーマット（ESLint + Prettier代替）
  - 型推論
  - CI連携
  - lint-staged連携
- **プロジェクト関連性**: ⭐⭐⭐⭐⭐
- **導入検討**: 現在のBiome使用と完全に一致

---

### 🟡 中優先度（必要に応じて導入）

#### 7. authjs-skills
- **提供元**: gocallum
- **URL**: https://playbooks.com/skills/gocallum/nextjs16-agent-skills/authjs-skills
- **概要**: Auth.js v5 + Next.js + Google OAuth + Credentials Provider
- **含まれる内容**:
  - NextAuth.js v5設定
  - Google OAuth連携
  - Credentials Provider
  - 環境変数設定
  - コアAPI統合
- **プロジェクト関連性**: ⭐⭐⭐⭐
- **導入検討**: 現在のNextAuth.js v5使用と一致。認証周りの実装時に有用

#### 8. nextjs-react-typescript
- **提供元**: mindrally
- **URL**: https://playbooks.com/skills/mindrally/skills/nextjs-react-typescript
- **概要**: TypeScript + Node.js + Next.js App Router + Shadcn UI + Tailwind
- **含まれる内容**:
  - フルスタックTypeScript開発
  - Shadcn UI/Radix UI統合
  - Tailwind CSSベストプラクティス
- **プロジェクト関連性**: ⭐⭐⭐⭐
- **導入検討**: 現在の技術スタックと完全に一致

#### 9. optimized-nextjs-typescript
- **提供元**: mindrally
- **URL**: https://playbooks.com/skills/mindrally/skills/optimized-nextjs-typescript
- **概要**: パフォーマンス・セキュリティ重視のNext.jsベストプラクティス
- **含まれる内容**:
  - パフォーマンス最適化
  - セキュリティ対策
  - クリーンアーキテクチャ
- **プロジェクト関連性**: ⭐⭐⭐⭐
- **導入検討**: パフォーマンス改善時に有用

#### 10. prisma-queries
- **提供元**: mcpmarket.com
- **URL**: https://mcpmarket.com/tools/skills/prisma-database-queries
- **概要**: Prismaを使ったDBクエリパターン・ベストプラクティス
- **含まれる内容**:
  - 型安全なクエリ
  - リレーション処理
  - パフォーマンス最適化
  - トランザクション
- **プロジェクト関連性**: ⭐⭐⭐⭐
- **導入検討**: DBクエリ実装時に有用

#### 11. prisma-schema-architect
- **提供元**: mcpmarket.com
- **URL**: https://mcpmarket.com/tools/skills/prisma-schema-architect
- **概要**: Prismaスキーマ言語（PSL）でのDB設計
- **含まれる内容**:
  - スキーマ設計パターン
  - リレーション設計
  - インデックス設計
  - マイグレーション戦略
- **プロジェクト関連性**: ⭐⭐⭐⭐
- **導入検討**: DBスキーマ変更時に有用

---

### 🟢 低優先度（将来の拡張時に検討）

#### 12. llm-application-dev
- **提供元**: lobehub / skillcreatorai
- **URL**: https://lobehub.com/en/skills/skillcreatorai-ai-agent-skills-llm-application-dev
- **概要**: LLMアプリ開発（プロンプトエンジニアリング、Few-shot、Chain-of-Thought）
- **含まれる内容**:
  - プロンプトエンジニアリング
  - Few-shot学習
  - Chain-of-Thought
  - 構造化プロンプト
- **プロジェクト関連性**: ⭐⭐⭐
- **導入検討**: xAI連携の高度化時に有用

#### 13. prompt-engineer
- **提供元**: Jeffallan
- **URL**: https://github.com/Jeffallan/claude-skills/issues/76
- **概要**: プロンプト設計・最適化・評価の体系的アプローチ
- **含まれる内容**:
  - 体系的プロンプト設計
  - 最適化手法
  - 評価フレームワーク
- **プロジェクト関連性**: ⭐⭐⭐
- **導入検討**: システムプロンプト改善時に有用

#### 14. react-component-architect
- **提供元**: wesleysmits
- **URL**: https://playbooks.com/skills/wesleysmits/agent-skills/react-component-architect
- **概要**: React/Next.jsコンポーネント設計 + TypeScript + Storybook
- **含まれる内容**:
  - コンポーネントスキャフォールディング
  - CSS Modules
  - テスト
  - Storybook
- **プロジェクト関連性**: ⭐⭐⭐
- **導入検討**: UIコンポーネント開発時に有用

#### 15. webapp-testing
- **提供元**: Anthropic公式
- **URL**: https://skills.deeptoai.com/zh/docs/development/analyzing-webapp-testing
- **概要**: Python PlaywrightによるWebアプリテスト（実践的な自動化）
- **含まれる内容**:
  - Python Playwrightスクリプト
  - サーバーライフサイクル管理
  - 実践的な自動化ワークフロー
- **プロジェクト関連性**: ⭐⭐
- **導入検討**: Pythonベースのテストが必要な場合

---

## 📚 スキルディレクトリ一覧

### 公式・推奨リソース

| ディレクトリ | URL | 特徴 |
|-------------|-----|------|
| **Vercel Agent Skills** | https://vercel.com/docs/agent-resources/skills | Vercel公式。Next.js/React関連が充実 |
| **OpenAI Skills** | https://github.com/openai/skills | OpenAI公式。厳選されたスキル |
| **Prisma Skills** | https://github.com/prisma/skills | Prisma公式。データベース関連 |
| **Anthropic Skills** | https://skills.deeptoai.com | Anthropic公式ドキュメント |

### コミュニティリソース

| ディレクトリ | URL | 特徴 |
|-------------|-----|------|
| **Awesome Claude Skills** | https://github.com/ComposioHQ/awesome-claude-skills | 26000+ Stars、網羅的なカタログ |
| **Playbooks Skills** | https://playbooks.com/skills | コミュニティ製スキルのマーケットプレイス |
| **MCP Market** | https://mcpmarket.com | Claude Code Skills専門マーケット |
| **Lobehub Skills** | https://lobehub.com/skills | AI Agent Skillsプラットフォーム |
| **FastMCP** | https://fastmcp.me/Skills | MCPベースのスキル検索 |
| **Awesome-Skills.com** | https://awesome-skills.com | 117+厳選スキルカタログ |

---

## 🛠 推奨スキルセット

### 必須セット（現在のプロジェクト用）

```
必須:
├── react-best-practices (Vercel公式)
├── nextjs-developer (Next.js 14+ 対応)
├── prisma-developer (DB設計・管理)
├── playwright-testing-framework (E2Eテスト)
├── vercel-deploy (デプロイ自動化)
└── biome-linting (コード品質)

推奨:
├── authjs-skills (認証強化時)
├── prisma-queries (DBクエリ最適化時)
└── optimized-nextjs-typescript (パフォーマンス改善時)

オプション:
├── llm-application-dev (AI機能拡張時)
└── prompt-engineer (プロンプト最適化時)
```

---

## 🔍 プロジェクト別スキル対応表

| プロジェクト機能 | 関連スキル | 優先度 |
|---------------|-----------|-------|
| Next.js App Router実装 | nextjs-developer, nextjs-react-typescript | 🔴 高 |
| Reactコンポーネント開発 | react-best-practices, react-component-architect | 🔴 高 |
| DBスキーマ設計 | prisma-developer, prisma-schema-architect | 🔴 高 |
| DBクエリ実装 | prisma-queries | 🟡 中 |
| E2Eテスト作成 | playwright-testing-framework | 🔴 高 |
| Vercelデプロイ | vercel-deploy | 🔴 高 |
| コード品質管理 | biome-linting | 🔴 高 |
| 認証実装 | authjs-skills | 🟡 中 |
| xAI連携強化 | llm-application-dev | 🟢 低 |
| システムプロンプト改善 | prompt-engineer | 🟢 低 |

---

## 📝 導入手順（検討）

### Kimi Code CLIでの使用方法

Kimi Code CLIでは、`.claude/skills/` ディレクトリにSKILL.mdファイルを配置することでスキルを使用できます。

```bash
# 1. スキルディレクトリの構造
.claude/skills/
├── [skill-name]/
│   ├── SKILL.md          # 必須: スキルの定義
│   └── scripts/          # オプション: 補助スクリプト
│       └── helper.mjs

# 2. SKILL.mdの基本構造
# - スキルの説明
# - 使用タイミング
# - 手順・ガイドライン
# - 参考資料
```

### スキルのインストール方法（一般）

各プラットフォームでのインストール方法:

```bash
# Playbooks (playbooks.com)
# Web UIから「Add to Claude」ボタンでインストール

# MCP Market
# Web UIからインストール

# GitHubから直接ダウンロード
git clone https://github.com/[owner]/[skill-repo].git
cp -r [skill-name] .claude/skills/
```

---

## ⚠️ 注意事項

1. **スキルの検証**: コミュニティ製スキルは使用前に内容を確認すること
2. **バージョン互換性**: スキルの対応バージョンとプロジェクトのバージョンを確認
3. **セキュリティ**: 不明なスクリプトを含むスキルは注意して使用
4. **ライセンス**: 各スキルのライセンスを確認

---

## 🔗 参考リンク

- [Claude Code Docs - Skills](https://code.claude.com/docs/en/skills)
- [Kimi Code CLI Docs - Skills](https://moonshotai.github.io/kimi-cli/zh/customization/skills.html)
- [Vercel Skills Announcement](https://vercel.com/changelog/introducing-skills-the-open-agent-skills-ecosystem)
- [OpenAI Codex Skills](https://developers.openai.com/codex/skills/)

---

## 📊 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-02 | 初版作成 |

---

## 💡 今後の検討事項

- [ ] 優先度の高いスキルを実際にインストール・検証
- [ ] プロジェクト固有のスキル作成を検討
- [ ] 既存の.claude/skills/との重複確認
- [ ] スキルの自動更新方法の調査
