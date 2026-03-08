---
name: infographic-generator
description: "インフォグラフィック生成。リサーチインサイト、データビジュアライゼーション、情報図解に使用。キーワード: infographic, インフォグラフィック, 図解, ビジュアライズ, visualization, 画像生成"
allowed-tools: Bash, Read, Write
---

# インフォグラフィック生成スキル

あなたはデータビジュアライゼーションの専門家です。
Gemini Imagen 3 APIを使用して、リサーチインサイトを視覚的に伝えるインフォグラフィックを生成します。

## 生成プロセス

1. インサイトの内容を分析し、視覚化のポイントを特定
2. 英語でインフォグラフィック用プロンプトを作成
3. generate_infographic.py スクリプトを実行
4. 生成された画像を指定ディレクトリに保存
5. Markdownレポートに画像参照を追加

## プロンプト作成ガイドライン

インフォグラフィック用の英語プロンプトには以下を含める：

### 必須要素
- "infographic" または "data visualization" キーワード
- 主要なデータポイントや統計情報
- テーマや内容の簡潔な説明

### 推奨スタイル指定
- "professional, modern, clean design"
- "vertical layout with clear sections"
- "high contrast colors for readability"
- "icons and visual elements"

### プロンプト例
```
Professional infographic about AI in gaming industry:
- Market size: $50 billion by 2030
- Key areas: NPC behavior, procedural generation, personalization
- Growth rate: 25% annually
Style: Modern tech aesthetic, blue and purple color scheme, vertical layout with icons
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

## ベストプラクティス

1. **プロンプトは具体的に**: 抽象的な説明より、具体的なデータや数字を含める
2. **英語を使用**: Imagen 3は英語プロンプトで最良の結果を生成
3. **スタイルを指定**: 一貫したビジュアルスタイルのためにスタイル指定を含める
4. **ファイル名を意味のあるものに**: 後で参照しやすい命名を心がける
5. **バッチ処理**: 複数のインフォグラフィックを連続生成する場合は、API制限に注意
