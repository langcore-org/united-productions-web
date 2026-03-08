---
name: infographic-generator
description: "4シーン説明型インフォグラフィック生成。Gemini 3 Pro Imageで16:9横長、4シーン構成、段階的に情報を説明。リサーチインサイト、データビジュアライゼーション、TV番組企画、情報図解に使用。キーワード: infographic, インフォグラフィック, 図解, 4-scene, プロフェッショナル, ビジネス"
allowed-tools: Bash, Read, Write
---

# 4シーン説明型インフォグラフィック生成スキル

あなたはプロフェッショナルなビジュアライゼーションの専門家です。
**Gemini 3 Pro Image Preview** APIを使用して、リサーチインサイトを**4つのシーン**で段階的に説明するインフォグラフィックを生成します。

## 特徴
- **モデル**: Gemini 3 Pro Image Preview (gemini-3-pro-image-preview)
- **フォーマット**: 16:9 横長、4シーン構成
- **テキスト**: 画像内の全テキストを日本語で出力
- **スタイル**: クリーンなベクターイラスト、プロフェッショナル
- **構成**: 4つの独立したシーン（企画紹介 → プロセス → クライマックス → 結果）
- **レイアウト**: 横に並んだ4つのセクション、各セクションに青いヘッダー

## 生成プロセス

1. インサイトの内容を分析し、4つのシーンに分割できるポイントを特定
2. **4シーン構成**として情報を再構成：
   - **SCENE 1**: 企画紹介・コンセプト
   - **SCENE 2**: プロセス・ルール・方法
   - **SCENE 3**: クライマックス・重要ポイント
   - **SCENE 4**: 結果・結論・まとめ
3. 各シーンのビジュアル要素とテキスト内容を決定
4. 英語でインフォグラフィック用プロンプトを作成（日本語出力指示含む）
5. generate_infographic.py スクリプトを実行
6. 生成されたインフォグラフィックを指定ディレクトリに保存
7. Markdownレポートに画像参照を追加

## プロンプト作成ガイドライン（4シーン説明型）

4シーンインフォグラフィック用プロンプトには以下を含める：

### 必須要素
- **"Create a 4-scene infographic"** で開始
- **"with Japanese text"** の明記（超重要！）
- **各シーンの構成**の詳細指定
- **ヘッダー、ビジュアル、テキスト**の具体的内容
- データや情報の要点

### 4シーン構成要素
- **SCENE 1 - 企画紹介**: コンセプト、概要、重要数値
- **SCENE 2 - プロセス/ルール**: 方法、手順、詳細説明
- **SCENE 3 - クライマックス**: 最重要ポイント、ハイライト
- **SCENE 4 - 結果/結論**: 成果、まとめ、次のステップ

### 各シーンの要素
- **Header**: 青い背景の見出し（"SCENE N - タイトル"）
- **Visual**: イラスト、図、アイコン
- **Text**: 説明文、データ、重要ポイント
- **Style**: ベクターイラスト、パステルカラー、プロフェッショナル

### プロンプト例（4シーン説明型）
```
Create a 4-scene infographic about immersive gaming experiences:

SCENE 1 - 没入体験の紹介:
Header: "SCENE 1 - 没入体験の紹介" (blue background)
Visual: VRヘッドセットとゲームコントローラーのイラスト
Text: 没入型ゲーム体験の定義と市場規模（XX億円）
Icons: 成長率、ユーザー数のアイコン

SCENE 2 - 技術要素:
Header: "SCENE 2 - 技術要素" (blue background)
Visual: VR、AR、ハプティクス技術の図解
Text: 主要技術の説明と採用率
Elements: 3つの技術を視覚的に分類

SCENE 3 - ユーザー体験:
Header: "SCENE 3 - ユーザー体験" (blue background)
Visual: ゲームプレイ中のユーザーイラスト
Text: 実際の体験価値と満足度データ
Emphasis: 最も評価されているポイント

SCENE 4 - 市場展望:
Header: "SCENE 4 - 市場展望" (blue background)
Visual: 上昇トレンドグラフと未来イメージ
Text: 今後の成長予測と機会
Success: 2030年までの市場規模予測

Visual Style:
- Clean vector illustrations
- Rounded corner boxes
- Pastel blue, pink, yellow colors
- Simple, professional aesthetic
- All Japanese text with clear fonts
```

## スクリプト実行方法

```bash
python /Users/sangyeolyi/Dev/LangCore/cli_proxy/.claude/skills/infographic-generator/scripts/generate_infographic.py \
  --prompt "Your English prompt here" \
  --output "/path/to/output/insight_N.png"
```

### パラメータ
- `--prompt` / `-p`: 画像生成プロンプト（英語推奨）
- `--output` / `-o`: 出力ファイルパス（PNG形式）
- `--api-key` / `-k`: Google API Key（オプション、環境変数から取得可能）

## 出力ファイル命名規則

```
insight_[番号]_[トピック短縮名].png

例:
- insight_1_ai_npc_behavior.png
- insight_2_market_growth.png
- insight_3_user_experience.png
```

## レポート埋め込み形式

生成された各インフォグラフィックは以下の形式でレポートに埋め込む：

```markdown
## インサイトタイトル

![インサイト: タイトル](./files/infographics/insight_N_topic.png)

### 調査結果
インサイトの詳細説明...

### 主要ポイント
- ポイント1
- ポイント2
- ポイント3

### 参考資料
- [ソース1](URL)
- [ソース2](URL)
```

## エラーハンドリング

### API エラー時
- Rate limit: 30秒待機後リトライ
- Invalid prompt: プロンプトを簡略化して再試行
- Network error: エラーログ出力、手動リトライ促す

### 生成失敗時のフォールバック
インフォグラフィック生成に失敗した場合：
1. エラーメッセージをログに記録
2. レポートには画像の代わりに「[インフォグラフィック生成中にエラーが発生しました]」と記載
3. テキストベースの要約を代替として提供

## 環境要件

### 必要な環境変数
```bash
export GOOGLE_API_KEY=your_api_key_here
```

### 必要なPythonパッケージ
```bash
pip install google-genai pillow
```

## ベストプラクティス（4シーン説明型）

1. **情報を4シーンで整理**: 論理的な流れで段階的に説明（導入→プロセス→ハイライト→結論）
2. **各シーンの役割を明確に**: それぞれのシーンが独立しながら全体のストーリーを形成
3. **ビジュアルとテキストのバランス**: イラストで視覚的に、テキストで詳細に説明
4. **日本語出力を徹底**: "ALL text in Japanese" を明記、ヘッダーもテキストも全て日本語
5. **プロフェッショナルなスタイル**: クリーンなベクターイラスト、パステルカラー、読みやすいレイアウト
6. **一貫性を保つ**: 4つのシーン全体で統一されたデザインとカラースキーム
7. **重要データを強調**: 数値、統計、キーポイントを視覚的に目立たせる
8. **ファイル名を意味のあるものに**: 後で参照しやすい命名を心がける

## 4シーンインフォグラフィック生成の重要ポイント

### 📊 4シーン構成（最重要！）
```
SCENE 1 - 企画紹介/コンセプト:
- Header: 青背景で "SCENE 1 - タイトル"
- Visual: コンセプトを表すメインイラスト
- Text: 概要、重要性、基本データ
- Purpose: 全体像の理解

SCENE 2 - プロセス/ルール/方法:
- Header: 青背景で "SCENE 2 - タイトル"
- Visual: 手順や方法を示すイラスト
- Text: 詳細な説明、ステップ、ルール
- Purpose: 仕組みの理解

SCENE 3 - クライマックス/重要ポイント:
- Header: 青背景で "SCENE 3 - タイトル"
- Visual: ハイライトシーンの視覚化
- Text: 最重要ポイント、インパクト
- Purpose: 核心の伝達

SCENE 4 - 結果/結論/まとめ:
- Header: 青背景で "SCENE 4 - タイトル"
- Visual: 成果や未来像のイラスト
- Text: まとめ、次のステップ、展望
- Purpose: 結論と行動喚起
```

### 🎨 ビジュアルスタイルの統一
- **カラーパレット**: パステルブルー、ピンク、イエローの一貫した使用
- **イラストスタイル**: シンプルなベクターイラスト、フラットデザイン
- **レイアウト**: 4つのシーンが等幅で横並び、角丸ボックス
- **タイポグラフィ**: 読みやすい日本語フォント、適切なサイズ階層

### 📝 日本語テキスト出力の徹底

⚠️ **"with Japanese text" を必ず含める**だけでなく、以下も指定：
- "ALL text must be in Japanese (日本語)"
- "Headers in Japanese"
- "Body text in Japanese"
- "Labels and captions in Japanese"
- プロンプト内に日本語の具体例を含める

プロンプト例:
```
✅ 正しい: "Create a 4-scene infographic with Japanese text:
          SCENE 1: Header '企画紹介', Text '新しい挑戦が始まります...'
          SCENE 2: Header 'ルール説明', Text 'ターゲットは...'"

❌ 間違い: "Create a 4-scene infographic about..." (言語指定なし)
```
