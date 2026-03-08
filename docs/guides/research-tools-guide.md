# SNSリサーチツール・API・サービス包括調査ガイド

## 概要

本ドキュメントは、SNS（ソーシャルメディア）リサーチ機能の強化に向けた各種ツール、API、サービスの包括的な調査結果です。

**リサーチエージェントの要件**: YouTube、Instagram、X（Twitter）、TikTokで流行している人・物事・投稿を調査できること

---

## 1. 公式API

### 1.1 X (Twitter) API v2

| 項目 | 詳細 |
|------|------|
| **価格体系**（2026年2月時点） | • **Free**: $0（500投稿/月、読み取り専用）<br>• **Basic**: **$200/月**（15,000読み取り/月）<br>• **Pro**: **$5,000/月**（100万読み取り/月）<br>• **Enterprise**: **$42,000+/月**（カスタム）<br>• **Pay-Per-Use Beta**: 従量課金制（2025年11月開始） |
| **レート制限** | • Free: 24時間ウィンドウ、エンドポイントごとに制限<br>• Basic: 100 req/24時間（ユーザー取得）、50,000書き込み/月<br>• Pro: 900 req/15分、全エンドポイント利用可 |
| **取得可能データ** | • ツイート検索（最近7日間〜全履歴）<br>• ユーザー情報・フォロー管理<br>• エンゲージメント指標（いいね、リツイート、返信、引用、ブックマーク、インプレッション）<br>• トレンド分析（WOEID指定で地域別トレンド）<br>• Filtered Stream（リアルタイム）<br>• Xアノテーション（人物・場所・製品・トピック自動識別） |
| **人気アカウント・トレンド調査** | • `GET /2/trends/by/woeid/{id}` - 地域別トレンド（日本: 23424856）<br>• `GET /2/tweets/search/recent` - 最近7日間検索（エンゲージメント指標でソート）<br>• `GET /2/users/by/username/{username}` - ユーザー情報取得<br>• `GET /2/users/{id}/tweets` - ユーザー投稿取得（最新3,200件まで） |
| **認証方法** | • **Bearer Token**: 公開データアクセス（推奨）<br>• **OAuth 2.0**: ユーザー認証が必要な機能<br>• **OAuth 1.0a**: レガシー（非推奨） |
| **長所** | • リアルタイムデータ取得可能<br>• 柔軟なフィールド選択（fields/expansions）<br>• 注釈機能による自動エンティティ識別 |
| **短所** | • 2023年以降、無料枠が大幅縮小<br>• Basicプランでも$200/月と高額<br>• 人気順ソートはAPI側で非サポート（クライアント側でソート必要） |

**推奨用途**: リアルタイムモニタリング、トレンド分析（予算がある場合）

**代替案（低予算）**: 
- **TwitterAPI.io**: $0.15/1,000 tweets（14年以上の履歴データ）
- **Netrows**: $49/月（26のXエンドポイント）

---

### 1.2 YouTube Data API v3

| 項目 | 詳細 |
|------|------|
| **価格体系** | **無料**（クォータ制）<br>• デフォルト: 1日10,000クォータユニット<br>• 増量申請: 無料（3〜5営業日審査） |
| **クォータ消費** | • Read (list): 1ユニット<br>• Search: **100ユニット**（最も高コスト）<br>• Write: 50ユニット<br>• Video Upload: 1,600ユニット（1日最大6本） |
| **取得可能データ** | • 動画情報（タイトル、説明、タグ、公開日）<br>• チャンネル情報（登録者数、総視聴回数、動画数）<br>• 動画統計（再生数、いいね、コメント）<br>• 人気動画チャート（`chart=mostPopular`）<br>• 字幕・キャプション（ダウンロード無料）<br>• コメント |
| **人気チャンネル・トレンド調査** | • `videos.list?chart=mostPopular&regionCode=JP` - 人気動画取得<br>• `search.list?order=viewCount&type=video` - 再生数順検索<br>• `channels.list?part=statistics` - チャンネル統計取得<br>• `playlistItems.list` - チャンネル動画一覧取得 |
| **YouTube Analytics API** | • 詳細アナリティクス（視聴時間、エンゲージメント、視聴者属性）<br>• OAuth 2.0必須<br>• 自チャンネルのみアクセス可能 |
| **長所** | • 無料で使いやすい<br>• 豊富なドキュメント<br>• 字幕データも取得可能<br>• 人気動画チャートが直接取得可能 |
| **短所** | • クォータ制限が厳しい（検索は100ユニット消費）<br>• 詳細なアナリティクスは自チャンネルのみ<br>• 動画ファイルダウンロードは禁止 |

**推奨用途**: 人気動画・チャンネルの調査、トレンド分析（無料で始められる）

---

### 1.3 Instagram Graph API

| 項目 | 詳細 |
|------|------|
| **価格体系** | **無料**（Facebook開発者アカウントが必要） |
| **レート制限** | • 1時間あたり**200リクエスト/アカウント**<br>• ハッシュタグ検索: **7日間で30個のユニークハッシュタグまで**<br>• DM: 1時間あたり200件まで |
| **必要アカウント** | **Instagram BusinessアカウントまたはCreatorアカウントのみ**<br>• 個人アカウントは非対応<br>• Facebookページとの連結が必要 |
| **取得可能データ** | • プロフィール情報（フォロワー数、フォロー数、メディア数）<br>• メディア（投稿、リール、ストーリー※24時間以内）<br>• エンゲージメント（いいね、コメント、保存数、シェア数）<br>• インサイト（インプレッション、リーチ、プロフィール閲覧）<br>• コメント一覧<br>• **Business Discovery**（他のBusinessアカウントの基本情報のみ） |
| **人気アカウント・トレンド調査** | • `GET /ig_hashtag_search` - ハッシュタグ検索（30個/7日制限）<br>• `GET /{hashtag-id}/top-media` - 人気投稿取得（自分のアカウント以外は制限あり）<br>• `GET /{ig-user-id}/business_discovery` - 他Businessアカウント情報取得（インサイト不可） |
| **制限事項** | • **個人アカウントへのアクセス不可**<br>• 他ユーザーの詳細インサイト取得不可<br>• フォロワーリスト取得不可<br>• 人気アカウントランキングのエンドポイントなし<br>• App Reviewに**60日以上**かかる場合あり |
| **長所** | • 無料で利用可能<br>• 自分のアカウントの詳細インサイト取得可能 |
| **短所** | • **個人アカウント非対応**<br>• Basic Display API廃止（2024年12月）で選択肢が狭まった<br>• ハッシュタグ検索に厳しい制限あり<br>• 競合分析には不向き |

**推奨用途**: 自アカウントの分析、ハッシュタグ調査（限定的）

**代替案（他アカウント分析）**: 
- **Apify Instagram Scraper**: クラウドベーススクレイピング
- **RapidAPIのInstagram API**: サードパーティデータプロバイダー

---

### 1.4 TikTok API

| 項目 | 詳細 |
|------|------|
| **Research API**（研究者向け） | • **無料**（学術機関・非営利組織のみ）<br>• 審査期間: **4週間〜21ヶ月**（場合による）<br>• 対象地域: 米国、EEA、英国、スイス<br>• **商用利用禁止** |
| **Research API レート制限** | • Video/Comments API: 1,000リクエスト/日<br>• Followers/Following API: 20,000リクエスト/日<br>• 1リクエストあたり最大100件のレコード |
| **TikTok for Business API** | • Marketing API: 広告キャンペーン管理<br>• **Organic API**: オーガニックコンテンツ管理、クリエイター発見、トレンド特定<br>• **無料**（広告アカウントが必要） |
| **TikTok API for Developers** | • Login Kit: OAuth 2.0ログイン<br>• Display API: 公開ユーザー情報・動画取得<br>• Content Publishing API: 動画・写真投稿<br>• **無料** |
| **取得可能データ** | • 動画情報（説明、いいね、コメント、シェア、再生回数、ハッシュタグ）<br>• ユーザー情報（フォロワー数、フォロー数、総いいね数、動画数）<br>• コメント情報<br>• 音声・音楽情報（間接的） |
| **人気クリエイター・トレンド調査** | • `POST /v2/research/video/query/` - 動画検索（キーワード、ハッシュタグ、ユーザー名、エンゲージメント数でフィルタ可能）<br>• `POST /v2/research/user/info/` - ユーザー情報取得<br>• `POST /v2/research/user/followers/` - フォロワーリスト取得 |
| **制限事項** | • Research APIは**学術機関・非営利組織のみ**<br>• データの鮮度: 最大48時間の遅延<br>• 統計情報の遅延: 最大10日<br>• **For You Pageへのアクセス不可**<br>• 18歳以上の公開アカウントのみ |
| **長所** | • Research APIは無料で大規模データにアクセス可能<br>• 詳細な検索クエリ（エンゲージメント数でフィルタ可能） |
| **短所** | • Research APIは研究者のみがアクセス可能<br>• 審査に非常に時間がかかる<br>• 商用アナリティクスにはBusiness APIが必要 |

**推奨用途**: 学術研究（Research API）、自社アカウント管理（Business API）

**代替案（トレンド調査）**: 
- **TikTok Creative Center**: 無料でトレンド音楽・ハッシュタグ確認可能
- **サードパーティAPI**: Data365、SociaVault等

---

### 1.5 LinkedIn API

| 項目 | 詳細 |
|------|------|
| **価格体系** | • 基本アクセス: 無料<br>• Sales Navigator API: $699/月〜<br>• Enterprise: カスタム料金（$1,000/月〜） |
| **取得可能データ** | • プロフィール情報（限定的）<br>• 企業ページ情報<br>• 求人データ<br>• ソーシャルアクション |
| **利用規約の制約** | • 公開プロフィールデータのみ<br>• 商用利用には審査が必要 |
| **長所** | • B2Bリサーチに最適<br>• 企業・雇用データが豊富 |
| **短所** | • データアクセスが非常に制限的<br>• 高額な有料プラン |

---

### 1.6 Reddit API

| 項目 | 詳細 |
|------|------|
| **価格体系** | • 無料枠: 月1,000回まで<br>• 有料: $0.24/1,000 APIコール |
| **レート制限** | • OAuth使用時: 1分あたり30リクエスト |
| **取得可能データ** | • 投稿（タイトル、本文、スコア、コメント数）<br>• コメント<br>• サブレディット情報<br>• 検索結果 |
| **利用規約の制約** | • **2025年から事前承認が必要**（Responsible Builder Policy） |
| **長所** | • 豊富な議論データ<br>• ニッチなコミュニティのインサイト |
| **短所** | • 有料化された<br>• 事前承認が必須に |

---

### 1.7 Bluesky API (AT Protocol)

| 項目 | 詳細 |
|------|------|
| **価格体系** | **完全無料・オープン** |
| **取得可能データ** | • 投稿（Skeets）<br>• ユーザー情報<br>• フォロー/フォロワー関係<br>• タイムライン<br>• フィード |
| **新機能（2025-2026）** | • **Jetstream**: WebSocketベースのリアルタイムデータ配信<br>• **Sync v1.1**: リレー・ファイアホース同期の効率化<br>• **Auth Scopes**: きめ細かい権限設定 |
| **利用規約の制約** | • AT Protocolに準拠<br>• 分散型なのでデータ所有権がユーザー |
| **長所** | • 完全に無料・オープン<br>• 分散型アーキテクチャ<br>• **APIキー不要**<br>• 急成長中（2025年: 4,141万ユーザー、+60%） |
| **短所** | • ユーザー規模が他プラットフォームより小さい<br>• 分析ツールのエコシステムがまだ発展途上 |

**推奨用途**: 分散型SNSの研究、無料でリアルタイムデータが必要な場合

---

## 2. xAI (Grok) APIとの組み合わせ

### 2.1 xAI API概要（2026年2月時点）

| モデル | 入力（1Mトークン） | 出力（1Mトークン） | 特徴 |
|-------|------------------|------------------|------|
| **Grok 4.1 Fast** | **$0.20** | **$0.50** | コスパ最強、2Mコンテキスト |
| **Grok 4** | $3.00 | $15.00 | 最高品質の推論 |
| **Grok 3** | $3.00 | $15.00 | 前世代フラッグシップ |
| **Grok 3 Mini** | $0.30 | $0.50 | 軽量タスク |
| **Grok 2 Vision** | $2.00 | $10.00 | 画像理解対応 |

**無料クレジット**:
- 新規登録ボーナス: **$25**（30日間有効）
- データ共有プログラム: **$150/月**
- **合計最大: $175/月**

### 2.2 SNSデータ分析との組み合わせ

| 機能 | 説明 | 料金 |
|-----|------|------|
| **X Search（ネイティブツール）** | X（Twitter）投稿のリアルタイム検索 | $5.00/1K回 |
| **Web Search** | リアルタイムWeb検索 | $5.00/1K回 |
| **画像/動画理解** | Vision APIによるメディア分析 | トークン課金 |

### 2.3 SNS分析への応用例

```python
# Xデータとの連携例
import xai_sdk

client = xai_sdk.Client()

# X検索ツールを使用したトレンド分析
response = client.chat.create(
    model="grok-4-1-fast",
    messages=[
        {"role": "system", "content": "あなたはSNSトレンドアナリストです。"},
        {"role": "user", "content": "Xで現在話題になっているテクノロジートレンドを3つ挙げて、それぞれの sentiment を分析してください。"}
    ],
    tools=[
        {"type": "live_search", "allowed_x_handles": ["techcrunch", "verge"]}
    ]
)
```

### 2.4 Grokの強み

| 項目 | Grok (xAI) | OpenAI (GPT-4o) | Anthropic (Claude) |
|-----|-----------|-----------------|-------------------|
| **価格（入力/1M）** | $0.20-$3.00 | $2.50-$5.00 | $1.00-$15.00 |
| **コンテキスト** | **最大2M** | 128K | 200K |
| **リアルタイムXデータ** | **ネイティブ統合** | 検索ツールあり | 検索ツールあり |
| **無料クレジット** | **$175/月** | 限定的 | なし |

**推奨用途**: 
- Xデータのリアルタイム分析
- 大規模SNSデータの要約・分析（2Mコンテキスト）
- コスト重視の高ボリューム処理

---

## 3. サードパーティSNSデータプロバイダー

### 3.1 Brandwatch（エンタープライズ級）

| 項目 | 詳細 |
|------|------|
| **価格体系** | **カスタム価格**（要見積もり、$10,000+/年と推測） |
| **対応SNS** | X、Instagram、Facebook、YouTube、Reddit、TikTok、LinkedIn、ブログ、フォーラム、ニュースサイト |
| **主な機能** | • ソーシャルリスニング<br>• AI搭載のセンチメント分析<br>• トレンド分析<br>• インフルエンサーマーケティング管理<br>• 競合分析<br>• カスタムダッシュボード |
| **API提供** | あり（Enterprise向け） |
| **長所** | • エンタープライズ級の機能<br>• AI搭載の分析機能<br>• 多言語対応<br>• 歴史データへのアクセス |
| **短所** | • 価格が高額<br>• 見積もりが必要で透明性が低い |

---

### 3.2 Sprout Social

| 項目 | 詳細 |
|------|------|
| **価格体系** | • Standard: $199/月<br>• Professional: $299/月<br>• Advanced: $399/月<br>• Enterprise: カスタム価格 |
| **対応SNS** | X、Instagram、Facebook、LinkedIn、Pinterest、TikTok、YouTube |
| **主な機能** | • 投稿スケジューリング<br>• ソーシャルリスニング（Listeningアドオン）<br>• AI Assist要約機能<br>• 分析・レポート<br>• CRM機能 |
| **長所** | • 直感的なUI<br>• 強力なレポート機能<br>• 優れたカスタマーサポート |
| **短所** | • 価格が高め<br>• Listening機能はアドオン |

---

### 3.3 Onclusive Social（旧 Digimind）

| 項目 | 詳細 |
|------|------|
| **価格体系** | **カスタム価格**（エンタープライズ向け） |
| **対応SNS** | X、Facebook、Instagram、YouTube、Reddit、TikTok、LinkedIn、ブログ、ニュース、TV、ラジオ、**Threads** |
| **主な機能** | • 8.5億以上のソースを日次処理<br>• AI Sense技術による高精度感情分析<br>• 2年間の履歴データ検索<br>• TikTok/Threads対応 |
| **長所** | • 業界トップクラスのAI機能<br>• 広範なメディアカバレッジ<br>• 最新プラットフォーム対応 |
| **短所** | • 高額<br>• SMB向けではない |

---

### 3.4 BuzzSumo

| 項目 | 詳細 |
|------|------|
| **価格体系** | • Content Creation: $199/月<br>• PR & Comms: $299/月<br>• Suite: $499/月<br>• Enterprise: $999/月 |
| **対応SNS** | X、Facebook、LinkedIn、Pinterest、Reddit、YouTube |
| **主な機能** | • コンテンツ検索・分析<br>• トレンド発見<br>• インフルエンサー・ジャーナリスト検索<br>• バックリンク分析 |
| **API提供** | あり（Enterpriseプラン） |
| **長所** | • コンテンツマーケティングに特化<br>• 使いやすいUI<br>• ジャーナリストアウトリーチ機能 |
| **短所** | • 上位プランでしかAPI利用不可<br>• Instagram・TikTok対応が弱い |

---

### 3.5 Social Blade

| 項目 | 詳細 |
|------|------|
| **価格体系** | • Bronze: $3.99/月<br>• Silver: $9.99/月<br>• Gold: $24.99/月<br>• Platinum: $99.99/月<br>• API: カスタム価格 |
| **対応SNS** | YouTube、Twitch、Instagram、X、TikTok |
| **主な機能** | • チャンネル統計<br>• 未来予測（推定値）<br>• ランキング<br>• 収益推定（YouTube） |
| **長所** | • 手頃な価格<br>• YouTube分析に特化<br>• 長期間の履歴データ |
| **短所** | • 推定値が多い<br>• データ精度に限界 |

**推奨用途**: YouTuber・インフルエンサーの簡易分析、競合チャンネルの追跡

---

### 3.6 インフルエンサー分析ツール

| ツール名 | 価格 | 対応SNS | 特徴 |
|---------|------|---------|------|
| **HypeAuditor** | カスタム（無料版あり） | Instagram、YouTube、TikTok、X、Twitch | AIによる偽フォロワー検出、オーディエンス品質スコア |
| **Modash** | €99/月〜 | Instagram、YouTube、TikTok | 手頃な価格、シンプルなUI、API対応 |
| **Traackr** | $55,000+/年 | Instagram、YouTube、TikTok、X、Facebook、Pinterest、Twitch | 豊富なデータ、高度な分析機能 |

---

## 4. スクレイピングフレームワーク

### 4.1 Apify

| 項目 | 詳細 |
|------|------|
| **価格体系** | • Free: $0（月5ドル分のクレジット）<br>• Starter: $49/月<br>• Scale: $499/月<br>• Business: $999/月 |
| **対応SNS** | 任意（スクレイパーによる）<br>Instagram、X、TikTokなどの既存アクターあり |
| **主な機能** | • クラウドベースのスクレイピング<br>• スケジュール実行<br>• プロキシ管理<br>• Actorマーケットプレイス |
| **人気アクター（2025-2026）** | • Social Media Email Scraper 2026<br>• Social Insight Scraper<br>• SimilarWeb Scraper V2 |
| **API提供** | あり |
| **長所** | • クラウドベースで簡単<br>• 豊富な既存アクター<br>• 無料枠あり |
| **短所** | • 従量課金で予測困難<br>• SNSの規制変更に弱い |

**推奨用途**: 技術リソースが限られている場合、クラウドベースのスクレイピング

---

### 4.2 スクレイピングツール比較

| ツール名 | 価格 | 特徴 |
|---------|------|------|
| **Scrapy** | 無料（オープンソース） | 高速な非同期クローリング、拡張性高い |
| **Playwright** | 無料（オープンソース） | ヘッドレスブラウザ操作、JavaScriptレンダリング対応 |
| **Phantom Buster** | $69/月〜 | ノーコード自動化、クラウドベース、100+プリビルト自動化 |
| **Octoparse** | $75/月〜 | ビジュアルインターフェース、プリビルトテンプレート |
| **TexAU** | $29/月〜 | 180+自動化、50+ワークフローテンプレート、AI搭載 |

---

### 4.3 プロキシサービス（2026年最新）

| プロバイダー | IPプール | 価格 | 特徴 |
|-------------|---------|------|------|
| **Bright Data** | 1.5億+ IPs（195+カ国） | $5.04/GB〜 | 業界最大級、CAPTCHA解決、スクレイピングツール統合 |
| **Oxylabs** | 1億+ IPs（195+カ国） | $8/GB〜 | 大規模データ操作、高いアップタイム、企業グレード |
| **Smartproxy (Decodo)** | 6,500万+ IPs（195+カ国） | $7/GB〜 | コストパフォーマンス良好、APIアクセス |
| **SOAX** | 1.55億+ IPs（195+カ国） | $6.6/GB〜 | 細かい地理ターゲティング、柔軟な回転制御 |
| **Webshare** | 3,000万+ IPs（195+カ国） | $7/月〜 | **無料プランあり**（10プロキシ）、使いやすい |

---

## 5. AIを活用した新興SNS分析ツール（2025-2026）

### 5.1 AIネイティブツール

| サービス名 | 特徴 | 価格 |
|-----------|------|------|
| **Anomaly AI** | エージェンティックAIによる自律的データ分析。SQLベースの透明性を維持しながら、スキーマ検査からダッシュボード構築まで自動化 | カスタム価格 |
| **Whatagraph IQ** | AIによるレポート自動生成、自然言語でのデータ質問応答（IQ Chat）、ブランド自動検出 | $229/月〜 |
| **FeedGuardians** | AIによるコメント自動モデレート、リアルタイム感情分析、自動応答システム | $39/月〜 |
| **Postiz** | AIアシスタントによる投稿文案生成、ハッシュタグ提案、最適投稿時間予測。オープンソースでセルフホスト可能 | 無料〜 |

### 5.2 自動レポート生成サービス

| サービス名 | 機能 | 価格 |
|-----------|------|------|
| **LATE** | 10以上のSNSプラットフォームに対応した統合API、99.97%アップタイムSLA、AIレポート生成 | 無料〜$299/月 |
| **SINIS for X** | PowerPoint形式の自動レポーティング、競合アカウントの自動収集・分析 | 無料〜¥10,000/月 |

---

## 6. 日本国内特化型サービス

### 6.1 2025-2026年に登場した国内SNS分析ツール

| サービス名 | 提供元 | 特徴 | 価格 |
|-----------|--------|------|------|
| **Social Insight** | ユーザーローカル | 国内最大級のSNSデータ（2,600万アカウント）、LINE/note/mixi対応 | 要問い合わせ |
| **SINIS for X** | テテマーチ | Facebook正規データ利用の国内初Instagram分析ツール、PowerPoint自動レポート | ¥10,000/月〜 |
| **つぶやきデスク** | アユダンテ | チーム運用特化、承認機能、キャンペーン対応 | ¥50,000/月〜 |
| **SocialDog** | SocialDog | 80万以上のアカウント利用、完全日本語対応、国内銀行振込対応 | ¥980/月〜 |
| **ユーザーローカル ChatAI** | ユーザーローカル | 生成AIプラットフォーム、企業独自のChatGPT環境構築 | 無償提供中（2026年3月まで） |

### 6.2 既存サービス

| サービス名 | 特徴 |
|-----------|------|
| **HINOME（ヒノメ）** | 無料で使いやすい、日本語対応、Instagram特化 |
| **SAKIYOMI** | 日本語対応、知識不要で使いやすい、個人事業主〜大手企業まで対応 |
| **A8.net** | 日本最大級のインフルエンサーネットワーク、25年の運用ノウハウ、成果報酬型 |

---

## 7. 選定ガイド

### 7.1 予算別おすすめ構成

#### 無料〜低予算（〜$50/月）

| カテゴリ | 推奨ツール | 価格 | 理由 |
|---------|-----------|------|------|
| **X分析** | X API Free + xAI Grok（$25クレジット） | $0〜$25 | Free tierで基本データ取得、Grokで分析 |
| **YouTube分析** | YouTube Data API | 無料 | 10,000クォータ/日で十分 |
| **Instagram分析** | Meta Business Suite | 無料 | 自アカウントの詳細分析 |
| **TikTok分析** | TikTok Creative Center | 無料 | トレンド音楽・ハッシュタグ確認 |
| **スクレイピング** | Apify Free Tier | 無料 | 月$5分のクレジット |
| **プロキシ** | Webshare Free | 無料 | 10プロキシ |
| **レポート生成** | Postiz | 無料 | AIアシスタント、オープンソース |

**合計: $0〜$25/月**

---

#### 中予算（$50〜$300/月）

| カテゴリ | 推奨ツール | 価格 | 理由 |
|---------|-----------|------|------|
| **X分析** | X API Basic + xAI Grok | $200 + $50 | 15,000読み取り/月、リアルタイムX検索 |
| **YouTube分析** | YouTube Data API + Social Blade | 無料 + $10 | クォータ増量申請 + ランキング分析 |
| **Instagram分析** | Apify Instagram Scraper | $49〜 | 他アカウント分析可能 |
| **TikTok分析** | サードパーティAPI（Data365等） | $50〜 | Research API審査待ちの間 |
| **ソーシャルリスニング** | Brand24 Pro | $249/月 | AI感情分析、リアルタイムモニタリング |
| **プロキシ** | Smartproxy | $50/月 | 5GBプラン |

**合計: $150〜$300/月**

**代替構成（日本市場特化）**:
- SocialDog Business（¥14,800/月）+ SINIS for X（¥10,000/月）+ xAI Grok（$50）

---

#### 高予算（$300〜/月）

| カテゴリ | 推奨ツール | 価格 | 理由 |
|---------|-----------|------|------|
| **包括的リスニング** | Onclusive Social または Brandwatch | $1,000/月〜 | 8.5億ソース、TikTok/Threads対応 |
| **SNS管理・分析** | Sprout Social Advanced | $499/月 | 最先端AI、最高水準のUX |
| **X分析** | X API Pro + xAI Grok | $5,000 + $200 | 100万読み取り/月、大規模分析 |
| **スクレイピング・プロキシ** | Bright Data + Apify Enterprise | $500/月〜 | 業界最高の網羅性、SLA保証 |
| **ダッシュボード** | Tableau/Power BI + SNSコネクタ | 別途ライセンス | 高度なビジュアライゼーション |

**合計: $1,000〜$5,000/月**

---

### 7.2 技術要件別

| 要件 | おすすめ |
|------|----------|
| **プログラミング不要** | Brandwatch、Sprout Social、SINIS for X、SocialDog |
| **API利用可能** | X API、YouTube API、Apify、Bright Data、LATE |
| **リアルタイムデータ** | X API（Filtered Stream）、Onclusive Social、xAI Grok（X Search） |
| **歴史データ** | Brandwatch、Talkwalker、TwitterAPI.io（14年分） |
| **無料で始める** | YouTube API、Social Blade、HINOME、Bluesky API、xAI Grok（$175クレジット） |
| **日本市場特化** | SocialDog、SINIS for X、Social Insight、SAKIYOMI |
| **分散型SNS** | Bluesky API（AT Protocol）、Mastodon API |

---

### 7.3 リサーチエージェント向け推奨構成

#### 推奨構成A: コスト重視（〜$100/月）

```
【データ収集】
├── X: API Free + xAI Grok X Search
├── YouTube: Data API v3（無料）
├── Instagram: Meta Business Suite（自アカウント）+ Apify（他アカウント）
├── TikTok: TikTok Creative Center + サードパーティAPI
└── その他: Bluesky API（無料）

【分析】
├── xAI Grok API（$25〜$50/月）
│   ├── Xデータのリアルタイム分析
│   ├── Web検索による他SNSデータ補完
│   └── 大規模テキストの要約・分析
└── 自前のダッシュボード（Python/Node.js + 無料DB）

【スクレイピング（必要に応じて）】
└── Apify Starter（$49/月）
```

#### 推奨構成B: バランス重視（$300〜$500/月）

```
【データ収集】
├── X: API Basic（$200/月）+ xAI Grok
├── YouTube: Data API + Social Blade Silver（$10/月）
├── Instagram: Apify Scale（$499/月）またはサードパーティAPI
├── TikTok: サードパーティAPI（$100/月程度）
└── その他: Bluesky API

【分析】
├── xAI Grok API（$100/月）
├── Brand24 Pro（$249/月）- ソーシャルリスニング
└── 自前のダッシュボード

【プロキシ】
└── Smartproxy（$50/月）
```

#### 推奨構成C: エンタープライズ（$1,000+/月）

```
【データ収集】
├── X: API Pro（$5,000/月）
├── YouTube: Data API（クォータ増量）+ パートナープログラム
├── Instagram/TikTok: Onclusive Social（$1,000+/月）
└── その他: Brandwatch + Bluesky API

【分析】
├── xAI Grok API（$500/月）
├── Onclusive Social / Brandwatch
├── Sprout Social Advanced（$499/月）
└── Tableau/Power BI

【インフラ】
├── Bright Data（$500/月）
├── Apify Enterprise
└── 専任サポート
```

---

## 8. 重要な注意事項

### 8.1 法的コンプライアンス

1. **利用規約の遵守**: すべてのSNSプラットフォームは利用規約でスクレイピングを禁止している場合があります。公式APIまたは合法的なデータプロバイダーの使用を推奨します。

2. **プライバシー規制**: GDPR、個人情報保護法などの規制に注意が必要です。

3. **データの正確性**: サードパーティデータは推定値を含む場合があります。

4. **APIの変更**: SNSプラットフォームは頻繁にAPIを変更・制限します。

### 8.2 推奨アプローチ

```
フェーズ1: 無料ツールで検証
  ↓ YouTube API + xAI Grok（無料クレジット）+ Social Blade + Bluesky API
  
フェーズ2: 有料APIで拡張
  ↓ X API Basic + Apify + サードパーティTikTok API
  
フェーズ3: エンタープライズツールで本格化
  ↓ Brandwatch or Onclusive Social + X API Pro
```

---

## 9. 参考リンク

### 公式ドキュメント
- [X API Documentation](https://developer.x.com/en/docs)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Meta for Developers](https://developers.facebook.com/docs/instagram)
- [TikTok for Developers](https://developers.tiktok.com/)
- [TikTok Research API](https://www.tiktok.com/research)
- [xAI API Documentation](https://docs.x.ai/)
- [Bluesky API / AT Protocol](https://docs.bsky.app/)

### サービス・ツール
- [Brandwatch](https://www.brandwatch.com/)
- [Sprout Social](https://sproutsocial.com/)
- [Onclusive Social](https://www.onclusive.com/social/)
- [BuzzSumo](https://buzzsumo.com/)
- [Social Blade](https://socialblade.com/)
- [Apify](https://apify.com/)
- [Bright Data](https://brightdata.com/)

### 日本国内サービス
- [SocialDog](https://socialdog.app/)
- [SINIS for X](https://sinis.xxx/)
- [SAKIYOMI](https://sakiyomi.com/)
- [HINOME](https://hinome.jp/)

---

*最終更新: 2026年2月*
