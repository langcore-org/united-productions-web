# UX改善ワークフロー

> **UI/UX改善の標準ワークフロー**
>
> 調査→設計→すり合わせ→実装の流れを標準化

---

## 概要

このスキルは、UX問題の解決にあたって**盲目的な実装を防ぎ**、
**調査に基づく設計・すり合わせを経てから実装**することを保証します。

### 対象となる課題

- パフォーマンス問題（遅延・カクツキ）
- フィードバック不足（何も起きてない感）
- インタラクションの不自然さ
- 情報設計の問題

---

## ワークフロー

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  1. 問題    │ → │  2. 調査    │ → │  3. 設計    │ → │  4. 実装    │
│    理解     │    │    分析     │    │  すり合わせ │    │    検証     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │                  │
      ▼                  ▼                  ▼                  ▼
   ユーザーから       計測・原因        複数案提示        段階的実装
   課題を聞く         特定               合意形成          フィードバック
```

---

## Phase 1: 問題理解（必須）

### やること

1. **ユーザーの体験を詳しく聞く**
   - 「何が問題ですか？」
   - 「どのタイミングで違和感がありますか？」
   - 「理想的にはどうあるべきですか？」

2. **スクリーンショット・動画の確認**
   - 実際の画面キャプチャを確認
   - 再現手順の明確化

3. **問題の優先度確認**
   - 「これはどの程度緊急ですか？」
   - 「今すぐ必要 vs 今後の改善」

### このフェーズの終了基準

- [ ] 問題の現象が具体的に言語化されている
- [ ] 再現条件が明確になっている
- [ ] 期待する改善方向が共有されている

### 出力物

```markdown
## 問題定義

### 現状の問題
- ユーザーが〇〇をすると、△△が起きる
- 〇〇秒間何も表示されない

### 再現手順
1. 〇〇画面を開く
2. ××をクリック
3. ○○が発生

### 期待する状態
- △△が即座にフィードバックされる
- 進捗が可視化される
```

---

## Phase 2: 調査・分析（必須）

### やること

1. **既存調査結果の確認**
   - `docs/backlog/` 内の関連ドキュメントを検索
   - `docs/lessons/` に過去の知見がないか確認
   - 関連する実装ファイルを特定

2. **計測・ボトルネック特定**
   - 実際に計測スクリプトを作成・実行
   - 各処理ステップの所要時間を特定
   - 原因が「アプリ側」か「外部要因」かを切り分け

   **計測スクリプトのテンプレート**:
   ```javascript
   // scripts/investigate-api-timing.mjs
   const timings = {
     start: performance.now(),
     dns_tcp_tls: 0,
     firstByte: 0,
     firstEvent: 0,
   };
   
   const response = await fetch('/api/xxx', {...});
   timings.dns_tcp_tls = performance.now() - timings.start;
   
   // SSEストリーミングの計測
   for await (const event of stream) {
     if (timings.firstEvent === 0) {
       timings.firstEvent = performance.now() - timings.start;
     }
   }
   ```

3. **技術的制約の確認**
   - API仕様の確認
   - フレームワークの制約
   - 過去の技術選定の経緯（`docs/lessons/`）

4. **外部APIの挙動調査**
   - 直接APIを呼び出してレイテンシを計測
   - ツール使用時の追加時間を確認
   - コールドスタートの有無を確認

   **xAI API直接計測の例**:
   ```bash
   curl -X POST https://api.x.ai/v1/responses \
     -H "Authorization: Bearer $XAI_API_KEY" \
     -d '{"model":"grok-4-1-fast-reasoning","messages":[],"tools":[{"type":"web_search"}],"stream":true}' \
     -w "TTFB: %{time_starttransfer}s"
   ```

### このフェーズの終了基準

- [ ] ボトルネックが数値で特定されている
- [ ] 原因が「改善可能」か「受け入れるしかないか」分類されている
- [ ] 過去の類似改善が参考にできるか確認されている

---

## 調査の知見・ベストプラクティス

### APIレイテンシ調査

#### 典型的なボトルネックパターン

| パターン | 症状 | 原因 | 対策 |
|---------|------|------|------|
| **接続遅延** | TTFBが長い | DNS/TLSハンドシェイク | HTTP/2、Keep-Alive、Preconnect |
| **サーバー処理** | レスポンス開始まで長い | アプリ側の重い処理 | キャッシュ、非同期化 |
| **外部API待ち** | SSE開始後、イベントが来ない | 外部APIの処理時間 | スケルトン表示、ステータス可視化 |
| **ストリーミング遅延** | チャンク間隔が長い | ネットワーク or API側 | バッファリング最適化 |

#### SSEストリーミングの計測ポイント

```
[送信] ──T1──→ [接続確立] ──T2──→ [最初のイベント] ──T3──→ [完了]
                ↑                    ↑
              TTFB                ユーザー体感の
                                    「遅延」はここ！
```

**重要**: ユーザーはTTFBを感じない。最初のイベントが届くまでの時間（T1+T2）を改善する。

#### xAI API特有の注意点

- **ツール使用時の追加時間**: 1-3秒（web_search等の実行時間）
- **SSE接続は即座に確立**されるが、イベントは処理後に送信
- **思考プロセスは送信されない**（要望はあるが仕様）

### パフォーマンス改善の優先順位

```
効果が高く実装が簡単 ──────────────────────────────→ 効果が低く実装が複雑

[スケルトン表示]    [キャッシュ]    [非同期化]    [アーキテクチャ変更]
   30分〜1時間       1-2時間        2-4時間          1日〜
   体感大幅改善      全リクエスト    特定ケース        根本解決
                   に効果
```

### よくある勘違い

| 勘違い | 実際 | 対応 |
|--------|------|------|
| 「APIが遅い」 | 実はDBアクセスがボトルネック | キャッシュ導入 |
| 「ネットワークの問題」 | 実はxAI側の思考時間 | UXでカバー（スケルトン等） |
| 「フロントエンドの問題」 | 実はバックエンドの処理待ち | サーバー側を最適化 |

### 出力物

```markdown
## 調査レポート

### 計測結果
| ステップ | 所要時間 | 改善可能性 |
|---------|---------|-----------|
| A | 100ms | 高（キャッシュ可） |
| B | 3000ms | 低（外部API） |

### 根本原因
- 主要原因: ×××（改善困難）
- 助長要因: ○○○（改善可能）

### 参考になる過去事例
- docs/lessons/YYYY-MM-DD-xxx.md
```

---

## Phase 3: 設計・すり合わせ（必須）

### やること

1. **複数の改善案を提示**
   - 案A: 最小限の変更（低コスト・低リスク）
   - 案B: 中程度の改善（バランス型）
   - 案C: 抜本的改善（高コスト・高効果）

2. **各案のトレードオフを明示**
   - 実装工数
   - 効果（定量的・定性的）
   - リスク・副作用

3. **ユーザーと合意形成**
   - 「この案で進めますか？」
   - スコープの調整（「この部分だけ先にやりますか？」）

### ⚠️ 重要: このフェーズをスキップしてはいけない

**「実装してから確認」は禁止**
- 設計のすり合わせなしに実装すると、方向性の違いで作り直しが発生
- 必ず**ユーザーに選択肢を提示し、合意を得てから**実装を開始

### 出力物

```markdown
## 改善案比較

### 案A: スケルトン表示（推奨）
- **内容**: streaming開始直後にスケルトンを表示
- **工数**: 30分〜1時間
- **効果**: 「動いている」フィードバック提供
- **リスク**: ほぼなし

### 案B: 詳細ステータス表示
- **内容**: 接続→思考→実行→応答の段階表示
- **工数**: 2-3時間
- **効果**: より詳細な進捗把握
- **リスク**: 実装複雑化

### 選定案
案Aで進行。必要に応じて案Bも追加検討。
```

---

## Phase 4: 実装・検証

### やること

1. **段階的実装**
   - 大きな変更は小さく分割
   - 各部分で動作確認

2. **型チェック・テスト**
   - `npx tsc --noEmit`
   - 関連するテストの実行

3. **実装レポート作成**
   - 実際の変更ファイル一覧
   - Before/Afterの比較

### このフェーズの終了基準

- [ ] 型チェックが通過している
- [ ] 既存テストが破壊されていない（または修正済み）
- [ ] 実装内容が記録されている

### 出力物

```markdown
## 実装完了報告

### 変更ファイル
- `components/xxx.tsx` - スケルトン表示追加
- `hooks/useXXX.ts` - ステータス管理追加

### Before/After
| 項目 | Before | After |
|------|--------|-------|
| 最初のフィードバック | 3秒後 | 即座 |

### 検証結果
- [x] 型チェック: 通過
- [x] テスト: 通過（9 failed→0 failed）
```

---

## チェックリスト

### 各フェーズの必須確認事項

| フェーズ | 必須確認 | NGパターン |
|---------|---------|-----------|
| 問題理解 | ユーザーが「困っていること」を言語化 | 曖昧な理解で進める |
| 調査 | 数値・事実に基づく分析 | 推測で原因を決める |
| 設計 | **ユーザーとの合意形成** | 独断で実装開始 |
| 実装 | 型チェック・テスト通過 | 検証なしでプッシュ |

---

## よくある失敗パターンと対策

### パターン1: 「とりあえず実装してみよう」

**失敗**: 調査なしに実装→根本的な問題を解決できず→作り直し

**対策**: 
- 「まず調査から始めますね」と宣言
- `scripts/investigate-xxx.mjs` を作成して計測

### パターン2: 「これでいいでしょう」

**失敗**: 設計のすり合わせなしに実装→ユーザー意図とずれる

**対策**:
- 必ず複数案を提示
- 「この案で進めますか？」と明確な確認

### パターン3: 「全部一度に直します」

**失敗**: 大きな変更を一括実装→どこで問題が起きたか分からない

**対策**:
- 「まず案Aだけ実装します」
- 動作確認後、必要に応じて案Bも実装

---

## 関連ファイル・ディレクトリ

| 場所 | 用途 |
|------|------|
| `docs/backlog/` | 調査レポートの保存先 |
| `docs/lessons/` | 過去の知見・教訓 |
| `scripts/investigate-*.mjs` | 計測スクリプト |
| `docs/plans/` | 実装計画書（進行中のみ） |

---

## 使用例

### 例: 「プロンプト入力後、しばらく何も起きない」

**AI**: 「詳しく教えてください。送信後、どのくらいの間何も表示されない感じですか？」
→ Phase 1: 問題理解

**AI**: 「調査します。APIの各処理時間を計測しますね。」
→ Phase 2: 調査（`scripts/investigate-api-timing.mjs` 作成）

**AI**: "ボトルネックが分かりました。3つの改善案を提示します..."
→ Phase 3: 設計・すり合わせ

**ユーザー**: 「案AとBを両方やって」

**AI**: 「かしこまりました。実装します。」
→ Phase 4: 実装

---

## 参考ドキュメント

### 調査レポート（例）

| ドキュメント | 内容 | 参考になる場面 |
|-------------|------|---------------|
| `docs/backlog/research-chat-latency-investigation-2026-02-27.md` | APIレイテンシ調査 | チャット・ストリーミングの遅延問題 |
| `docs/lessons/2026-02-26-chat-streaming-loading-issue.md` | StreamPhase導入の教訓 | ステート管理設計 |
| `docs/backlog/research-grok-agent-tools.md` | xAI API仕様調査 | LLMツール連携 |
| `docs/backlog/todo-llm-response-latency-optimization.md` | 最適化案メモ | パフォーマンス改善 |

### 実装例・設計パターン

| ドキュメント | 内容 | 参考になる場面 |
|-------------|------|---------------|
| `docs/backlog/implement-chat-ux-improvements-2026-02-27.md` | スケルトン・ステータス表示実装 | フィードバックUX改善 |
| `docs/specs/api-integration/llm-integration-overview.md` | LLM連携アーキテクチャ | LLM機能設計 |
| `docs/specs/api-integration/system-prompt-management.md` | プロンプト管理設計 | システムプロンプト機能 |

### 技術仕様・API仕様

| ドキュメント | 内容 | 参考になる場面 |
|-------------|------|---------------|
| `docs/backlog/research-xai-citations-behavior.md` | xAI citations挙動 | 引用URL処理 |
| `docs/backlog/research-x-search-citations-comprehensive.md` | X検索citations調査 | X検索機能 |
| `docs/specs/api-integration/external-services.md` | 外部サービス連携 | API選定・設計 |

---

## 計測スクリプトテンプレート

### 1. APIエンドポイント計測

`scripts/investigate-api-timing.mjs`:
```javascript
#!/usr/bin/env node
async function measureAPITiming() {
  const timings = { start: Date.now() };
  
  const response = await fetch('/api/xxx', {...});
  timings.ttfb = Date.now() - timings.start;
  
  const reader = response.body.getReader();
  let firstEventTime = null;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    if (!firstEventTime) {
      firstEventTime = Date.now();
      timings.firstEvent = firstEventTime - timings.start;
      console.log(`First event: ${timings.firstEvent}ms`);
    }
  }
  
  console.table(timings);
}
measureAPITiming();
```

### 2. 外部API直接計測

`scripts/investigate-external-api.mjs`:
```javascript
#!/usr/bin/env node
async function measureExternalAPI() {
  const timings = { start: Date.now() };
  
  const response = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.XAI_API_KEY}` },
    body: JSON.stringify({
      model: 'grok-4-1-fast-reasoning',
      messages: [{ role: 'user', content: 'テスト' }],
      tools: [{ type: 'web_search' }],
      stream: true
    })
  });
  
  timings.ttfb = Date.now() - timings.start;
  
  // ストリーミング処理...
  console.table(timings);
}
measureExternalAPI();
```

### 3. サーバー処理内訳計測

`app/api/xxx/route.ts`:
```typescript
export async function POST(request: NextRequest) {
  const timings = { start: Date.now() };
  
  // 認証
  await authenticate();
  timings.auth = Date.now() - timings.start;
  
  // DBアクセス
  const data = await prisma.xxx.findMany();
  timings.db = Date.now() - timings.start - timings.auth;
  
  // 外部API呼び出し
  await fetch('https://api.external.com/...');
  timings.external = Date.now() - timings.start - timings.auth - timings.db;
  
  logger.info('Timing breakdown', timings);
  return Response.json(data);
}
```

---

## クイックリファレンス

### よく使うコマンド

```bash
# 型チェック
npx tsc --noEmit

# テスト実行
npm test -- --run

# 特定ファイルのテスト
npm test -- --run tests/hooks/useLLMStream.test.ts

# ビルドテスト
npm run build
```

### よく使う検索パターン

```bash
# docs内で過去の調査を検索
grep -r "latency\|timing\|performance" docs/backlog/ --include="*.md"

# 特定のAPIエンドポイントを検索
grep -r "/api/llm/stream" app/ --include="*.ts"

# 型定義を検索
grep -r "SSEEvent\|StreamPhase" lib/ --include="*.ts"
```
