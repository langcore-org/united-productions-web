# YouTube/Instagramリサーチ統合（本格導入）

> **優先度**: ⏸️ 保留（4月以降）  
> **発見日**: 2026-02-26  
> **最終更新**: 2026-03-05（Teddy統合前提・月50万円予算・外注リサーチ代替を目標に更新）  
> **関連ファイル**: lib/llm/tools/sns-research.ts  
> **ステータス**: PoC検証待ち  

---

## 背景

Teddyのリサーチ機能（人探し、ロケ地探し、エビデンス確認）に、**YouTube/InstagramのSNSリサーチを統合**することを検討。
UI付きのSNS管理ツールを導入するのではなく、**バックエンドAPIとして統合**し、Teddyの既存インターフェースから利用できるようにする。

## 前提条件

- **統合方式**: TeddyのバックエンドにAPI連携（UIツールの導入はしない）
- **予算**: **月50万円（目下）** → 有用性確認後、必要に応じて拡張可能
- **最終目標**: **月間数百万円の外注リサーチを代替**
- **重視する価値**: 
  1. **リアルタイム性**: 今話題の人物・トレンドを即座に捕捉
  2. **正確性**: 信頼できるデータ源、誤報リスクの排除
  3. **広範性**: 多様なSNSプラットフォームを網羅的にカバー
- **投資判断**: 有用性が確認されれば、さらなるコスト増も検討
- [SNS有料ツール統合検証](../../plans/development/sns-paid-tool-verification.md)の結果が「導入推奨」であること
- United Productions様での費用承認

---

## Teddy統合前提の最適構成（月50万円予算・外注代替目標）

### 目標：月間数百万円のリサーチ外注を代替

**現状の課題**:
- リサーチ会社への外注費：月間数百万円
- 納期の遅延、リアルタイム性の欠如
- クライアント（United Productions）からの「今すぐ知りたい」要望への対応困難

**Teddy統合による解決**:
- リアルタイムデータアクセス（数秒〜数分で結果取得）
- 24時間体制の自動監視・通知
- 人探し・ロケ地・エビデンス機能のSNSデータによる強化

---

### Phase 1：初期構成（月50万円）- 即座に開始

| コンポーネント | 推奨サービス | 月額費用 | 統合内容・価値 |
|--------------|-------------|----------|----------------|
| **グローバルSNS基盤** | **Brandwatch API** | 10万円〜 | • **1.4兆件データ**へリアルタイムアクセス<br>• **Iris AI**: 自然言語で「今話題の◯◯」を即座に検索<br>• 過去データ遡及（2008年〜）<br>• Teddy「人探し」に統合 |
| **国内SNS基盤** | **Social Insight API** | 5万円〜 | • **2600万国内アカウント**<br>• LINE/TikTok/YouTube/Instagram/X対応<br>• 日本独自のSNSデータをTeddyに統合 |
| **炎上リスク監視** | **Buzz Finder API** | 8.8万円 | • **X全量データ**リアルタイム監視<br>• キーワードアラートをTeddy「エビデンス」に統合<br>• **異常検知時即座に通知** |
| **YouTube詳細分析** | **YouTube Data API**<br>+ クォータ拡張 | 無料〜 | • チャンネル統計取得<br>• **人気動画チャート**で「今話題のYouTuber」を自動発見<br>• クォータ拡張で大規模検索可能 |
| **エージェンティックAI** | **Gumloop** | $37（約5,500円） | • **週次トレンドレポート自動生成**<br>• Teddy DBに自動保存<br>• 「今週の話題人物」レポートを自動作成 |
| **インフラ・運用** | プロキシ・監視 | 5万円 | • データ取得の安定性確保<br>• 監視・ログ基盤 |

**合計月額**: 約**30万円**（予算内に余裕あり）

---

### 主要ツールの口コミ・評判（xAI web_search調査：G2/Capterra/X/Reddit）

#### Brandwatch（グローバルSNS基盤）

**評価スコア**:
- G2: 4.2/5 (830+ reviews)
- Capterra: 4.2/5 (230+ reviews)
- 更新意向: 96%

**ポジティブ（X/Reddit）**:
> 「1億以上のデータソースから1.4兆件以上の過去投稿データにアクセス可能—X, Reddit, Tumblr, Facebook, Instagramの公式firehoseアクセス」— Reddit r/socialmedia

> 「高度なBooleanクエリ構築が可能で、詳細な分析ができる。AI-driven insights, Iris image analysisが強力」— Reddit r/marketing

> 「30M+ creators databaseでインフルエンサー発見・管理に強い」— X/Twitter

> 「Very easy to use and understandable」— G2

**ネガティブ（X/Reddit）**:
> 「Brandwatch costs $1k for 10k mentions and has pricing editions from $800 to $3,000—中小企業にはアクセスしづらい価格帯」— Reddit r/smallbusiness

> 「No public pricing or self-serve plans, making budgeting and comparison harder」— X/Twitter

> 「Complexity and breadth can create a steep learning curve for smaller teams」— Reddit r/socialmedia

> 「Customer service is poor and that makes or breaks a company—You tend to get handed from person to person when seeking assistance」— G2

> 「Users dislike Brandwatch's limitations when integrating with TikTok and Instagram public posts」— Reddit r/marketing

> 「Brandwatch treats social media like a science experiment... gives you every possible metric and data point, then leave you to figure out what to do with it（データパラダイス問題）」— Reddit r/analytics

**よくある比較**:
- Sprout Social: 価格帯は似ているが、Brandwatchは傾聴に強く、Sproutは管理機能に強い
- Hootsuite: Hootsuiteは予約投稿・管理に強く、Brandwatchは分析・傾聴に強い

**実際の利用企業**: Up&Up Group, Nilfisk, Clinical Partners, Insta360

---

#### Social Insight（国内SNS基盤）

**評価スコア**:
- Capterra: 4.2/5
- ITreview: 高評価多数

**ポジティブ（X/Reddit/国内口コミ）**:
> 「FacebookやInstagram、Google+、twitter、YouTube、LINE、Pinterest、TikTok、mixiとさまざまなSNSに対応—日本で使われる主要SNSをほぼ網羅」— 国内レビュー

> 「複数のSNSアカウントを一括管理できたり、予約投稿ができたり」— ITreview

> 「生成AIがX（Twitter）の口コミを自動で収集し、要約する「AIトピック要約」機能で業務効率化」— X/Twitter

> 「SNS上でのRT&フォローでプレゼントキャンペーンを手動でやろうとすると手間と時間がものすごくかかるが、Social Insightを導入すればほとんどの作業を自動でやってくれる」— 国内レビュー

> 「他社のサービスに比べ、費用が格段に安いのにも関わらず、他社サービスよりも機能がたくさんあり」— ITreview

**ネガティブ（X/Reddit/国内口コミ）**:
> 「Social Insightは比較するのに必要な金額などの情報を資料請求しないとみれません—その一手間がわずらわしく思えてしまう」— 国内レビュー

> 「中国のSNS（Weibo、Wechatなど）に対応していない—世界市場を対象にする企業には不向き」— X/Twitter

> 「投稿管理ができないものがある。例えば、LINEの投稿、Twitterのリツイートや引用RTなどが管理できない—安心していると思わぬところで炎上することも」— 国内レビュー

> 「検索キーワードの数には上限がある」— ITreview

**よくある比較**:
- Buzz Finder: どちらも国内SNS分析ツールだが、Buzz FinderはX（Twitter）のリアルタイム性に強く、Social Insightは複数SNSの統合管理に強い
- Tofu Analytics: 低価格帯のTofu Analytics（月額1万円〜）と比較される

**特記事項**: 導入前の情報収集には不満がある一方、実際に導入したユーザーの満足度は高いという特徴的なパターン

**実際の利用企業**: 日本テレビ, フジテレビ, テレビ朝日, J:COM, サントリー食品, LIFULL, ファミリーマート, 資生堂, カプコン

---

#### Buzz Finder（炎上リスク監視）

**ポジティブ（X/Reddit/国内口コミ）**:
> 「X（Twitter）公式全量データを業界最速水準で収集できる—無料API経由ではなく、X公式全量データから直近の投稿をほぼリアルタイムに収集」— 国内レビュー

> 「風評被害や炎上などリスクにつながる投稿をほぼリアルタイムで検出」— テレビ東京Plus Business

> 「スパム投稿などのノイズを除去し、高精度な収集と分析を実現」— NTT Com

> 「前日のポスト量や話題の概要、関連投稿の一例を毎日メールで配信。ツールにログインすることなくトピックを把握できる」— 導入企業レビュー

> 「月額88,000円〜と明確で、14日間の無料トライアルもある」— 公式サイト

**ネガティブ（X/Reddit/国内口コミ）**:
> 「多様な分析機能を備えているため、使いこなすまでに時間を要する可能性がある」— 国内レビュー

> 「初期費用：要問い合わせ」— 価格情報の一部非公開

> 「自分たちでさまざまな設定変更を試みている。他社製品は多機能で複雑な設定が必要で、また利用開始までに期間が必要」— 導入企業フィードバック

**よくある比較**:
- Social Insight: 国内2大SNS分析ツールとして比較される
- Meltwater: グローバル対応のMeltwaterと比較されることがあるが、Buzz Finderは日本市場・日本語特化

**特記事項**: ソーシャルリスニングSaaS市場シェア2位（デロイト調査 2020年度）。「迅速なアラート通知やレポートにより、メディア対応やプレスリリースを迅速かつ的確にできた」という効果が報告されている

---

#### Gumloop（エージェンティックAI）

**評価スコア**:
- G2: 4.8/5（174 reviews）
- 使いやすさ: 9.4/10

**ポジティブ（X/Reddit）**:
> 「The most beautiful UI I've encountered in the automation space—Gumloop just feels good to use」— Reddit r/automation

> 「Gumloop is built for complex, AI-powered batch operations—GPT-4, Claude 3.5 Sonnet, Gemini (switchable per task)」— Reddit r/AI

> 「Enrich 100 leads: Manual ~8 hours → Gumloop ~25 minutes (93% faster)」— X/Twitter

> 「Generate 50 personalized emails: Manual ~5 hours → Gumloop ~15 minutes (95% faster)」— Reddit r/marketing

> 「147 qualified leads with personalized messages generated in 2.5 hours (would have taken 3+ days manually)」— G2

> 「The Chrome extension is brilliant—Extract LinkedIn profile data for 200+ prospects in one afternoon」— Reddit r/sales

> 「$37/month for 10K+ credits—Gumloop punches above its weight for the price」— Reddit r/smallbusiness

**ネガティブ（X/Reddit）**:
> 「Gumloop requires more learning than Zapier but less than n8n—Moderate learning curve (2-3 hours to build first complex flow)」— Reddit r/automation

> 「Credit unpredictability: Some workflows consumed way more credits than expected—Pricing climbs fast though, so watch out」— Reddit r/Gumloop

> 「Limited traditional triggers: Only 11 trigger types available—Not designed to replace traditional automation platforms」— X/Twitter

> 「Occasional scraping failures: About 5% of web scrapes failed due to anti-bot measures」— Reddit r/webscraping

> 「Teams requiring 1000+ app integrations – Gumloop has ~100, not thousands」— Reddit r/automation

> 「APIがbeta版で機能していない、カスタマーサポートの応答が遅い」— G2

**よくある比較**:
- Zapier: Zapierは単純な自動化に強く、Gumloopは複雑なAIバッチ処理に強い
- Make: Makeは技術者向けの細かい制御に強く、GumloopはAI統合とUIの美しさで勝る
- n8n: n8nはセルフホスト可能で無料だが、Gumloopはセットアップ不要で企業セキュリティ対応

**特記事項**: Y Combinator出身（Max Brodeur-Urbas氏創業）。Webflow、Rippling、Parallelなどの企業が利用。SOC 2 Type 2、GDPR対応済み。人間が3日かかる作業を2.5時間に短縮するケースあり

---

#### Hootsuite（参考：SNS管理ツール）

**評価スコア**:
- G2: 4.0/5
- Capterra: 4.4/5

**ポジティブ（X/Reddit）**:
> 「Hootsuite integrates with over 100 tools across various industries—Supports 35+ platforms」— Reddit r/socialmedia

> 「I absolutely love this program—It is awesome to set a schedule of posting」— G2

> 「Hootsuite has the most robust approval and permissions structure out of all the social media management tools」— Reddit r/marketing

> 「$99/month for 10 social accounts」— 価格の手頃さ

**ネガティブ（X/Reddit）**:
> 「It doesn't have a friendly user interface (feels quite outdated)—Dense and cluttered」— Reddit r/socialmedia

> 「Widely overpriced for small businesses—Pricing for premium features feels a bit steep」— Reddit r/smallbusiness

> 「Hootsuite was giving us an error saying that we had exceeded our character limit for our TikTok caption (an error we did not get with other tools)」— Reddit r/TikTok

> 「Hootsuite failed to offer reliable customer service—long wait times and unhelpful responses」— G2

> 「Hootsuite is overloaded with features we didn't need, coupled with an outdated interface」— Reddit r/socialmedia

**特記事項**: 創業が早く機能が多い一方で、UI/UXが旧式化し、新興ツール（Buffer、Agorapulse）にユーザーが流出している傾向

---

#### Sprout Social（参考：SNS管理ツール）

**評価スコア**:
- G2: 4.4/5
- Trustpilot: 2.3/5（Poor）

**ポジティブ（X/Reddit）**:
> 「The dashboard is clean and intuitive. Beginners can jump in without a steep learning curve」— Reddit r/socialmedia

> 「More detailed and customizable analytics—Sprout Social leads in analytics」— Reddit r/marketing

> 「Plaid grew its LinkedIn following from 70,000 to over 131,000 in just one year (60% increase) with Smart Inbox」— ケーススタディ

> 「I've used Sprout Social at every company I've worked at since 2013. No other social management platform matches its extensive capabilities」— 12年以上の長期ユーザー

> 「Papa Johns: Cut customer service response times by 50%, now manages over 600 cases weekly, and saves more than 830 hours annually」— 大企業成功事例

**ネガティブ（X/Reddit）**:
> 「Plans start at $199 per user per month—The biggest downside is the price tag—High cost for small teams」— Reddit r/smallbusiness

> 「The entry-level plan caps you at five social profiles—If you're managing multiple clients or brands, this constraint could require upgrading sooner than expected」— Reddit r/agency

> 「Advanced listening alone costs $999 per month extra」— 高額アドオン

> 「Trustpilot shows a 'poor' rating of 2.3—Some users reporting issues around cancellations, slow response times」— X/Twitter

> 「Many times I have scheduled posts that have not gone live, which leads to double-posting」— G2

**特記事項**: 「高いが使えば元が取れる」という意見と「小規模チームには高すぎる」という意見の二極化

---

### X/Redditからの重要な洞察・驚きの意見

#### 1. Brandwatchの「データパラダイス」問題
> 「Brandwatch treats social media like a science experiment... gives you every possible metric and data point, then leave you to figure out what to do with it」— Reddit r/analytics

**教訓**: データは豊富だが、活用方法は自分で考える必要がある。Teddy統合時は、AIエージェントがデータを解釈・要約する機能が重要

#### 2. Gumloopの「超効率化」実績
- 人間が3日かかる作業 → 2.5時間に短縮
- リードエンリッチメント: 8時間 → 25分（93%短縮）
- パーソナライズメール生成: 5時間 → 15分（95%短縮）

**教訓**: AI自動化ツールのポテンシャルが非常に高い。週次レポート自動化で大幅な工数削減が期待できる

#### 3. 日本市場の特殊性
Social InsightとBuzz Finderは、グローバルツールとは異なる評価軸で競争:
- 日本SNS対応（LINE, mixi, note）
- 日本語分析精度
- 国内企業の導入実績（日本テレビ, フジテレビ, テレビ朝日）

**教訓**: グローバルツールだけでは日本の出演者リサーチは不十分。国内ツールとの組み合わせが必須

#### 4. 「リスニング vs 管理」分担の現実
多くのエンタープライズ企業が以下の使い分けをしている:
- **リスニング/分析**: Brandwatch（傾聴に強い）
- **管理/投稿**: Hootsuite/Sprout Social（管理機能に強い）

**教訓**: Teddy統合では「リスニング・分析機能」を重視すべき。管理機能は不要

#### 5. Hootsuiteの「老朽化」問題
> 「Hootsuite is overloaded with features we didn't need, coupled with an outdated interface」— Reddit

創業が早く機能が多い一方で、UI/UXが旧式化。新興ツール（Buffer、Agorapulse）にユーザーが流出

**教訓**: 歴史の長さ≠良さ。APIの質とデータの鮮度が重要

#### 6. Sprout Socialの価格二極化
- 「高いが使えば元が取れる」vs「小規模チームには高すぎる」
- 高度なリスニング機能は月$999の追加料金

**教訓**: Teddy統合には高額プランの機能が必要な場合、BrandwatchやSocial Insightの方がコスパが良い可能性

---

### Phase 2：拡張構成（月50万円フル活用）- 3ヶ月後

| 追加コンポーネント | 推奨サービス | 月額費用 | 追加価値 |
|-------------------|-------------|----------|----------|
| **TikTok専用分析** | **TikTok for Business API**<br>+ サードパーティ | 10万円 | • Z世代出演者の発掘<br>• バズ動画のリアルタイム検知 |
| **画像・動画分析** | **Brandwatch画像解析**<br>（アドオン） | 5万円 | • 出演者の過去画像検索<br>• ロゴ・製品のSNS出現検知 |
| **予備・拡張費** | 各種 | 5万円 | • API制限時のバックアップ<br>• 新規プラットフォーム追加 |

**合計月額**: 約**50万円**

---

### Phase 3：完全代替構成（月100万円超）- 有用性確認後

| 追加コンポーネント | 推奨サービス | 月額費用 |
|-------------------|-------------|----------|
| **Brandwatchエンタープライズ** | フルライセンス | 20万円 |
| **専任エンジニア** | 外部リソース | 30万円 |
| **カスタム開発** | Teddy統合の深化 | 20万円 |
| **合計** | | **約100万円** |

→ それでも外注費（数百万円）の**1/3以下**で、リアルタイム性・正確性・広範性を実現

---

## ROI試算：外注代替の効果

| 項目 | 外注時 | Teddy統合後 |
|------|--------|-------------|
| **月間コスト** | 300万円（想定） | 30万円（Phase1）〜50万円（Phase2） |
| **納期** | 数日〜1週間 | **即座〜数分** |
| **リアルタイム監視** | 不可 | **24時間体制** |
| **データ範囲** | 依頼内容次第 | **1.4兆件+2600万国内アカウント** |
| **年間削減額** | - | **3000万円以上**（Phase2時） |

**投資回収期間**: 約**1ヶ月**（月50万円投資 vs 月300万円削減）

---

## 検討対象ツール詳細

### 1. グローバルSNS管理・分析ツール

| ツール | 対応SNS | 料金目安 | 特徴 | 口コミ・評価 |
|--------|---------|----------|------|--------------|
| **Brandwatch** | YouTube, Instagram, X, TikTok等 | **£500/月〜**<br>(約10万円/月〜) | • 1.4兆件以上のデータ分析<br>• AI/機械学習による画像解析<br>• X全量データアクセス<br>• エンタープライズ向け | G2: 4.4/5<br>Capterra: 4.3/5<br>[口コミ](https://boxil.jp/mag/a1562/): 「高機能だが導入コスト高」<br>[詳細](https://adrim.co.jp/adma/socialmedia-analysis-tools/) |
| **Sprout Social** | YouTube, Instagram, X等 | **$249/ユーザー/月〜**<br>(約3.7万円/ユーザー/月〜) | • 最先端AI機能<br>• Smart Inbox統合管理<br>• 15億以上のデータソース<br>• ViralPost最適化機能 | G2: 4.4/5（3,834件）<br>[口コミ](https://statusbrew.co.jp/insights/statusbrew-vs-sprout-social): 「高額だが機能充実、日本語非対応」<br>[料金詳細](https://suitup.jp/blog/24316/) |
| **Hootsuite** | YouTube, Instagram, X等 | **$99/月〜**<br>(約1.5万円/月〜) | • 業界標準（2008年創業）<br>• Fortune 1000企業の800社以上採用<br>• 日本語対応<br>• 35以上のSNSプラットフォーム対応 | G2: 4.1/5<br>ユーザー満足度: 99%<br>[口コミ](https://www.aspicjapan.org/asu/article/11582): 「複数SNS一元管理に便利」<br>[比較記事](https://liskul.com/sns-management-tool-123474) |

#### Brandwatchの詳細
- **Proプラン**: £500/月（中小ブランド向け）
- **Enterprise/M**: £2,000/月（大規模ブランド・代理店向け）
- **導入企業**: スタイリングライフ・ホールディングス BCLカンパニー、ライオン株式会社、大日本印刷株式会社等
- **評価**: 市場調査・競合分析に強いが、B2Bではデータ活用が難しい場合も（[口コミ](https://boxil.jp/mag/a1562/)）
- [公式サイト](https://www.brandwatch.com/)

**Teddy統合での評価**: ⭐⭐⭐⭐⭐
- ✅ **API提供あり**: EnterpriseプランでTeddyバックエンドに統合可能
- ✅ **Iris AI**: 自然言語で出演者検索「今話題の料理人を探して」をAPI経由で実行
- ✅ **1.4兆件データ**: 過去の炎上リスク網羅的検索
- ✅ **リアルタイム性**: 50,000件/秒のデータ取り込みで「今」話題を即座に捕捉
- ⚠️ **日本データ**: 地方タレント等のローカルデータはSocial Insightで補完
- 💡 **統合案**: Teddyの「人探し」機能からBrandwatch APIを呼び出し、検索結果をTeddy UIに表示
- 💰 **月額**: £500（約10万円）で予算内に十分余裕あり
- 🎯 **外注代替貢献**: グローバルスター・海外インフルエンサーの調査をリアルタイム化

#### Brandwatch 口コミ・評判（xAI調査）

**評価スコア**:
- G2: 4.2/5
- Capterra: 4.2/5
- Value for Money: 3.8/5（価格に対する価値はやや低め）

**ポジティブな口コミ**:
> 「直感的なダッシュボードと強力なデータ収集機能。消費者インサイトの分析が簡単」— G2レビュー

> 「データ収集が素晴らしく、カスタマーサポートが素晴らしい」— Capterraレビュー

> 「モジュラープライシングにより手頃な価格で提供」— GetAppレビュー

**ネガティブな口コミ**:
> 「リスト価格はかなり高い。中小企業には衝撃的な価格」— G2レビュー

> 「センチメント分析の精度が低い、ナビゲーションとデータフィルタリングが困難」— G2レビュー

> 「更新戦術が不透明で、顧客に不利なアプローチ」— Capterraレビュー

**実際の利用企業**:
- Up&Up Group: 文化的関連性を大規模に定量化
- Nilfisk: ソーシャルメディアコンテンツの計画・スケジューリングを効率化
- Clinical Partners: ソーシャル戦略強化
- Insta360: インフルエンサーマネジメント改善

**価格評価**:
- 年間契約の中央値: $50,000（約750万円）
- エンタープライズ向けの価値は高いが、中小企業には高価
- 料金に対する価値評価は3.8/5とやや低め
- **評価**: 高機能だが高価。Teddy統合による自動化で人的コストを削減することで、価格を正当化できる

#### Sprout Socialの詳細
- **Standard**: $249/ユーザー/月（約37,350円）
- **Professional**: $399/ユーザー/月（約59,850円）
- **Advanced**: $499/ユーザー/月（約74,850円）
- **特徴**: AI駆動の高度な分析、年間契約で20%割引
- **導入企業**: Microsoft、Stanford University、Spotify
- **注意点**: 日本語UI非対応、サポートは英語主体
- [公式サイト](https://sproutsocial.com/)

**Teddy統合での評価**: ⭐⭐☆☆☆
- ✅ **API提供あり**: Advancedプラン以上でAPI利用可能
- ✅ **Trellis AI**: 自然言語での出演者分析が強力
- ❌ **日本語非対応**はTeddy統合時も課題（出力の翻訳処理が必要）
- ❌ **日本データ不足**: 国内タレント・芸人のデータが少ない
- ❌ **UI非依存でも問題**: APIレスポンスも英語主体
- 💡 **判断**: 日本のテレビ制作ではデータ不足がネックとなり、却下推奨

#### Hootsuiteの詳細
- **Professional**: $99/月（約14,850円）- 10ソーシャルプロファイル、1ユーザー
- **Team**: $249/月（約37,350円）- 20ソーシャルプロファイル、3ユーザー
- **Enterprise**: カスタム価格（年額16,000ドル〜）
- **特徴**: 日本語対応、無料トライアル30日間
- [公式サイト](https://www.hootsuite.com/)

**Teddy統合での評価**: ⭐⭐☆☆☆
- ✅ **API提供あり**: EnterpriseプランでAPI利用可能
- ✅ **日本語対応**
- ❌ **UI中心の設計**: APIは充実しているが、分析機能はUI前提
- ❌ **エンタープライズ必要**: API活用には高額プランが必要
- ❌ **分析データがUI依存**: Teddy統合に必要な生データ取得は弱い
- 💡 **判断**: UIツールとしては優秀だが、Teddy統合には不向き

---

### 2. 国内SNS分析ツール

| ツール | 対応SNS | 料金目安 | 特徴 | 情報ソース |
|--------|---------|----------|------|------------|
| **Tofu Analytics** | X, Instagram, LINE, TikTok, YouTube | **月額1万円〜** | • インフルエンサー特定機能<br>• 炎上リスク分析<br>• 公式API認定 | [詳細](https://tofuanalytics.jp/)<br>[口コミ](https://boxil.jp/mag/a3049/) |
| **Buzz Finder** | X（メイン）+オプションでInstagram等 | **月額8.8万円〜** | • X全量データリアルタイム収集<br>• 炎上検知・アラート機能<br>• NTTドコモ系列 | [詳細](https://www.m-solution.co.jp/buzzfinder/)<br>[評価](https://www.tv-tokyo.co.jp/plus/business/entry/202403/14788.html) |
| **Social Insight** | X, Instagram, Facebook, YouTube, TikTok等 | **月額5万円〜** | • 数百億件の投稿データ解析<br>• 炎上検知アラート<br>• レポート自動化 | [詳細](https://www.userlocal.jp/socialinsight/)<br>[評価](https://liskul.com/sns-analysis-104823) |
| **Statusbrew** | 16種類以上（X, Instagram, LINE, Bluesky等） | **月額3.5万円〜**<br>(年払い) | • 259種類以上の分析指標<br>• Googleレビュー分析も可能<br>• 日本語ローカライズ対応 | [詳細](https://statusbrew.co.jp/)<br>[評価](https://www.aspicjapan.org/asu/article/11582) |

#### 国内ツール比較のポイント
- **Tofu Analytics**: コスパ重視、インフルエンサーマーケティングに特化（[詳細](https://www.tv-tokyo.co.jp/plus/business/entry/202403/14788.html)）
- **Buzz Finder**: リスクモニタリング・炎上対策に強み（[詳細](https://www.aspicjapan.org/asu/article/11582)）
- **Statusbrew**: Sprout Socialの代替として高評価（G2評価4.8/5）、日本語サポート充実（[比較記事](https://statusbrew.co.jp/insights/statusbrew-vs-sprout-social)）

#### 国内ツール：Teddy統合での適性

| ツール | 適性 | 評価ポイント |
|--------|------|--------------|
| **Tofu Analytics** | ⭐⭐⭐⭐☆ | • **API提供あり**: Teddy「人探し」に統合可能<br>• **インフルエンサー特定API**で出演者発掘<br>• 1万円〜の低価格<br>• LINE/TikTok対応でZ世代出演者発掘に強い<br>• ⚠️ エンタープライズ向けAPIは要確認 |
| **Buzz Finder** | ⭐⭐⭐⭐⭐ | • **API提供あり**: X全量データへリアルタイムアクセス<br>• **8.8万円/月**で予算内<br>• 炎上検知APIでTeddy「エビデンス」機能に統合可能<br>• 日報データをTeddy DBに自動保存可能<br>• **最も推奨**: 国内SNSデータ + API連携 + 予算内 |
| **Social Insight** | ⭐⭐⭐⭐⭐ | • **API提供あり**: 2600万国内アカウントへアクセス<br>• **5万円/月**でコスパ最良<br>• LINE/note/mixi対応で独自データ<br>• レポート自動化APIでTeddyに統合可能<br>• **最も推奨**: 予算・機能・API連携のバランス最良 |
| **Statusbrew** | ⭐⭐⭐☆☆ | • API提供あり<br>• 3.5万円〜で低価格<br>• ⚠️ 芸能人・タレント特化のAPI機能は限定的<br>• インフルエンサーマーケティング向け |

---

### 3. API直接統合の選択肢

#### YouTube Data API v3

| 項目 | 内容 |
|------|------|
| **料金** | **無料枠あり**（1日10,000ユニット/プロジェクト） |
| **クォータ消費** | • 動画検索: 100ユニット/回<br>• 動画詳細取得: 1ユニット/回<br>• チャンネル情報: 1ユニット/回 |
| **制限** | • デフォルトのままでは高頻度検索は不可<br>• 上限引き上げにはGoogleの監査が必要（数週間かかる） |
| **計算例** | 10分おきに検索を行う場合: 144回/日 × 100ユニット = **14,400ユニット**（デフォルト上限超過） |

**出典**:
- [ITmedia記事](https://blogs.itmedia.co.jp/serial/2026/01/osint_ai4_1.html) - OSINT + AIトレンド分析
- [Google Developers](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)
- [Expertflow Guide](https://docs.expertflow.com/cx/4.9/understanding-the-youtube-data-api-v3-quota-system)

**YouTube Data API：Teddy統合での評価**: ⭐⭐⭐⭐⭐
- ✅ **完全無料**でTeddyに統合可能
- ✅ **REST API**: Teddyバックエンドから直接呼び出し可能
- ✅ チャンネル登録者数・総視聴回数を取得し、Teddy「人探し」結果に表示
- ✅ 人気動画チャートAPIで「今話題のYouTuber」を自動発見
- ⚠️ 検索は100ユニット/回と高コスト → **クォータ拡張申請**で解決可能
- 💡 **統合案**: Teddyの「人探し」でYouTuberを検索時、API経由で統計を自動取得・表示
- 💰 **月額**: 無料（クォータ拡張申請は審査のみで追加費用なし）

#### Instagram Graph API

| 項目 | 内容 |
|------|------|
| **料金** | **無料**（ただし審査と制限あり） |
| **対象アカウント** | **ビジネスアカウント・クリエイターアカウントのみ** |
| **重要な変更** | 2024年12月4日に**Instagram Basic Display APIが廃止**<br>→ 個人アカウントの外部連携が完全に不可能に |
| **レート制限** | 短時間での大量アクセスは制限される |
| **取得可能データ** | • 投稿の表示<br>• パフォーマンス分析<br>• コンテンツ管理<br>• ハッシュタグ検索（限定的） |
| **取得不可データ** | • 他ユーザーの詳細情報<br>• 非公開アカウントの情報 |

**出典**:
- [GMO記事](https://www.koukoku.jp/service/suketto/marketer/sns/%E3%80%902025%E5%B9%B4%E6%9C%80%E6%96%B0%E3%80%91instagram-api%E3%81%A8%E3%81%AF%EF%BC%9F%E6%9C%80%E6%96%B0%E3%82%A2%E3%83%83%E3%83%97%E3%83%87%E3%83%BC%E3%83%88%E3%82%92%E6%8A%BC%E3%81%95%E3%81%88%E3%81%A6%E5%B7%AE%E3%82%92%E3%81%A4%E3%81%91%E3%82%8B%E6%B4%BB%E7%94%A8%E8%A1%93/) - Instagram API最新情報
- [Meta for Developers](https://developers.facebook.com/docs/instagram-api/)

**Instagram Graph API：Teddy統合での評価**: ⭐⭐☆☆☆
- ✅ **無料**でTeddyに統合可能
- ✅ 出演者のInstagram基本情報（フォロワー数、投稿数）を取得
- ⚠️ **ビジネスアカウントのみ対応**で個人アカウントは取得不可（大半の出演者対象外）
- ⚠️ ハッシュタグ検索は7日間で30個までと厳しい制限
- ⚠️ **他ユーザーの詳細データ取得不可**: 個人アカウントの検索ができないため、出演者リサーチには不向き
- 💡 **判断**: ビジネスアカウントのみの制限がネックとなり、**却下推奨**
- 💡 **代替案**: Social Insight APIやBuzz Finder APIでInstagramデータを取得

---

### 4. スクレイピング・代替アプローチ（API制限時の選択肢）

APIの制限を補完するため、スクレイピングフレームワークも検討対象。
⚠️ **法的コンプライアンス注意**: 各SNSプラットフォームの利用規約でスクレイピングを禁止している場合がある。公式APIまたは合法的なデータプロバイダーの使用を推奨。

#### 4.1 Apify（クラウドベーススクレイピング）

| 項目 | 詳細 |
|------|------|
| **価格体系** | • Free: $0（月5ドル分のクレジット）<br>• Starter: $49/月<br>• Scale: $499/月<br>• Business: $999/月 |
| **対応SNS** | 任意（スクレイパーによる）<br>Instagram、X、TikTokなどの既存アクターあり |
| **主な機能** | • クラウドベースのスクレイピング<br>• スケジュール実行<br>• プロキシ管理<br>• Actorマーケットプレイス |
| **人気アクター（2025-2026）** | • Social Media Email Scraper 2026<br>• Social Insight Scraper<br>• SimilarWeb Scraper V2<br>• Instagram Profile Scraper<br>• YouTube Video Scraper |
| **API提供** | あり |
| **長所** | • クラウドベースで簡単<br>• 豊富な既存アクター（YouTube/Instagram専用も多数）<br>• 無料枠あり<br>• コード不要で利用可能 |
| **短所** | • 従量課金で予測困難<br>• SNSの規制変更に弱い<br>• 規約違反のリスク |

**推奨用途**: 技術リソースが限られている場合、またはAPIで取得できない補足データが必要な場合

**出典**: [Apify公式](https://apify.com/)

**Apify：Teddy統合での評価**: ⭐☆☆☆☆
- ✅ **Instagram Profile Scraper**で出演者の投稿履歴を一括取得可能
- ❌ **法的リスク**: Instagram/YouTubeの規約違反、Teddy統合としてリスクが高すぎる
- ❌ **Teddy統合に不向き**: スクレイピングは不安定で、Teddyの信頼性を損なう
- ❌ 従量課金で予測困難、サイト変更で突然動作しなくなる
- 💡 **判断**: **Teddy統合には推奨しない**。公式API（Social Insight等）を優先
- 💡 **例外**: どうしても必要な過去データのみ、手動での補完調査として限定的使用

---

#### 4.2 その他のスクレイピングツール比較

| ツール名 | 価格 | 特徴 | YouTube/Instagram対応 |
|---------|------|------|---------------------|
| **Scrapy** | 無料（オープンソース） | 高速な非同期クローリング、拡張性高い | カスタム開発が必要 |
| **Playwright** | 無料（オープンソース） | ヘッドレスブラウザ操作、JavaScriptレンダリング対応 | カスタム開発が必要 |
| **Phantom Buster** | $69/月〜 | ノーコード自動化、クラウドベース、100+プリビルト自動化 | Instagram/X抽出アプリあり |
| **Octoparse** | $75/月〜 | ビジュアルインターフェース、プリビルトテンプレート | ポイント&クリックで設定可能 |
| **TexAU** | $29/月〜 | 180+自動化、50+ワークフローテンプレート、AI搭載 | SNSデータ抽出ツールあり |

---

#### 4.3 プロキシサービス（スクレイピング時の必須基盤）

| プロバイダー | IPプール | 価格 | 特徴 |
|-------------|---------|------|------|
| **Bright Data** | 1.5億+ IPs（195+カ国） | $5.04/GB〜 | 業界最大級、CAPTCHA解決、スクレイピングツール統合 |
| **Oxylabs** | 1億+ IPs（195+カ国） | $8/GB〜 | 大規模データ操作、高いアップタイム、企業グレード |
| **Smartproxy (Decodo)** | 6,500万+ IPs（195+カ国） | $7/GB〜 | コストパフォーマンス良好、APIアクセス |
| **SOAX** | 1.55億+ IPs（195+カ国） | $6.6/GB〜 | 細かい地理ターゲティング、柔軟な回転制御 |
| **Webshare** | 3,000万+ IPs（195+カ国） | $7/月〜 | **無料プランあり**（10プロキシ）、使いやすい |

**推奨組み合わせ例**:
- **低予算**: Apify Free + Webshare Free（プロキシ10個で試用）
- **本格運用**: Apify Starter ($49) + Smartproxy ($50/月)
- **大規模**: Apify Scale ($499) + Bright Data ($5.04/GB)

---

### 5. エージェンティックAIリサーチツール（自律型調査エージェント）

従来のSNS分析ツールとは異なり、**自律的に調査・分析を行うAIエージェント**も登場している。これらは「指示を出すだけで、エージェントが自動的にデータ収集・分析・レポート作成まで行う」機能を持つ。

#### 5.1 AIエージェントビルダー・プラットフォーム

| ツール | 料金 | 特徴 | SNSリサーチ用途 |
|--------|------|------|-----------------|
| **Gumloop** | Free: $0<br>Solo: $37/月<br>Team: $244/月 | • **ノーコード**でAIエージェント構築<br>• 130+アプリ連携<br>• **AIが自律的にコードを書いて実行**<br>• Webスクレイピング特化 | キーワード監視、トレンド分析、レポート自動生成 |
| **n8n** | Free（セルフホスト）<br>Cloud: $24/月〜 | • オープンソース<br>• 高度なワークフロー制御<br>• 300+統合<br>• 技術者向け | カスタムSNS監視システム構築 |
| **Lindy AI** | 要問い合わせ | • **バーチャル従業員**として動作<br>• 3,000+アプリ（Zapier経由）<br>• メール対応、予定調整<br>• 自動レビュー対応 | 口コミ監視、顧客対応、レポート作成 |
| **Relevance AI** | 要問い合わせ | • AIエージェントチーム構築<br>• マルチエージェントオーケストレーション<br>• プロセス自動化 | 大規模SNS分析、チーム連携 |
| **Stack AI** | 要問い合わせ | • エンタープライズ向け<br>• セキュリティ重視 | 企業内SNS分析基盤 |

**Teddy統合での評価**:

| ツール | 適性 | 評価ポイント |
|--------|------|--------------|
| **Gumloop** | ⭐⭐⭐⭐⭐ | • **$37/月の低価格**で最も推奨<br>• **API連携可能**: TeddyのDBに自動保存、Slack通知連携<br>• 「今週のトレンド出演者を調査して」等、自然言語で指示<br>• **週次レポート自動生成**→Teddyの「人探し」データに自動追加<br>• 技術者がいなくても運用可能 |
| **n8n** | ⭐⭐⭐☆☆ | • オープンソースで無料（セルフホスト）<br>• **Teddy APIと連携**可能<br>• ⚠️ **技術者必須**で導入ハードル高い<br>• 特定出演者の監視ワークフローを構築可能 |
| **Lindy AI** | ⭐⭐☆☆☆ | • API連携は可能だが、Teddy統合には過剰機能<br>• 価格不透明で予算管理困難 |
| **Relevance AI** | ⭐☆☆☆☆ | • エンタープライズ向けでTeddy統合には過剰<br>• 価格・機能ともにオーバースペック |

#### 5.2 SNS特化型AIエージェントツール

| ツール | 料金 | 特徴 | 用途 |
|--------|------|------|------|
| **Skott by Lyzr** | カスタム | • マーケティング特化AIエージェント<br>• トレンド調査から投稿生成まで<br>• ブランドボイス分析<br>• マルチチャネル配信 | コンテンツ戦略、競合分析 |
| **ManyChat** | Free〜Pro | • Instagram DM自動化<br>• リード獲得・育成<br>• 在庫確認、パーソナライズ返信 | Instagramマーケティング自動化 |
| **AdCreative.ai** | 要問い合わせ | • AIが広告クリエイティブ生成<br>• 予算配分自動最適化<br>• A/Bテスト自動化 | 広告運用最適化 |

**Teddy統合での評価**:

| ツール | 適性 | 評価ポイント |
|--------|------|--------------|
| **Skott by Lyzr** | ⭐⭐☆☆☆ | • API連携は可能だが、Teddy統合には向かない<br>• カスタム価格で予算管理困難 |
| **ManyChat** | ⭐⭐⭐☆☆ | • **API提供あり**: Instagram DM自動化をTeddyに統合可能<br>• 出演者からの問い合わせ対応を自動化<br>• リード獲得で新規出演者発掘に活用<br>• ⚠️ Instagram特化で他SNSは対象外<br>• ⚠️ Teddyの「人探し」機能との親和性は低い |
| **AdCreative.ai** | ⭐☆☆☆☆ | • 広告運用特化でTeddy統合には不向き |

#### 5.3 既存SNS分析ツールのエージェンティックAI機能

| ツール | AIエージェント名 | 機能 |
|--------|-----------------|------|
| **Brandwatch** | **Iris AI** | • **Ask Iris**: 自然言語で質問→即座に分析結果を表示<br>• **Conversation Insights**: データピークの原因を自動説明<br>• **AI Query Writer**: 複雑なBooleanクエリを自動生成<br>• **トレンド自動検出**: 異常値を検知してアラート |
| **Sprout Social** | **Trellis** | • **自然言語でのデータ探索**: 「最近のエンゲージメント上昇の理由は？」<br>• **自動インサイト生成**: 数ヶ月〜年単位のデータを分析<br>• **危機検知エージェント**: NewsWhip連携で早期警告<br>• **リアルタイムモニタリング**: 24時間体制で異常検知 |
| **Sociality.io** | AI統合機能 | • パブリッシング、エンゲージメント、リスニング、競合分析をAIが統合支援 |

**Teddy統合での評価**:

| ツール | 適性 | 評価ポイント |
|--------|------|--------------|
| **Brandwatch Iris** | ⭐⭐⭐⭐☆ | • **API連携可能**: TeddyからIris AIを呼び出し<br>• 「今話題のタレントは？」等、自然言語で質問可能<br>• 出演者の炎上リスクを自動検出→Teddy「エビデンス」に統合<br>• **月10万円**で予算ギリギリだが最も高機能<br>• 1.4兆件データへアクセス可能 |
| **Sprout Trellis** | ⭐⭐☆☆☆ | • API連携は可能だが**日本語非対応**<br>• 日本のテレビ制作ではデータ不足がネック |
| **Sociality.io** | ⭐☆☆☆☆ | • エージェンティックAI機能は発展途上<br>• API連携も限定的でTeddy統合には不向き |

#### 5.4 エージェンティックAIの活用シナリオ

```
【従来の手動ワークフロー】
1. 複数SNSを手動で確認
2. エクセルにデータ入力
3. 分析・グラフ作成
4. レポート作成
5. 会議で共有
（工数: 数時間〜数日）

【エージェンティックAIワークフロー】
1. エージェントに「今週のトレンド分析して」
2. AIが自動的にデータ収集・分析・レポート生成
3. 結果を確認・承認
（工数: 数分）
```

**具体的な活用例**:

| シナリオ | エージェントへの指示例 | 自動実行内容 |
|----------|----------------------|-------------|
| **週次トレンドレポート** | 「先週のYouTube/Instagramで話題になった◯◯業界のトレンドを分析して」 | • キーワード検索<br>• エンゲージメント分析<br>• 上位投稿の要約<br>• レポート生成 |
| **競合監視** | 「競合A社のSNS投稿を監視して、パフォーマンスの良かった投稿を毎週報告して」 | • アカウント自動追跡<br>• 投稿パフォーマンス分析<br>• 優秀投稿の抽出<br>• 定期的レポート配信 |
| **炎上リスク監視** | 「ブランド名+「困った」「不良品」等のネガティブワードを監視して、異常があれば即座に通知」 | • リアルタイム監視<br>• センチメント分析<br>• 異常検知時の即時アラート |
| **インフルエンサー発掘** | 「◯◯業界でエンゲージメント率の高いフォロワー1万人以下のマイクロインフルエンサーを探して」 | • ハッシュタグ分析<br>• アカウントスクリーニング<br>• エンゲージメント計算<br>• 候補リスト作成 |

#### 5.5 エージェンティックAIツール選定ガイド

| 要件 | 推奨ツール | 理由 |
|------|------------|------|
| **完全ノーコード** | Gumloop, ManyChat | プログラミング不要で直感的に構築 |
| **技術的柔軟性重視** | n8n | オープンソースで無限のカスタマイズ |
| **包括的SNS分析** | Brandwatch Iris, Sprout Trellis | エンタープライズ級のデータ基盤 |
| **コスト重視** | Gumloop Free, ManyChat Free | 無料枠で基本機能が使える |
| **カスタマー対応自動化** | Lindy AI, ManyChat | 会話型AIで自然な対応 |
| **マーケティング特化** | Skott by Lyzr | 戦略立案〜実行まで一貫支援 |

---

## 実装内容

### 1. API統合

- **YouTube Data API**（無料枠 or クォータ拡張申請）
- **Instagram Graph API**（ビジネスアカウント必須）

### 2. 検索機能

- キーワード検索
- トレンド分析
- エンゲージメント指標の取得

### 3. UI実装

- 検索オプションの追加
- 結果表示の統一

---

## 費用対効果分析

### ツール別 月額費用比較（1ユーザー想定）

| ツール | 月額費用 | 1年間費用 | 備考 |
|--------|----------|-----------|------|
| **YouTube Data API + Instagram Graph API** | 無料〜 | 無料〜 | クォータ制限あり、技術コスト必要 |
| **Tofu Analytics** | 1万円 | 12万円 | 最も安価、国内サポートあり |
| **Statusbrew** | 3.5万円 | 42万円 | 日本語対応、高機能 |
| **Hootsuite Professional** | 約1.5万円 | 18万円 | 日本語対応、複数SNS管理 |
| **Buzz Finder** | 8.8万円 | 105.6万円 | Xに強み |
| **Sprout Social Standard** | 約3.7万円 | 44.4万円 | 日本語非対応 |
| **Brandwatch Pro** | 約10万円 | 120万円 | エンタープライズ向け |
| **Apify Starter** | $49（約7,350円） | 約8.8万円 | API補完、技術リソース不要 |
| **Apify + プロキシ** | $100〜（約1.5万円） | 約18万円 | 大規模スクレイピング時 |
| **Gumloop Solo** | $37（約5,550円） | 約6.7万円 | ノーコードAIエージェント構築 |
| **n8n Cloud** | $24（約3,600円） | 約4.3万円 | 技術者向け自動化 |
| **ManyChat Pro** | $15（約2,250円） | 約2.7万円 | Instagram DM自動化 |

### 推奨選択肢（用途別）

| 用途 | 推奨ツール | 理由 |
|------|------------|------|
| **予算重視** | API直接統合 + Tofu Analytics | 無料〜低コストで基本機能をカバー |
| **運用効率重視** | Hootsuite | 日本語対応、複数SNS一元管理 |
| **分析精度重視** | Sprout Social / Brandwatch | 高度なAI分析機能 |
| **国内サポート重視** | Statusbrew / Tofu Analytics | 日本語サポート、ローカライズ対応 |
| **API制限回避** | Apify + プロキシ | 他アカウント分析が必要な場合の補完手段（規約確認必須） |
| **自律的調査** | Gumloop / n8n | AIエージェントに調査を委託、工数削減 |
| **Instagram自動化** | ManyChat | DM対応、リード獲得の自動化 |
| **包括的AI分析** | Brandwatch Iris / Sprout Trellis | エージェンティックAIによる自律的インサイト発見 |

---

## 判断基準

| 項目 | 基準 | 備考 |
|------|------|------|
| 月額費用 | 〜5万円/月 | 想定使用量で |
| データ精度 | Xリサーチと同等 | 有用な情報が得られる |
| 実装工数 | 1週間以内 | PoC済みの前提 |

---

## リスクと注意点

### API直接統合のリスク
1. **YouTube Data API**: デフォルトクォータ（1日10,000ユニット）では高頻度の検索が不可
2. **Instagram Graph API**: 個人アカウントのデータ取得が完全に不可能（2024年12月以降）
3. **レート制限**: 両APIとも短時間での大量アクセスは制限される

### 有料ツール導入のリスク
1. **Brandwatch**: 高額（年間100万円以上）、中小企業には過剰スペックの可能性
2. **Sprout Social**: 日本語非対応、英語での運用が必要
3. **全般**: 月額制のため、継続的なコスト発生

### スクレイピングの法的リスク（重要）
1. **利用規約違反**: YouTube/Instagramの利用規約ではスクレイピングを禁止している場合が多い
2. **アカウント停止リスク**: 検出された場合、IPブロックやアカウント停止の可能性
3. **法的責任**: 米国CFAA（コンピュータ詐欺・濫用法）などの違反リスク（海外サービスの場合）
4. **データ品質**: スクレイピングはサイト変更に弱く、メンテナンスコストが高い

**推奨**: 公式APIまたは合法的なデータプロバイダー（Brandwatch等）の使用を原則とし、スクレイピングは最後の手段として検討

---

## タスク

- [ ] PoC検証結果の評価
- [ ] 費用対効果の議論
- [ ] United Productions様の承認取得
- [ ] 本格実装
- [ ] 統合テスト

---

## 参考リンク集

### ツール比較・口コミ
- [ソーシャルリスニングツール比較16選 - Boxil](https://boxil.jp/mag/a1562/)
- [SNS分析ツール比較14選 - ASPIC](https://www.aspicjapan.org/asu/article/11582)
- [Sprout Social vs Statusbrew徹底比較](https://statusbrew.co.jp/insights/statusbrew-vs-sprout-social)
- [SNS管理ツール比較12選 - Qeee](https://qeee.jp/magazine/articles/6853)

### API公式ドキュメント
- [YouTube Data API Overview](https://developers.google.com/youtube/v3)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/)

### 料金情報
- [Brandwatch Pricing](https://www.brandwatch.com/pricing/)
- [Sprout Social Pricing](https://sproutsocial.com/pricing/)
- [Hootsuite Pricing](https://www.hootsuite.com/plans)

### スクレイピングツール
- [Apify](https://apify.com/)
- [Phantom Buster](https://phantombuster.com/)
- [Octoparse](https://www.octoparse.jp/)
- [Bright Data](https://brightdata.com/)

### エージェンティックAIツール
- [Gumloop](https://www.gumloop.com/)
- [n8n](https://n8n.io/)
- [Lindy AI](https://www.lindy.ai/)
- [Skott by Lyzr](https://www.lyzr.ai/skott/)
- [ManyChat](https://manychat.com/)
- [Brandwatch Iris AI](https://www.brandwatch.com/products/iris-ai/)
- [Sprout Social Trellis](https://sproutsocial.com/insights/agentic-ai-for-social-media/)


---

## プロジェクト目標と投資判断基準

### 目標
- **目的**: 月間数百万円のリサーチ外注をTeddy統合で代替
- **予算**: **月50万円（目下）** → 有用性確認後、必要に応じて拡張可能
- **統合方式**: TeddyバックエンドにAPI連携（UIツールは導入しない）
- **重視価値**: 
  1. **リアルタイム性**: 今話題の人物を即座に捕捉
  2. **正確性**: 信頼できるデータ源
  3. **広範性**: 多様なSNSプラットフォームを網羅

### ROI試算

| 項目 | 外注時 | Teddy統合後 |
|------|--------|-------------|
| 月間コスト | 300万円（想定） | 30万円（Phase1） |
| 納期 | 数日〜1週間 | 数分 |
| リアルタイム監視 | 不可 | 24時間体制 |
| 年間削減額 | - | 3000万円以上 |

**投資回収期間**: 約1ヶ月

### Phase設計

```
Phase 1（即座開始）: 月30万円
- Brandwatch API: 10万円
- Social Insight API: 5万円
- Buzz Finder API: 8.8万円
- Gumloop: 0.5万円
- YouTube Data API: 無料
- インフラ: 5万円

Phase 2（3ヶ月後）: 月50万円
- Phase 1 + TikTok API: 10万円
- Brandwatch画像解析: 5万円
- 予備費: 5万円

Phase 3（有用性確認後）: 月100万円
- それでも外注費の1/3以下
```

---

## 最終推奨構成（月50万円・外注代替目標）

### 即座に開始すべき構成（月30万円）

| 優先度 | サービス | 月額 | 統合内容 | 外注代替効果 |
|--------|----------|------|----------|--------------|
| **1** | **Brandwatch API** | 10万円 | 1.4兆件データへリアルタイムアクセス。Iris AIで自然言語検索 | グローバルスター調査を即座化 |
| **2** | **Social Insight API** | 5万円 | 2600万国内アカウント。LINE/TikTok対応 | 国内タレント発掘を自動化 |
| **3** | **Buzz Finder API** | 8.8万円 | X全量データリアルタイム監視 | エビデンス確認を24時間化 |
| **4** | **Gumloop** | $37 | 週次レポート自動生成→Teddy DBに保存 | レポート工数80%削減 |
| **5** | **YouTube Data API** | 無料 | 人気動画チャートで話題のYouTuberを自動発見 | YouTuber調査をリアルタイム化 |

**合計**: 約30万円（予算内に余裕）

### 却下案

| ツール | 理由 |
|--------|------|
| Instagram Graph API | ビジネスアカウントのみ対応で個人アカウント検索不可 |
| Apify等スクレイピング | 法的リスクがありTeddy統合に不向き |
| Sprout Social | 日本語非対応・日本データ不足 |

---

## 付録：テレビ出演者リサーチ特化の推奨構成

### 予算別の最適構成（更新版）

| 予算帯 | 推奨構成 | 年間費用 | 特徴 |
|--------|----------|----------|------|
| **月30万円** | Brandwatch + Social Insight + Buzz Finder + Gumloop | 360万円 | 外注300万円を30万円で代替。リアルタイム性・正確性・広範性を実現 |
| **月50万円** | Phase 1 + TikTok API + 画像解析 | 600万円 | Z世代対応・画像解析追加。さらに網羅的 |
| **月100万円** | フルエンタープライズ + 専任エンジニア | 1200万円 | それでも外注費の1/3以下 |

### リサーチ目的別の推奨ツール

| リサーチ目的 | 推奨ツール | 理由 |
|--------------|------------|------|
| **新規出演者発掘** | Brandwatch Iris, Social Insight | 1.4兆件+2600万アカウントからAI検索 |
| **炎上リスク確認** | Buzz Finder, Brandwatch | リアルタイム炎上検知、過去発言網羅検索 |
| **YouTuber調査** | YouTube Data API, Brandwatch | チャンネル統計+グローバルSNSデータ |
| **週次トレンドレポート** | Gumloop, Buzz Finder | レポート自動生成で工数削減 |
| **人気度・エンゲージメント分析** | Brandwatch, Social Insight | エンタープライズ級分析 |

### 重要ポイント

**外注代替を実現するための必須条件**:
1. **リアルタイム性**: Brandwatchの50,000件/秒のデータ取り込み
2. **正確性**: 公式APIのみ使用（スクレイピングは排除）
3. **広範性**: 1.4兆件（グローバル）+ 2600万（国内）データ
4. **自動化**: Gumloopによる週次レポート自動生成
5. **投資拡大の余地**: 月50万円→100万円へ段階的拡張可能

---

*最終更新: 2026-03-05（月50万円予算・外注リサーチ代替を目標に更新）*
