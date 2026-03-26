# AGENTS.md スリム化プラン

**作成日**: 2026-03-25

---

## Context

AGENTS.md は現在841行あり、以下の問題を抱えている:

- **注意力の分散**: LLMは長い指示の後半ほど優先度が下がる。コア原則と具体的手順が混在し、「何が重要か」が曖昧
- **重複**: `docs/README.md` や `docs/lessons/README.md` と同じ内容が多数存在し、片方だけ更新されて不整合が生じるリスク
- **スキルとの役割重複**: 22個の既存スキルが既に詳細手順を持っているのに、AGENTS.md にも同じ内容がある

**目標**: 841行 → ~200行に凝縮。行動原則・判断フレームワーク・参照ナビゲーションに絞り、詳細手順は既存スキル/docs に委譲する。全情報はAGENTS.mdの参照リンクからたどり着ける設計にする。

---

## リサーチ結果

### 1. プログレッシブディスクロージャー（段階的開示）

公式ドキュメントとコミュニティが一致して推奨する3段階のコンテキスト管理:

| レベル | ロードタイミング | コスト |
|---|---|---|
| スキルのメタデータ（name + description） | セッション開始時に全スキル分 | ~100トークン/スキル |
| SKILL.md 本体 | Claude が関連性を判断した時 | ~5,000トークンまで |
| references/ 内のファイル | 必要時にオンデマンド | 実質無制限 |

スキルに詳細を移しても、description さえ的確なら必要な時に自動的にロードされる。

**参照元**:
- [Extend Claude with skills - Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Skills: the art of progressive disclosure](https://marcelcastrobr.github.io/posts/2026-01-29-Skills-Context-Engineering.html)
- [Skill authoring best practices - Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

### 2. AGENTS.md / CLAUDE.md の推奨サイズ

複数のソースが一致:

- 理想: **300行以下**、60行以下が最も効果的という意見も
- LLMが一貫して従える指示は **~150-200個**。Claude Code のシステムプロンプトで既に~50個使用済み
- 現在の841行は明らかに多すぎる → 後半の指示は優先度が下がる

**参照元**:
- [Writing a good CLAUDE.md - HumanLayer Blog](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [Claude Code Customization Guide - alexop.dev](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/)

### 3. 「原則 vs 手順」の分離は公式推奨と一致

- AGENTS.md は **"WHAT"（何をすべきか）と "WHY"（なぜ）** に集中
- **"HOW"（どうやるか）** はスキルや docs/ に委譲
- コードスタイルはリンター、デプロイ手順はスキル、API仕様はdocs/ に

**参照元**:
- [When to Use Skills vs Commands vs Agents - Daniel Miessler](https://danielmiessler.com/blog/when-to-use-skills-vs-commands-vs-agents)
- [A Complete Guide To AGENTS.md](https://www.aihero.dev/a-complete-guide-to-agents-md)

### 4. スキルの context budget に関する注意点

- スキルの description はコンテキストウィンドウの **2%** のバジェット内に収まる必要がある
- 22個のスキルがあるとメタデータだけで ~2,200トークン → 問題ないレベル
- SKILL.md 本体は **500行以下** が推奨

**参照元**:
- [Claude Agent Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)

### 5. AGENTS.md と CLAUDE.md の関係

- Claude Code は CLAUDE.md がなければ **AGENTS.md をフォールバックとして読む**
- 現在このプロジェクトは CLAUDE.md なし、AGENTS.md のみ → これが実質的に CLAUDE.md として機能している
- コミュニティの推奨: `ln -s AGENTS.md CLAUDE.md` でシンボリックリンク

**参照元**:
- [A Complete Guide To AGENTS.md](https://www.aihero.dev/a-complete-guide-to-agents-md)
- [CLAUDE.md, AGENTS.md, and Every AI Config File Explained](https://www.deployhq.com/blog/ai-coding-config-files-guide)

### 6. ファイルパスの記載は避けるべき

- パスは陳腐化するため、AGENTS.md に具体的なパスを列挙するのは非推奨
- 代わりに「スキル名」や「機能の説明」で参照し、エージェントに自力で探させる方が堅牢

### 7. Nested CLAUDE.md も活用可能

- サブディレクトリに CLAUDE.md を置くと、そのディレクトリのファイルにアクセスした時のみロードされる
- 例: `tests/CLAUDE.md`、`src/db/CLAUDE.md`
- 将来的な改善候補として検討

---

## 分離の原則

AGENTS.md（常時ロード）とスキル（必要時のみロード）の役割分担:

| AGENTS.md に残す | スキルに委譲する |
|---|---|
| **原則**: 「何をすべきか」（コミット前にチェックせよ、as any を使うな、セキュリティ設定を削除するな） | **手順**: 「どうやるか」（具体的なコマンド列、コード例、トラブルシューティング手順） |

AGENTS.md は常にエージェントのコンテキストに存在し、ガードレールとして機能する。スキルは具体的な作業時に呼び出され、詳細な実行手順を提供する。

---

## 実装プラン

### Phase 1: 移動先ファイルへのコンテンツ追加

情報を失わないため、AGENTS.md を書き換える前に移動先を先に更新する。

#### Step 1: `.claude/skills/prompt/SKILL.md` に追加 (~30行)

AGENTS.md から以下を移動:
- 現在の実装テーブル（機能ID/プロンプトキー/状態の一覧）
- 未実装機能テーブル（RESEARCH_LOCATION, RESEARCH_INFO, TRANSCRIPT）
- トラブルシューティング（思考過程出力、定型文、番組情報未参照時の対応）
- 禁止事項（会社概要、思考プロセス出力、定型文）

#### Step 2: `.claude/skills/project-docs/SKILL.md` に追加 (~10行)

AGENTS.md から以下を移動:
- 実装完了時のチェックリスト（plans/ → archive/ 移動、保留タスク確認のbashコマンド）

#### Step 3: `.claude/skills/code-care/SKILL.md` に追加 (~3行)

- 実績ノート（2026-02-19: as any 完全除去の記録）
- 既存の「as any 除去パターン」「コミット前チェックリスト」セクションは既にほぼ同内容をカバー済み

#### Step 4: `docs/README.md` に追加 (~15行)

AGENTS.md から以下を移動:
- ドキュメントメタデータテンプレート（必須メタデータの正確なフォーマット）
- lessons/ 移動判断シグナル（6つの判断基準リスト）

#### 補足: 移動不要な項目（既に移動先に同内容あり）

| セクション | 理由 |
|---|---|
| 型安全性パターン | `code-care` に既に99%同内容あり |
| Vercelデプロイ監視 | `vercel-deploy` に既に100%同内容あり |
| コミット前チェックリスト | `code-care` に既に95%同内容あり |
| lintエラー対応 | `ci-error-fix` に既に同内容あり |
| ドキュメント運用ルール | `docs/README.md` に既に90%同内容あり |
| ドキュメント参照ガイド | `docs/README.md` に既に85%同内容あり |

### Phase 2: AGENTS.md の書き換え

841行を以下の構成で~200行に凝縮する。

```
# Agent Behavior Guidelines                              (~5行)
  - タイトル、説明、最終更新日

## 1. スキルの自律的改善                                   (~15行)
  - コア原則: 使用 → 改善 → コミット
  - トリガー表（5行）
  - 「完璧を待たない」原則（1行）

## 2. 技術スタック                                        (~15行)
  - コアインフラ表（5行）
  - LLMフレームワーク注記（xAI直接、LangChain保持）
  - 参照リンク

## 3. タスク着手前の必須確認                                (~15行)
  - スコープ定義
  - plans/ 確認
  - 環境・依存関係の事前調査
  - 各項目を箇条書きで凝縮

## 4. セキュリティ・設定ファイルの扱い                       (~10行)
  - 削除禁止リスト（凝縮）
  - 型エラー対処の原則（1例のみ）

## 5. デバッグ・設計見直しの原則                             (~15行)
  - 3回修正ルール → 設計見直し
  - 根本解決 vs ワークアラウンドの原則
  - 調査ファースト原則
  - 詳細は ci-error-fix/code-care スキルへ参照

## 6. 技術設計における理想的設計の優先                        (~10行)
  - コア原則: 理想的な設計を優先
  - 判断フロー（3行に凝縮）
  - 根本解決必須ケースの表（凝縮）

## 7. 報告条件                                            (~15行)
  - 報告すべき状況テーブル（7行）
  - 深い問題発見時の対応手順（4行）

## 8. 参照ナビゲーション                                   (~40行)
  - スキル参照テーブル: やりたいこと → スキル名
  - ドキュメント参照テーブル: 状況 → docs/ パス
  - パッケージインストール注記（3行）
```

推定合計: ~140行コンテンツ + ~30行フォーマット + ~30行空行 = ~200行

注意: リサーチ結果を踏まえ、参照ナビゲーションではファイルパスの列挙を最小限にし、スキル名での参照を基本とする（パスの陳腐化防止）。

### Phase 3: 相互参照の更新

移動先ファイルが「詳細は AGENTS.md を参照」と書いている箇所を更新:

- `code-care/SKILL.md`: 「AGENTS.md - 型安全性向上パターン」参照を削除（自身にコンテンツがあるため）
- `project-docs/SKILL.md`: 「AGENTS.md - ドキュメント更新ルール」→ `docs/README.md` へ変更
- `docs/README.md`: 「詳細: AGENTS.md」→ 自己完結に更新

### Phase 4: 検証

1. **網羅性チェック**: 旧AGENTS.mdの各セクションが、新AGENTS.mdの参照リンクからたどり着けることを確認
2. **整合性チェック**: 移動先のコンテンツが旧AGENTS.mdの内容と矛盾していないことを確認
3. **ビルド確認**: `npm run build` でプロジェクトに影響がないことを確認（ドキュメント変更のみなので問題なし）

---

## 変更対象ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `AGENTS.md` | 841行 → ~200行に書き換え |
| `.claude/skills/prompt/SKILL.md` | プロンプト管理の詳細を追加 (~30行) |
| `.claude/skills/project-docs/SKILL.md` | 実装完了チェックリストを追加 (~10行) |
| `.claude/skills/code-care/SKILL.md` | 実績ノートを追加 (~3行) + 相互参照更新 |
| `docs/README.md` | メタデータテンプレート + lessons判断基準を追加 (~15行) + 相互参照更新 |

---

## 将来の検討事項

- **CLAUDE.md シンボリックリンク**: `ln -s AGENTS.md CLAUDE.md` で他ツールとの互換性確保
- **Nested CLAUDE.md**: `tests/CLAUDE.md` や `lib/llm/CLAUDE.md` 等、サブディレクトリ固有の指示をディレクトリ別に配置
- **スキルの description 最適化**: 22個のスキルの description が的確か定期的にレビュー
