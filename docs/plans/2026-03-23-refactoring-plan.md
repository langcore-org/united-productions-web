# リファクタリングプラン

> **作成日**: 2026-03-23
> **最終更新**: 2026-03-24（B-2は管理画面ページのため保留）
> **ステータス**: 計画策定完了
> **対象**: Teddy コードベース全体
> **前提**: 3/31正式リリース（残り9日）、4月以降エージェントループ + RAG実装予定

---

## 1. 全体評価

### コード品質: B+（良好）

| 指標 | 状態 | 備考 |
|------|------|------|
| **`as any`** | 0件（本番コード） | reference/legacy にのみ存在 |
| **biome-ignore** | 8件（全て正当な理由付き） | exhaustiveDeps等の抑制 |
| **TypeScript strict** | `true` | 型安全性が確保されている |
| **テストカバレッジ** | 約21%（14/67モジュール） | API層・SSEパーサーが未テスト |
| **総コード量** | 約67,700行（TypeScript） | うちreference/legacyが約8,000行 |

### 主な強み

- LLMクライアントのFactory パターン + discriminated union で型安全
- プロンプト管理のDB優先/定数フォールバック設計が適切
- メッセージコンポーネント群が単一責務で適切に分割済み
- biome-ignoreが全て正当な理由で使用されている

### 主な課題

- 重複コード（grok.ts / grok-refactored.ts）
- ページコンポーネントの肥大化（4ファイルが600行超）
- APIルートの認証・エラーハンドリングパターンが不統一
- セキュリティ設定の不備（CSP, RLS）
- テストカバレッジの不足（API層、SSEパーサー）

---

## 2. 優先度別リファクタリング項目

### Priority S: セキュリティ（リリース前に対処検討）

#### S-1. CSP設定の強化

| 項目 | 内容 |
|------|------|
| **場所** | `next.config.ts` |
| **問題** | `script-src` に `'unsafe-eval'` と `'unsafe-inline'` が両方有効。XSS耐性が弱い |
| **メリット** | セキュリティの基本防御が向上 |
| **リスク** | React開発モードで`unsafe-eval`が必要な場合あり。本番のみ制限する分岐が必要 |
| **工数** | 1-2h |
| **判断** | ✅ **2026-03-24 完了** — `next.config.ts` で `isProd` 分岐を追加し、本番では `unsafe-eval` を除外 |

#### S-2. Supabase RLSポリシーの追加

| 項目 | 内容 |
|------|------|
| **場所** | `supabase/migrations/` |
| **問題** | Row Level Security ポリシーが未設定。認証済みユーザーが他ユーザーのデータにアクセス可能な可能性 |
| **メリット** | データアクセスのセキュリティが根本的に向上 |
| **リスク** | RLS設定ミスで正常なアクセスが遮断される恐れ。十分なテストが必要 |
| **工数** | 3-5h |
| **判断** | ✅ **2026-03-24 確認済み** — 初期マイグレーション（`20260309000000`）で全テーブルにRLS設定済み・DB適用済み。追加対応不要 |

**確認済みポリシー**:
- `chats` — 自分のチャットのみ CRUD ✅
- `chat_messages` — 自分のチャットに紐づくメッセージのみ CRUD ✅
- `usage_logs` — SELECT: 自分のログのみ / INSERT: サービスロールのみ。管理者APIは `createAdminClient()`（サービスロール）でRLSバイパス ✅

---

### Priority A: 高優先度（リリース直後、4月第1週）

#### A-1. grok.ts / grok-refactored.ts の統一

| 項目 | 内容 |
|------|------|
| **場所** | `lib/llm/clients/grok.ts` (516行), `lib/llm/clients/grok-refactored.ts` (578行) |
| **問題** | 同じ `GrokClient` が2ファイルに存在 |
| **メリット** | 混乱を排除、保守対象を1ファイルに。エージェントループ実装の土台が明確になる |
| **リスク** | 低。factory.tsのインポート先を変えるだけ |
| **工数** | 1-2h |
| **判断** | ✅ **2026-03-22 完了** — grok.ts に CitationManager・inferToolTypeFromUrl・item.content対応をマージ、grok-refactored.ts 削除 |

**2ファイルの差分**:

| 項目 | grok.ts | grok-refactored.ts |
|------|---------|-------------------|
| 基本クラス | GrokClient | GrokClient（同じ） |
| ツール設定 | DEFAULT_GROK_TOOLS, XAI_TOOL_TYPE_MAP | 同じ |
| 新機能 | なし | `CitationManager` クラス、`inferToolTypeFromUrl()` 関数 |
| X検索対応 | 基本的なイベント型のみ | citations処理を強化 |
| API型定義 | item.contentを除外 | item.content をサポート |

**対応方針**: grok-refactored.ts を本番版として採用し、grok.ts を削除。

#### A-2. 不要な依存関係の削除

| 項目 | 内容 |
|------|------|
| **場所** | `package.json` |
| **問題** | Supabase移行後も旧DB関連パッケージが残存 |
| **メリット** | ビルドサイズ削減、サプライチェーンリスク低減 |
| **リスク** | 低。使用箇所をgrepで確認してから削除 |
| **工数** | 1h |
| **判断** | ✅ **2026-03-22 完了** — `pg`, `@neondatabase/serverless` アンインストール、3つのNeon関連スクリプト削除 |

**削除実績**:

| パッケージ | 種別 | 状態 | 理由 |
|-----------|------|------|------|
| `pg` | devDep | Supabase移行済み | Neon直接接続用、現在不要 |
| `@neondatabase/serverless` | devDep | Supabase移行済み | Neonドライバ、現在不要 |

> **注**: LangChain関連パッケージはすでに `package.json` から除去済み（確認済み）

#### A-3. デッドコードの削除

| 項目 | 内容 |
|------|------|
| **場所** | `app/langchain-test/`, `components/LangChainChat.tsx`, `app/preview-login/` |
| **問題** | 使われていないコードが残存。新規開発者の混乱を招く |
| **メリット** | コードベースの明確化 |
| **リスク** | 極低。参照がないことを確認済み |
| **工数** | 30min |
| **判断** | ✅ **2026-03-22 完了** — LangChain関連3ファイル削除、preview-login保持、キャッシュクリア |

**削除済みファイル**:

| ファイル | 理由 |
|---------|------|
| `app/langchain-test/page.tsx` | LangChain移行完了済み。テスト用ページとして機能していない |
| `components/LangChainChat.tsx` | 上記ページからのみ参照 |
| `hooks/useLangChainChat.ts` | LangChainChat.tsxでのみ参照 |

**保持したファイル**:
- `app/preview-login/page.tsx` — middleware.ts の PUBLIC_PATHS、E2E テストの auth.setup.ts で参照 |

#### A-4. APIルートの認証パターン統一

| 項目 | 内容 |
|------|------|
| **場所** | `app/api/` 全ルート, `lib/api/handler.ts` |
| **問題** | 2つのパターンが混在 |
| **メリット** | バリデーション・エラーハンドリングの一貫性。バグの温床を排除 |
| **リスク** | 中。各ルートの動作確認が必要。一度に全部やらず段階的に |
| **工数** | 4-6h |
| **判断** | **4月前半に段階的に実施** |

**現状の2パターン**:

```typescript
// パターン1: 関数型（推奨） - /api/transcripts, /api/research, /api/proposal
export const POST = createApiHandler(
  async ({ data, userId }) => { ... },
  { schema: requestSchema, requireAuth: true }
);

// パターン2: 手動（旧） - /api/chat/feature, /api/llm/stream, /api/upload
const authResult = await requireAuth(request);
if (authResult instanceof Response) {
  return authResult;
}
```

**対応方針**: 全ルートを `createApiHandler` パターンに統一。エージェントループで新APIルート追加時に合わせて段階的に移行。

---

### Priority B: 中優先度（4月中）

#### B-1. FeatureChat.tsx の責務分割

| 項目 | 内容 |
|------|------|
| **場所** | `components/ui/FeatureChat.tsx` (580行) |
| **問題** | 13個の責務が1コンポーネントに混在（SRP違反） |
| **メリット** | エージェントループ実装（ask_userツール等）の際にUIロジックの見通しが大幅向上 |
| **リスク** | 中。props/stateの受け渡し再設計が必要 |
| **工数** | 3-4h |
| **判断** | ✅ **2026-03-24 完了** — FeatureChat 580行→約150行。useChatMessages, ChatMessages, chat-types.ts を抽出 |

**現在の責務（13個）**:
1. メッセージ状態管理
2. ユーザー入力管理
3. ファイル添付管理
4. LLMストリーミング連携
5. チャット履歴保存
6. チャット初期化
7. ファイル処理（アップロード、バリデーション）
8. ドラッグ&ドロップ処理
9. 自動スクロール管理
10. メッセージ表示フォーマッティング
11. コピー機能
12. サジェスト処理
13. エラーハンドリング

**提案構造**:
```
FeatureChat（コンテナ）
├── ChatMessages（表示層）
├── ChatInputArea（入力層）  ← 既存
├── FileAttachment（ファイル層）  ← 既存
└── hooks:
    ├── useLLMStream  ← 既存
    ├── useConversationSave  ← 既存
    └── useChatMessages（新規: メッセージ状態管理を抽出）
```

#### B-2. ページコンポーネントの肥大化対策

| 項目 | 内容 |
|------|------|
| **場所** | 2つの管理画面ページコンポーネント |
| **問題** | ストリーミング処理ロジック・UI・状態管理が1ファイルに混在 |
| **メリット** | 再利用性向上 |
| **リスク** | 中。ページ単位でテストが必要 |
| **工数** | 4-6h（2ページ分） |
| **判断** | ⏸️ **保留（中止）** — 管理画面ページは現在使用者がおらず優先度が低いため |

**対象ファイル（現状維持）**:

| ファイル | 行数 | 主な問題 |
|---------|------|---------|
| `app/admin/usage/page.tsx` | 830行 | 定数・チャートを別コンポーネント化可能 |
| `app/admin/programs/[id]/page.tsx` | 670行 | タブ毎の内容を別コンポーネント化可能 |

**削除済み（対象外）**:
- ~~`app/(authenticated)/meeting-notes/page.tsx`~~ — 削除済み
- ~~`app/(authenticated)/transcripts/page.tsx`~~ — 削除済み

#### B-3. useLLMStream の状態グループ化

| 項目 | 内容 |
|------|------|
| **場所** | `hooks/useLLMStream/index.ts` |
| **問題** | 9個の独立した `useState` が存在 |
| **メリット** | エージェントループ追加時に状態管理が爆発しない基盤になる |
| **リスク** | 中。既存の全呼び出し元の修正が必要 |
| **工数** | 2-3h |
| **判断** | ✅ **2026-03-24 完了** — 9個のuseStateをuseReducerに統合。`hooks/useLLMStream/reducer.ts` を新設。外部インターフェースは変更なし |

#### B-4. エラーレスポンスフォーマットの統一

| 項目 | 内容 |
|------|------|
| **場所** | `app/api/` 全ルート |
| **問題** | ルートごとにレスポンス形式が異なる |
| **メリット** | フロントエンドのエラーハンドリングが統一可能 |
| **リスク** | 低-中。フロントエンドのエラー処理も合わせて修正が必要 |
| **工数** | 2-3h |
| **判断** | ✅ **2026-03-24 完了** — `errorResponse`, `validationErrorResponse` ヘルパーを `lib/api/utils.ts` に追加。全23ルートを統一フォーマット `{ error }` / `{ error, details }` / `{ error, code }` に移行。`success: false` パターンと `requestId` 混在を廃止 |

---

### Priority C: 低優先度（4月後半〜）

#### C-1. programs-detailed-data の整理

| 項目 | 内容 |
|------|------|
| **場所** | `lib/knowledge/programs-detailed-data.ts` (854行), `lib/knowledge/programs-detailed-data-2.ts` (648行) |
| **問題** | `-2` という命名が曖昧。役割分担が不明確 |
| **メリット** | ナレッジベース拡充時の作業効率向上 |
| **リスク** | 低。データの移動のみ |
| **工数** | 1-2h |
| **判断** | **RAG実装でデータ構造が変わる可能性があるため、RAG設計確定後に対応** |

#### C-2. テストカバレッジの拡大

| 項目 | 内容 |
|------|------|
| **現状** | 67モジュール中14モジュールのみテスト済み（約21%） |
| **メリット** | リグレッション防止、リファクタリング時の安心感 |
| **リスク** | なし |
| **工数** | 8-12h（下記4箇所） |
| **判断** | **リリース後に継続的に追加。リファクタリング実施時にセットで** |

**優先的にテストすべき箇所**:

| モジュール | 理由 | 優先度 |
|-----------|------|--------|
| `lib/api/auth.ts`, `lib/api/handler.ts` | 認証・API基盤。全ルートの安全性に影響 | 高 |
| `lib/llm/sse-parser.ts` | SSEパースロジック。ストリーミングの要 | 高 |
| `lib/llm/factory.ts` | LLMクライアント生成。プロバイダー追加時に重要 | 中 |
| `lib/supabase/middleware.ts` | 認証ミドルウェア。セキュリティに直結 | 中 |

#### C-3. system-prompt.ts のデータ分離

| 項目 | 内容 |
|------|------|
| **場所** | `lib/prompts/system-prompt.ts` (659行) |
| **問題** | プログラムデータが直接埋め込まれている（約400行分） |
| **メリット** | プロンプト構築ロジックとデータの分離 |
| **リスク** | 低。データ参照パスの変更のみ |
| **工数** | 1-2h |
| **判断** | **RAG実装時にデータソースが変わるなら、その時まで待つ方が効率的** |

#### C-4. next.config.ts の `ignoreBuildErrors: true` 解除

| 項目 | 内容 |
|------|------|
| **場所** | `next.config.ts` |
| **問題** | TypeScriptの型エラーがビルドを止めない設定 |
| **メリット** | 型エラーの見逃しを防止 |
| **リスク** | 高。既存の型エラーが存在する場合、ビルドが通らなくなる |
| **工数** | 型エラー数次第（2h〜数日） |
| **判断** | **型エラーを全て解消してから有効化。急がない** |

---

### やらないもの（現時点で不要と判断）

| 項目 | 理由 |
|------|------|
| **グローバル状態管理の導入**（Zustand等） | 現状Hookベースで破綻していない。エージェントループ実装後に再評価 |
| **LLM型定義の大幅リファクタ** | discriminated unionで適切に設計されている。プロバイダー追加時に必要に応じて拡張 |
| **shadcn/ui コンポーネントの整理** | カスタマイズ度が適切。未使用のshadcnコンポーネント（dropdown-menu, slider, switch）は影響小 |
| **プロンプト定数/DB二重構造の解消** | DB優先・定数フォールバックの設計は正しく意図的 |
| **メッセージコンポーネントの再設計** | 既に単一責務で適切に分割されている |

---

## 3. 実行スケジュール

```
【リリース前（〜3/31）】 ✅ 完了
  S-1. CSP設定の確認・強化（unsafe-eval）         ✅ 2026-03-24
  S-2. 最低限のRLSポリシー追加                    ✅ 2026-03-24（初期マイグレーションで対応済みを確認）

【リリース直後（4月第1週）】
  A-1. grok.ts / grok-refactored.ts 統一          1-2h
  A-2. 不要依存関係の削除                          1h
  A-3. デッドコード削除                            30min

【エージェントループ実装と並行（4月前半）】
  A-4. APIパターン統一                             4-6h
  B-4. エラーフォーマット統一（A-4と同時）          2-3h
  B-1. FeatureChat分割                             3-4h
  B-3. useLLMStream状態グループ化                  2-3h

【保留（管理画面のため優先度低）】
  B-2. ページコンポーネント分割（admin/*）         ⏸️ 保留

【4月中〜後半】
  C-2. テストカバレッジ拡大                        8-12h

【RAG実装と並行（時期未定）】
  C-1. programs-detailed-data整理                  1-2h
  C-3. system-prompt.tsデータ分離                  1-2h
  C-4. ignoreBuildErrors解除                       2h〜
```

### 工数サマリ

| 優先度 | 工数合計 | タイミング |
|--------|---------|-----------|
| **S（セキュリティ）** | 4-7h | リリース前 |
| **A（高優先度）** | 7-10h | 4月第1週 |
| **B（中優先度）** | 9-12h | 4月中（B-2は保留） |
| **C（低優先度）** | 12-18h | 4月後半〜 |
| **合計** | **32-47h** | |

---

## 4. 詳細分析データ

### 4.1 API認証パターンの分布

| パターン | 使用ルート |
|---------|-----------|
| **`createApiHandler`（推奨）** | `/api/transcripts`, `/api/research`, `/api/proposal`, `/api/meeting-notes` |
| **手動 `requireAuth`（旧）** | `/api/chat/feature`, `/api/llm/stream`, `/api/llm/summarize`, `/api/llm/follow-up`, `/api/upload`, `/api/export/word` |
| **管理者認証** | `/api/admin/*` 全ルート |

### 4.2 テストカバレッジ詳細

**テスト済みモジュール（14/67）**:
- `lib/chat/file-content.ts`
- `lib/upload/file-parser.ts`
- `lib/llm/clients/grok.ts`
- `lib/llm/memory/client-memory.ts`
- `lib/prompts/system-prompt.ts`
- `lib/export/word-generator.ts`
- `api/llm/stream` (統合テスト)
- `api/llm/summarize` (統合テスト)
- `api/admin/prompts` (統合テスト)
- `hooks/useLLMStream`
- `hooks/useTypingAnimation`
- `components/agent-thinking/*` (4コンポーネント)
- `components/chat/attachment-validation`
- `tests/integration/memory-prompt-integration`

**テスト品質の問題**:
- GrokClientテストでfetchをモックしているが、SSEパースロジックのテストがない
- ファイルパーサーに破損ファイル・暗号化ファイルのエッジケーステストなし
- E2Eテストは`auth.setup.ts`のみで実ユーザーフローのテストなし

### 4.3 未使用コード（Knipレポートとの対応）

2026-02-24のKnipレポート（`docs/plans/knip-unused-code-report.md`）の状況更新:

| カテゴリ | ステータス | 備考 |
|---------|-----------|------|
| A. 削除済み（10個） | ✅ 完了 | 2026-02-23に対応済み |
| B. 慎重検討（5個） | ⏸️ 保留 | `AgenticResponse.tsx` はエージェントループ実装で使用予定 |
| C. 保留（10個） | ⏸️ 保留 | LangChainパッケージは削除済み。他は機能拡張時に使用 |
| D. 新規検出（32個） | 🆕 一部対応 | `LLMSelector.tsx` ↔ `ModelSelector.tsx` の統合は未実施 |

### 4.4 Supabase マイグレーション状況

| マイグレーション | 内容 | 状態 |
|----------------|------|------|
| `20260309000000_initial_schema.sql` | 初期スキーマ（Neon→Supabase移行） | ✅ 完了 |
| `20260311135420_rename_and_cleanup_tables.sql` | テーブルリネーム・クリーンアップ | ✅ 完了 |
| `20260312000000_add_handle_new_user_trigger.sql` | ユーザー作成トリガー | ✅ 完了 |
| `20260319000000_add_program_id_to_chats.sql` | chatsにprogram_id追加 | ✅ 完了 |

**注意**: `transcripts`, `program_settings`, `system_settings` テーブルは「現在未使用」とコメントあり。

### 4.5 設定ファイルの状態

| ファイル | 状態 | 注意点 |
|---------|------|--------|
| `tsconfig.json` | ✅ 適切 | `strict: true`。ただし `tests` を exclude しているためIDEで型チェック対象外 |
| `biome.json` | ✅ 適切 | `noDangerouslySetInnerHtml: "off"` — react-markdown使用のため必要 |
| `next.config.ts` | ⚠️ 注意 | `ignoreBuildErrors: true`（C-4参照）、CSP設定（S-1参照） |
| `knip.json` | ✅ 適切 | テストと型定義を除外 |
| `vitest.config.ts` | ✅ 適切 | jsdom環境、カバレッジ設定あり |
| `playwright.config.ts` | ✅ 適切 | Auth setup、スクリーンショット/ビデオ記録 |

---

## 5. 関連ドキュメント

| ドキュメント | 関連 |
|-------------|------|
| [Knip未使用コード検出レポート](./knip-unused-code-report.md) | A-3（デッドコード削除）の詳細 |
| [エージェントループ実装計画](./agentic-loop-implementation.md) | B-1, B-3 の前提となるアーキテクチャ変更 |
| [エージェントアーキテクチャ & RAG戦略](../research-reports/agentic-architecture-and-rag-strategy.md) | C-1, C-3 のタイミング判断に影響 |
| [実装プラン 2026年3月](./implementation-plan-2026-03.md) | リリーススケジュール |

---

*最終更新: 2026-03-24（B-2は管理画面ページのため保留）*
