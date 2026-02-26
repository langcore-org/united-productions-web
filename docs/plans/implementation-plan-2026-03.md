# 実装プラン 2026年3月

> **作成日**: 2026-02-26  
> **更新日**: 2026-02-26  
> **関連会議**: LangCore - United Productions様 2026/02/26  
> **ステータス**: 進行中

---

## 1. プロジェクト概要

### 1.1 リリース目標

| 項目 | 内容 |
|------|------|
| **第1段階リリース** | 2026年3月末（3月30日の週を目標） |
| **現場テスト** | 2026年3月12日（木）11:00〜 @現場 |
| **社内発表** | 来月第1月曜日（3月2日）の社内朝礼でローンチ予定を宣言 |

### 1.2 リリース対象機能（第1段階）

以下5機能を搭載した第1段階リリースとする：

1. **チャット** - 基本的なAIチャット機能
2. **出演者リサーチ** - X検索 + Web検索統合
3. **エビデンスリサーチ** - 情報収集・検証機能
4. **議事録作成** - VTT/TXTファイルアップロード形式
5. **新企画立案** - 対話型アイデア創出機能

### 1.3 優先順位を下げた機能

| 機能 | 理由 | 今後の対応 |
|------|------|-----------|
| **ナレーション原稿作成** | Word形式への出力実装が困難。中途半端な完成度では現場で使われなくなるリスク。 | [4月以降にフルセットで実装を検討](../backlog/features/narration-script-creation.md) |
| **場所リサーチ** | 開発工数が重く、出力形式も特殊になりやすい | [第2段階以降で検討](../backlog/research/location-research.md) |
| **YouTube/Instagram/TikTokリサーチ** | YouTube/Instagramは有料ツールが必要、TikTokはAPI申請に時間がかかる | [費用対効果を検証後、段階的に導入検討](../backlog/research/youtube-instagram-research-integration.md) |
| **対面会議音声録音対応** | 音声→文字起こし処理の工数、複数人音声の品質調整が必要 | [4月以降の追加機能として検討](../backlog/features/voice-recorder-transcription.md) |
| **過去企画の社内情報インプット** | 権限管理が複雑で開発工数が重い | [第2段階以降で検討](../backlog/enhancements/past-project-internal-data-input.md) |

---

## 2. マイルストーン・スケジュール

### 2.1 タイムライン

```
2026年2月26日（木）  ← 現在
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 2/26 〜 3/5（第1週）                                         │
│ ・SNS有料ツール統合検証                                      │
│ ・出演者リサーチプロンプト磨き込み                            │
│ ・エビデンスリサーチプロンプト磨き込み                        │
│ ・新規企画立案機能の移植                                      │
│ ・番組情報の事前インプット拡充                                │
│ ・議事録作成機能のファイルアップロード対応                    │
│ ・サイドバー機能実装相談対応                                  │
│ ・3月5日週次進捗報告会                                        │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3/6 〜 3/12（第2週）                                         │
│ ・全機能の統合テスト                                          │
│ ・テストから本番への移行                                      │
│ ・3月12日（木）現場での非公開テスト                           │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3/13 〜 3/19（第3週）                                        │
│ ・現場テストフィードバックの反映                              │
│ ・プロンプトの更なる磨き込み                                  │
│ ・デザイン最終調整（ロゴ、キャッチコピー等）                  │
│ ・ガイド/マニュアルの作成                                     │
│ ・管理画面調整（コスト監視）                                  │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3/20 〜 3/26（第4週）                                        │
│ ・最終バグ修正                                                │
│ ・本番環境への移行準備                                        │
│ ・最終デザイン適用                                            │
│ ・社内発表用スクリーンショット準備                            │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3月30日の週                                                  │
│ ・正式リリース                                                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 重要日程

| 日付 | イベント | 担当 | 備考 |
|------|----------|------|------|
| 3/2（月） | 社内朝礼ローンチ宣言 | 島田 | [スクリーンショット提供必要](./design/screenshot-for-company-announcement.md) |
| 3/5（木） | [週次進捗報告会](./development/weekly-progress-meeting-20260305.md) | 浅野 | オンライン |
| 3/12（木）11:00 | [現場非公開テスト](./testing/field-test-preparation-20260312.md) | 全員 | 詳細はリンク先 |
| 3月下旬 | [デザイン最終調整](./design/design-final-adjustment.md) | 全員 | 詳細はリンク先 |
| 3/30週 | [正式リリース](./release/official-release-20260330.md) | 浅野 | 詳細はリンク先 |

---

## 3. 機能実装プラン

### 3.1 優先度: 高（必須）

#### 3.1.1 出演者リサーチ

**現状**: 基本機能は実装済み、プロンプト磨き込みが必要

**関連ドキュメント**: [出演者リサーチプロンプト磨き込み](./development/prompt-tuning-performer-research.md)

**TODO**:
- [ ] プロンプトの磨き込み（思考プロセス非表示、出力形式統一）
- [ ] 番組情報の正確性向上（United Productions様から正確な情報を取得）
- [ ] UI/UXの調整（自動スクロール制御等）
- [ ] 3月12日テスト向け最終調整

**技術的メモ**:
- ベースモデルの学習情報 + Web検索 + X検索をツールとして使用
- 選択された番組情報もインプットに含める
- 過去のチャット履歴は要約してインプット（コスト管理のため）

#### 3.1.2 エビデンスリサーチ

**現状**: 実装途中、出力形式の検証が必要

**関連ドキュメント**: [エビデンスリサーチプロンプト磨き込み](./development/prompt-tuning-evidence-research.md)

**TODO**:
- [ ] エビデンス収集のプロンプト実装
- [ ] 参照情報の表示形式の整備（ブラケットでの参照表示）
- [ ] 出演者リサーチと同じベース技術を流用

#### 3.1.3 議事録作成

**現状**: 初期画面設計変更が必要

**関連ドキュメント**: [議事録作成機能のファイルアップロード対応](./development/meeting-minutes-file-upload.md)

**TODO**:
- [ ] 初期画面を「ファイルアップロード」を基本としたUIに変更
- [ ] VTTファイルアップロード対応
- [ ] TXTファイルアップロード対応
- [ ] アップロード後の議事録生成プロンプト実装

**仕様**:
- Zoomから出力されるVTTまたはTXTファイルをアップロードする形式
- 対面会議のボイスレコーダー音声対応は[4月以降に先送り](../backlog/features/voice-recorder-transcription.md)

#### 3.1.4 新企画立案

**現状**: 過去アプリの移植が可能

**関連ドキュメント**: [新規企画立案機能の移植](./development/new-project-planning-porting.md)

**TODO**:
- [ ] 過去アプリのプロンプトを移植
- [ ] 過去の番組情報インプットなしで動作確認
- [ ] 機能名「新企画立案」+ サブテキスト「アイデアを出してくれます」の実装
- [ ] 3月後半のデザイン最終調整

**仕様決定事項**:
- 機能名: 「新企画立案」（暫定）
- サブテキスト: 「アイデアを出してくれます」（案）
- 過去の番組情報の事前インプットは第1段階ではなし

### 3.2 優先度: 中（リリース後でも対応可能）

#### 3.2.1 SNS統合（YouTube/Instagram）

**検証→実装の流れ**：
1. **検証**（〜3/5）：[SNS有料ツール統合検証](./development/sns-paid-tool-verification.md)
2. **判断**（3/5）：費用対効果・技術的実現性の評価
3. **実装**（3/6〜3/19）：[YouTube/Instagramリサーチ統合（3月実装）](./development/youtube-instagram-research-implementation.md)

| SNS | 状況 | 対応 |
|-----|------|------|
| X (Twitter) | ✅ 実装済み、使い勝手良好 | 継続利用 |
| YouTube | 🟡 検証後、3月中に実装可能 | 費用承認が下りれば実装 |
| Instagram | 🟡 検証後、3月中に実装可能 | 費用承認が下りれば実装 |
| TikTok | ⏸️ API申請に時間がかかる | [4月以降に検討](../backlog/research/tiktok-research-integration.md) |

#### 3.2.2 その他の中優先度タスク

- [管理画面調整（コスト監視）](./development/admin-dashboard-cost-monitoring.md)
- [出演者リサーチUI改善](./development/performer-research-ui-improvement.md)
- [テストから本番への移行](./development/test-to-production-migration.md)
- [サイドバー機能実装相談対応](./design/sidebar-functionality-consultation.md)

### 3.3 優先度: 低（将来検討）

- [テストユーザー登録対応](./management/test-user-registration.md)

---

## 4. 技術的課題と対応策

### 4.1 認証・ユーザー管理

**現状**: テストユーザー登録が必要な状態

**関連ドキュメント**: [テストから本番への移行](./development/test-to-production-migration.md)

**TODO**:
- [ ] テストから本番への移行（3月10日頃）
- [ ] 本番環境でのGoogle認証設定

### 4.2 コスト管理

**現状の見積もり**:
- 1回のプロンプト実行: 約0.005ドル（約0.75円程度）
- ユーザー数が増えた場合のコスト監視が必要

**関連ドキュメント**: [管理画面調整（コスト監視）](./development/admin-dashboard-cost-monitoring.md)

**対応策**:
- 管理画面での使用量監視機能（実装済み、要調整）
- 過去チャット履歴の要約・圧縮によるトークン数削減（実装済み）

---

## 5. デザイン・UI調整

### 5.1 最終調整項目（3月後半に実施）

**関連ドキュメント**: [デザイン最終調整](./design/design-final-adjustment.md)

| 項目 | 内容 | 備考 |
|------|------|------|
| **ロゴ** | UPロゴのデザイン確定 | 画像ファイルの提供が必要 |
| **キャッチコピー** | Teddyの下に表示するキャプション | 「Teacher & Buddy」等 |
| **ファビコン** | ブラウザタブに表示するアイコン | ロゴと統一 |
| **カラー** | 白をベースにしたデザインは継続 | 指定があれば調整 |
| **新企画立案サブテキスト** | 「アイデアを出してくれます」等 | [詳細はこちら](./design/subtitle-content-for-new-project.md) |

### 5.2 社内発表用スクリーンショット

**関連ドキュメント**: [社内発表用スクリーンショット作成](./design/screenshot-for-company-announcement.md)

**提供予定**:
- ナレーション原稿作成を省いた機能ラインナップ
- チャット画面（空の状態）
- 各機能のアイコン表示

**タイミング**: 来月第1月曜日（3月2日）の社内朝礼までに

---

## 6. テスト計画

### 6.1 現場テスト（3月12日）

**関連ドキュメント**: [3月12日現場テスト準備・実施](./testing/field-test-preparation-20260312.md)

**目的**:
- 実際の現場での使い勝手を確認
- ADさんからのフィードバック収集

**テスト項目**:
- [ ] 出演者リサーチの精度確認
- [ ] エビデンスリサーチの使い勝手
- [ ] 議事録作成のファイルアップロードフロー
- [ ] 新企画立案のアイデア出しの質
- [ ] 全般的なUI/UX

**参加者**:
- 浅野宏耀（開発側）
- 島田源太郎
- 佐久間雅貴
- 鵜飼雅佳（調整中）
- 中尾さん（調整中）
- その他ADさん（呼ばれる予定）

### 6.2 リリース前チェックリスト

**関連ドキュメント**: [バグ修正・最終調整](./release/bug-fixes-and-final-tuning.md)

- [ ] 全機能の動作確認
- [ ] プロンプトの最終調整
- [ ] デザインの最終適用
- [ ] 本番環境へのデプロイ確認
- [ ] バグ修正完了
- [ ] [ガイド/マニュアルの作成](./management/guide-and-manual-creation.md)

---

## 7. リスク管理

### 7.1 特定リスク

| リスク | 影響 | 対応策 |
|--------|------|--------|
| SNS統合の有料ツール費用 | 中 | 費用対効果を検証して導入判断 |
| プロンプトの品質 | 高 | 3月12日までにハードに磨き込み、テストで検証 |
| ファイルアップロードの実装遅延 | 中 | シンプルな実装から開始、段階的に拡充 |
| デザイン調整の遅延 | 低 | 3月後半に集中対応、機能面は先行して完成させる |

### 7.2 保留タスクの管理

実装中に「後で対応したい」タスクを発見した場合:

1. `docs/backlog/` に即座にファイルを作成
2. コードに `TODO` コメントを残す

```bash
# 例
cat > "docs/backlog/todo-$(date +%s)-feature-name.md" << 'EOF'
> **優先度**: ⏸️ 保留
> **発見日**: YYYY-MM-DD
> **関連ファイル**: app/path/to/file.ts

# TODO: タイトル

## 内容
実装中に後回しにしたタスクの詳細

## 本来の対応
- 本来の解決方法

## 先送り理由
- 先送りした理由
EOF
```

---

## 8. 次回会議までのタスク

### 8.1 浅野宏耀

- [ ] [SNS統合のための有料ツール統合検証](./development/sns-paid-tool-verification.md)
- [ ] [プロンプトの磨き込み（ハード実施）- 出演者リサーチ](./development/prompt-tuning-performer-research.md)
- [ ] [プロンプトの磨き込み（ハード実施）- エビデンスリサーチ](./development/prompt-tuning-evidence-research.md)
- [ ] [新規企画立案機能の移植（過去アプリのプロンプト流用）](./development/new-project-planning-porting.md)
- [ ] [番組情報の事前インプット拡充](./development/program-info-input-expansion.md)
- [ ] [ナレーション原稿作成の優先度を下げ、他機能を優先](../backlog/features/narration-script-creation.md)
- [ ] [議事録作成機能の初期画面をファイルアップロード基本に変更](./development/meeting-minutes-file-upload.md)
- [ ] [ナレーション原稿作成を省いた画面のスクリーンショットを島田源太郎に共有](./design/screenshot-for-company-announcement.md)
- [ ] [新企画名のサブテキスト内容の検討](./design/subtitle-content-for-new-project.md)
- [ ] [サイドバー機能実装相談対応](./design/sidebar-functionality-consultation.md)
- [ ] [3月5日週次進捗報告会の準備](./development/weekly-progress-meeting-20260305.md)

### 8.2 佐久間雅貴

- [ ] [3月12日（木）11:00からの現場ミーティングの可能性確認](./testing/field-test-preparation-20260312.md)
- [ ] 厳しければ午後の時間帯も検討して調整

### 8.3 グループ全体

- [ ] [3月後半にデザインを含めた新企画名の最終調整](./design/design-final-adjustment.md)

---

## 9. 関連ドキュメント

### 3月実装タスク（今すぐやる）

#### 開発タスク（13件）
| ドキュメント | 期限 | 優先度 |
|--------------|------|--------|
| [SNS有料ツール統合検証](./development/sns-paid-tool-verification.md) | 3/5 | 🔴 高 |
| [YouTube/Instagramリサーチ統合（3月実装）](./development/youtube-instagram-research-implementation.md) | 3/19 | 🟡 中〜高（検証結果次第） |
| [出演者リサーチプロンプト磨き込み](./development/prompt-tuning-performer-research.md) | 3/12 | 🔴 高 |
| [エビデンスリサーチプロンプト磨き込み](./development/prompt-tuning-evidence-research.md) | 3/12 | 🔴 高 |
| [新規企画立案機能の移植](./development/new-project-planning-porting.md) | 3/12 | 🔴 高 |
| [番組情報の事前インプット拡充](./development/program-info-input-expansion.md) | 3/19 | 🟡 中 |
| [議事録作成機能のファイルアップロード対応](./development/meeting-minutes-file-upload.md) | 3/12 | 🔴 高 |
| [テストから本番への移行](./development/test-to-production-migration.md) | 3/10 | 🟡 中 |
| [管理画面調整（コスト監視）](./development/admin-dashboard-cost-monitoring.md) | 3/19 | 🟢 低 |
| [出演者リサーチUI改善](./development/performer-research-ui-improvement.md) | 3/10 | 🟡 中 |
| [週次進捗報告会（3月5日）](./development/weekly-progress-meeting-20260305.md) | 3/5 | 🟡 中 |
| [テストユーザー登録対応](./management/test-user-registration.md) | 対応時 | 🟢 低 |
| [ガイド・マニュアル作成](./management/guide-and-manual-creation.md) | 3/26 | 🟡 中 |
| [議事録作成機能のガイド文言整備](./development/meeting-minutes-guide-text.md) | 3/12 | 🟡 中 |

#### テストタスク（3件）
| ドキュメント | 期限 | 優先度 |
|--------------|------|--------|
| [3月12日現場テスト準備・実施](./testing/field-test-preparation-20260312.md) | 3/12 | 🔴 高 |
| [現場テストフィードバック反映](./testing/feedback-incorporation-from-field-test.md) | 3/19 | 🔴 高 |
| [リサーチ機能の統合テスト](./testing/research-integration-test.md) | 3/10 | 🔴 高 |

#### デザインタスク（5件）
| ドキュメント | 期限 | 優先度 |
|--------------|------|--------|
| [新企画立案命名・サブテキスト設定](./design/new-project-naming-and-subtitle.md) | 3/25 | 🟡 中 |
| [デザイン最終調整](./design/design-final-adjustment.md) | 3/25 | 🟡 中 |
| [社内発表用スクリーンショット作成](./design/screenshot-for-company-announcement.md) | 3/2 | 🟡 中 |
| [サイドバー機能実装相談対応](./design/sidebar-functionality-consultation.md) | 3/5 | 🟡 中 |
| [新企画立案サブテキスト内容策定](./design/subtitle-content-for-new-project.md) | 3/2 | 🟡 中 |

#### テスト・リリースタスク（4件）
| ドキュメント | 期限 | 優先度 |
|--------------|------|--------|
| [3月12日現場テスト準備・実施](./testing/field-test-preparation-20260312.md) | 3/12 | 🔴 高 |
| [現場テストフィードバック反映](./testing/feedback-incorporation-from-field-test.md) | 3/19 | 🔴 高 |
| [バグ修正・最終調整](./release/bug-fixes-and-final-tuning.md) | 3/26 | 🔴 高 |
| [正式リリース（3月30日週）](./release/official-release-20260330.md) | 3/30週 | 🔴 高 |

### 4月以降のタスク（backlog）（6件）

| ドキュメント | カテゴリ |
|--------------|----------|
| [YouTube/Instagramリサーチ統合（本格導入）](../backlog/research/youtube-instagram-research-integration.md) | リサーチ |
| [TikTokリサーチ統合](../backlog/research/tiktok-research-integration.md) | リサーチ |
| [場所リサーチ](../backlog/research/location-research.md) | リサーチ |
| [ナレーション原稿作成機能（フルセット）](../backlog/features/narration-script-creation.md) | 機能追加 |
| [対面会議音声録音対応](../backlog/features/voice-recorder-transcription.md) | 機能追加 |
| [過去企画の社内情報インプット](../backlog/enhancements/past-project-internal-data-input.md) | 機能強化 |

---

## 10. 更新履歴

| 日付 | 更新内容 | 担当 |
|------|----------|------|
| 2026-02-26 | 初版作成 | 浅野宏耀 |
| 2026-02-26 | タスクを個別ドキュメントに分割、リンク追加 | 浅野宏耀 |
| 2026-02-26 | 抜け漏れタスク追加（週次会議、サイドバー相談、テストユーザー対応、サブテキスト策定）、各タスク詳細化 | 浅野宏耀 |

---

*最終更新: 2026-02-26 14:00*
