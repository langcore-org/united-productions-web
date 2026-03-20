# スクリプト一覧

> **データベース更新・メンテナンス・検証用スクリプト**
>
> **最終更新**: 2026-03-20

---

## スクリプトカテゴリ

### プロンプト管理

| スクリプト | 用途 | 実行方法 |
|-----------|------|---------|
| `apply-prompt-change.ts` | プロンプト変更の適用 | `npx tsx scripts/apply-prompt-change.ts` |
| `check-prompt-usage.ts` | プロンプト使用状況の確認 | `npx tsx scripts/check-prompt-usage.ts` |
| `delete-unused-prompts.ts` | 未使用プロンプトの削除 | `npx tsx scripts/delete-unused-prompts.ts` |
| `migrate-prompts-to-supabase.ts` | プロンプトをSupabaseに移行 | `npx tsx scripts/migrate-prompts-to-supabase.ts` |
| `test-system-prompt.ts` | システムプロンプトのテスト | `npx tsx scripts/test-system-prompt.ts` |
| `test-prompt-api.mjs` | プロンプトAPIのテスト | `node scripts/test-prompt-api.mjs` |
| `update-research-prompts.sql` | リサーチ機能のプロンプトにツール使用指示を追加 | `npx prisma db execute --file scripts/update-research-prompts.sql` |
| `update-research-cast-prompt.sql` | 出演者リサーチプロンプトの更新 | `npx prisma db execute --file scripts/update-research-cast-prompt.sql` |

### データベース・ユーザー管理

| スクリプト | 用途 | 実行方法 |
|-----------|------|---------|
| `check-chats.mjs` | チャットデータの確認 | `node scripts/check-chats.mjs` |
| `check-supabase.mjs` | Supabase接続確認 | `node scripts/check-supabase.mjs` |
| `check-users.mjs` | ユーザー情報の確認 | `node scripts/check-users.mjs` |
| `make-admin.mjs` | ユーザーを管理者に設定 | `node scripts/make-admin.mjs <user_id>` |
| `query-supabase.mjs` | Supabaseへのクエリ実行 | `node scripts/query-supabase.mjs` |
| `delete-features.mjs` | 機能データの削除 | `node scripts/delete-features.mjs` |

### コスト・課金確認

| スクリプト | 用途 | 実行方法 |
|-----------|------|---------|
| `check-cost-ticks.ts` | コストティックの確認 | `npx tsx scripts/check-cost-ticks.ts` |
| `cost-comparison-patterns.ts` | コスト比較パターン分析 | `npx tsx scripts/cost-comparison-patterns.ts` |
| `count-tokens.mjs` | トークン数のカウント | `node scripts/count-tokens.mjs` |
| `verify-cost-billing.ts` | コスト請求の検証 | `npx tsx scripts/verify-cost-billing.ts` |
| `verify-cost-formula.ts` | コスト計算式の検証 | `npx tsx scripts/verify-cost-formula.ts` |

### LLM・API検証

| スクリプト | 用途 | 実行方法 |
|-----------|------|---------|
| `check-general-chat.ts` | 一般チャットの確認 | `npx tsx scripts/check-general-chat.ts` |
| `compare-grok-models.ts` | Grokモデルの比較 | `npx tsx scripts/compare-grok-models.ts` |
| `compare-grok-raw-events.ts` | Grok生イベントの比較 | `npx tsx scripts/compare-grok-raw-events.ts` |
| `test-research-evidence.mjs` | エビデンスリサーチのテスト | `node scripts/test-research-evidence.mjs` |
| `investigate-api-timing.mjs` | APIタイミング調査 | `node scripts/investigate-api-timing.mjs` |
| `investigate-citations-patterns.ts` | 引用パターン調査 | `npx tsx scripts/investigate-citations-patterns.ts` |
| `investigate-tool-response.ts` | ツールレスポンス調査 | `npx tsx scripts/investigate-tool-response.ts` |
| `investigate-x-citations.ts` | X検索引用調査 | `npx tsx scripts/investigate-x-citations.ts` |
| `investigate-xai-latency.mjs` | xAIレイテンシ調査 | `node scripts/investigate-xai-latency.mjs` |
| `analyze-server-timing.mjs` | サーバータイミング分析 | `node scripts/analyze-server-timing.mjs` |

### エピソードデータ管理

| スクリプト | 用途 | 実行方法 |
|-----------|------|---------|
| `collect-episodes-from-official.mjs` | 公式サイトからエピソード収集 | `node scripts/collect-episodes-from-official.mjs` |
| `verify-episodes.mjs` | エピソードデータ検証 | `node scripts/verify-episodes.mjs` |
| `verify-episodes-final.mjs` | エピソード最終検証 | `node scripts/verify-episodes-final.mjs` |
| `verify-episodes-part2.mjs` | エピソード検証 Part2 | `node scripts/verify-episodes-part2.mjs` |
| `verify-episodes-simple.mjs` | エピソード簡易検証 | `node scripts/verify-episodes-simple.mjs` |
| `verify-matsuko-episodes.mjs` | マツコエピソード検証 | `node scripts/verify-matsuko-episodes.mjs` |
| `disable-recent-episodes.mjs` | 最近のエピソード無効化 | `node scripts/disable-recent-episodes.mjs` |
| `convert-lineup-kamichallenge.mjs` | 神チャレンジ情報変換 | `node scripts/convert-lineup-kamichallenge.mjs` |
| `convert-lineup-maniasan.mjs` | マニアさん情報変換 | `node scripts/convert-lineup-maniasan.mjs` |
| `check-neon.mjs` | NeonDB接続確認 | `node scripts/check-neon.mjs` |
| `check-output.mjs` | 出力確認 | `node scripts/check-output.mjs` |

### デプロイ・環境設定

| スクリプト | 用途 | 実行方法 |
|-----------|------|---------|
| `vercel-monitor.sh` | Vercelデプロイ監視 | `./scripts/vercel-monitor.sh` |
| `setup-vercel-env.sh` | Vercel環境変数設定 | `./scripts/setup-vercel-env.sh` |
| `open-oauth-consent.sh` | OAuth同意画面を開く | `./scripts/open-oauth-consent.sh` |
| `verify-langchain-migration.sh` | LangChain移行検証 | `./scripts/verify-langchain-migration.sh` |

---

## 技術スタック

- **ランタイム**: Node.js / tsx
- **データベース**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **LLM**: xAI (Grok) - 直接API呼び出し（LangChain不使用）

---

## 関連ドキュメント

- `docs/specs/api-integration/system-prompt-management.md` - プロンプト管理仕様
- `docs/specs/api-integration/llm-integration-overview.md` - LLM連携概要
- `AGENTS.md` - エージェント行動指針
