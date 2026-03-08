# Infographic Generator Skill 設計書

## 1. Overview

TV番組リサーチャー（neta-researcher）モードと連携し、Gemini Imagen 3 (Nano Banana Pro) を使用してインサイトごとのインフォグラフィックを自動生成するSkill。

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Infographic Generation Flow                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐ │
│  │  neta-researcher │     │   Infographic    │     │   Gemini     │ │
│  │     Mode         │────▶│     Skill        │────▶│  Imagen 3    │ │
│  │                  │     │                  │     │              │ │
│  │ final_report生成 │     │ インサイト抽出   │     │ 画像生成API  │ │
│  └──────────────────┘     └──────────────────┘     └──────────────┘ │
│                                   │                                   │
│                                   ▼                                   │
│                          ┌──────────────────┐                        │
│                          │  files/          │                        │
│                          │  infographics/   │                        │
│                          │  ├─ insight_1.png│                        │
│                          │  ├─ insight_2.png│                        │
│                          │  └─ ...          │                        │
│                          └──────────────────┘                        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Skill Structure

### 3.1 Directory Layout

```
.claude/skills/infographic-generator/
├── SKILL.md              # Skill定義とプロンプト
├── scripts/
│   └── generate_infographic.py   # Gemini Imagen API呼び出しスクリプト
└── references/
    └── prompt_templates.md       # インフォグラフィック用プロンプトテンプレート
```

### 3.2 SKILL.md

```yaml
---
name: infographic-generator
description: "インフォグラフィック生成。リサーチインサイト、データビジュアライゼーション、情報図解に使用。キーワード: infographic, インフォグラフィック, 図解, ビジュアライズ, visualization"
allowed-tools: Bash, Read, Write
---

# インフォグラフィック生成スキル

あなたはデータビジュアライゼーションの専門家です。
Gemini Imagen 3 APIを使用して、リサーチインサイトを視覚的に伝えるインフォグラフィックを生成します。

## 生成プロセス

1. インサイトの内容を分析
2. 視覚化に適したプロンプトを作成（英語）
3. generate_infographic.py スクリプトを実行
4. 生成された画像をfiles/infographics/に保存
5. Markdownレポートに画像参照を追加

## プロンプト作成ガイドライン

インフォグラフィック用の英語プロンプトには以下を含める：
- "infographic style" または "data visualization"
- 主要なデータポイントや統計
- 配色指定（professional, modern, clean）
- レイアウト指定（vertical layout, sections）

## スクリプト実行

bash
python .claude/skills/infographic-generator/scripts/generate_infographic.py \
  --prompt "英語のプロンプト" \
  --output "files/infographics/insight_N.png"


## 出力形式

生成された各インフォグラフィックは以下の形式でレポートに埋め込む：

markdown
### インサイトタイトル

![インサイトタイトル](./files/infographics/insight_N.png)

インサイトの詳細説明...

```

---

## 4. Python Script Design

### 4.1 generate_infographic.py

```python
#!/usr/bin/env python3
"""
Gemini Imagen 3 (Nano Banana Pro) を使用したインフォグラフィック生成スクリプト

Usage:
    python generate_infographic.py --prompt "Your prompt" --output "output.png"

Environment:
    GOOGLE_API_KEY: Gemini API key
"""

import argparse
import os
import sys
from pathlib import Path

def generate_infographic(prompt: str, output_path: str, api_key: str = None) -> bool:
    """
    Gemini Imagen 3 APIを使用してインフォグラフィックを生成

    Args:
        prompt: 画像生成プロンプト（英語推奨）
        output_path: 出力ファイルパス
        api_key: Google API Key (省略時は環境変数から取得)

    Returns:
        bool: 成功時True
    """
    try:
        from google import genai
        from google.genai import types
        from PIL import Image
        from io import BytesIO
    except ImportError:
        print("Error: Required packages not installed.")
        print("Run: pip install google-genai pillow")
        return False

    # API Key取得
    api_key = api_key or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY environment variable not set")
        return False

    try:
        # Gemini Client初期化
        client = genai.Client(api_key=api_key)

        # インフォグラフィック用にプロンプトを最適化
        optimized_prompt = f"""
        Create a professional infographic visualization:
        {prompt}

        Style: Modern, clean, professional infographic design
        Layout: Clear visual hierarchy with sections
        Colors: Professional color palette, high contrast for readability
        """

        # 画像生成
        response = client.models.generate_images(
            model='imagen-3.0-generate-002',
            prompt=optimized_prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="9:16",  # 縦長（インフォグラフィック向け）
            )
        )

        # 画像保存
        if response.generated_images:
            image_data = response.generated_images[0].image.image_bytes
            image = Image.open(BytesIO(image_data))

            # 出力ディレクトリ作成
            output_dir = Path(output_path).parent
            output_dir.mkdir(parents=True, exist_ok=True)

            # 保存
            image.save(output_path, "PNG")
            print(f"Success: Infographic saved to {output_path}")
            return True
        else:
            print("Error: No image generated")
            return False

    except Exception as e:
        print(f"Error generating infographic: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Generate infographic using Gemini Imagen 3"
    )
    parser.add_argument(
        "--prompt", "-p",
        required=True,
        help="Image generation prompt (English recommended)"
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        help="Output file path (PNG)"
    )
    parser.add_argument(
        "--api-key", "-k",
        help="Google API Key (or set GOOGLE_API_KEY env var)"
    )

    args = parser.parse_args()

    success = generate_infographic(
        prompt=args.prompt,
        output_path=args.output,
        api_key=args.api_key
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
```

### 4.2 Dependencies

```
# requirements.txt (skill用)
google-genai>=0.1.0
pillow>=10.0.0
```

---

## 5. neta-researcher Mode Integration

### 5.1 Mode Prompt 修正箇所

`modes.ts`の`neta-researcher`モードに以下を追加：

```typescript
// Final Report生成セクションに追加

## インフォグラフィック生成（Final Report時）

最終レポート作成時、各インサイト（深掘りテーマ）について：

1. インサイトの要点を英語で要約
2. infographic-generator スキルを呼び出し
3. 生成されたインフォグラフィックをレポートに埋め込み

### スキル呼び出し方法

各インサイトについて、以下のコマンドを実行：

\`\`\`bash
python .claude/skills/infographic-generator/scripts/generate_infographic.py \\
  --prompt "Infographic about [インサイトの英語要約]: [主要データポイント], [統計], [キーファクト]" \\
  --output "files/infographics/insight_[N]_[short_title].png"
\`\`\`

### レポート埋め込み形式

\`\`\`markdown
## [インサイトタイトル]

![インサイト: タイトル](./files/infographics/insight_N_short_title.png)

### 調査結果
[インサイトの詳細内容]

### 参考資料
[ソースリスト]
\`\`\`
```

### 5.2 Updated Workflow

```
1. リサーチ実行
   └── WebSearchで情報収集
   └── sequential-thinkingで分析
   └── インサイト抽出（3-10件）

2. インサイトごとにインフォグラフィック生成
   └── 英語プロンプト作成
   └── generate_infographic.py実行
   └── 画像ファイル保存

3. Final Report作成
   └── 各インサイトセクションに画像埋め込み
   └── final_report.mdとして保存
```

---

## 6. File Storage Strategy

### 6.1 Directory Structure

```
files/
├── infographics/              # インフォグラフィック専用
│   ├── [session_id]/          # セッション別（オプション）
│   │   ├── insight_1_topic.png
│   │   ├── insight_2_topic.png
│   │   └── ...
│   └── ...
└── reports/
    └── final_report.md
```

### 6.2 Naming Convention

```
insight_[番号]_[トピック短縮名].png

例:
- insight_1_ai_gaming_trend.png
- insight_2_market_size.png
- insight_3_user_demographics.png
```

---

## 7. Implementation Roadmap

### Phase 1: Skill作成
1. `.claude/skills/infographic-generator/` ディレクトリ作成
2. `SKILL.md` 作成
3. `scripts/generate_infographic.py` 作成
4. 依存関係インストール確認

### Phase 2: テスト
1. スクリプト単体テスト
2. API接続確認
3. 画像生成テスト

### Phase 3: Mode統合
1. `neta-researcher`モードのprompt更新
2. インフォグラフィック生成フローの追加
3. レポートテンプレート更新

### Phase 4: 動作確認
1. End-to-endテスト
2. 生成品質確認
3. エラーハンドリング確認

---

## 8. Environment Setup

### Required Environment Variables

```bash
# .env または shell設定
export GOOGLE_API_KEY=AIzaSyCApDy8vgVDFz-NhJjQ_28CnmNh8xyqxnY
```

### Wrapper Configuration

`claude-code-openai-wrapper/.env`:
```
GOOGLE_API_KEY=AIzaSyCApDy8vgVDFz-NhJjQ_28CnmNh8xyqxnY
```

---

## 9. Error Handling

### API Errors
- Rate limit: リトライ with exponential backoff
- Invalid prompt: フォールバック用の汎用プロンプト使用
- Network error: ユーザーに通知、手動リトライ促す

### File System Errors
- Permission denied: ディレクトリ権限確認
- Disk full: エラーメッセージで通知
- Invalid path: パス正規化処理

### Fallback Strategy
インフォグラフィック生成失敗時：
1. エラーログ出力
2. プレースホルダー画像の代わりにテキスト説明を挿入
3. レポート生成は継続

---

## 10. Usage Example

### neta-researcherでの使用フロー

```
User: 最新のAIゲームについて調べて

Claude (neta-researcher mode):
1. WebSearchで情報収集
2. 3-5個のインサイトを特定
3. 各インサイトについて:
   - generate_infographic.py実行
   - 画像をfiles/infographics/に保存
4. final_report.md作成（画像埋め込み済み）

Output:
files/
├── infographics/
│   ├── insight_1_ai_npc.png
│   ├── insight_2_procedural.png
│   └── insight_3_market.png
└── final_report.md
```

### 生成されるfinal_report.md例

```markdown
# AIゲーム最新動向リサーチレポート

## 1. AI NPCの進化

![AI NPCの進化](./files/infographics/insight_1_ai_npc.png)

### 調査結果
最新のゲームでは、LLMを活用したNPCが登場...

## 2. プロシージャル生成の革新

![プロシージャル生成](./files/infographics/insight_2_procedural.png)

### 調査結果
AIによるコンテンツ自動生成が...

## 3. 市場規模と成長予測

![市場規模](./files/infographics/insight_3_market.png)

### 調査結果
AI Gaming市場は2030年までに...
```
