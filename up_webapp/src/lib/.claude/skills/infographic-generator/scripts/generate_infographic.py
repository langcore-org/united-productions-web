#!/usr/bin/env python3
"""
Gemini 3 Pro Image Preview を使用した4シーンインフォグラフィック生成スクリプト
16:9横長フォーマット、4シーン構成、日本語テキスト対応

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
    Gemini 3 Pro Image Preview APIを使用してインフォグラフィックを生成

    Args:
        prompt: 画像生成プロンプト
        output_path: 出力ファイルパス
        api_key: Google API Key (省略時は環境変数から取得)

    Returns:
        bool: 成功時True
    """
    # パッケージインポート
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("Error: google-genai package not installed.")
        print("Run: pip install google-genai")
        return False

    # API Key取得
    api_key = api_key or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY environment variable not set")
        print("Set it with: export GOOGLE_API_KEY=your_api_key")
        return False

    try:
        # Gemini Client初期化
        client = genai.Client(api_key=api_key)

        # 4シーン説明型インフォグラフィックとして構成
        optimized_prompt = f"""Create a professional 4-scene explanatory infographic with Japanese text:

{prompt}

CRITICAL REQUIREMENTS - 4-SCENE INFOGRAPHIC FORMAT:
- Create exactly 4 distinct scenes arranged horizontally
- ALL text must be in Japanese (日本語)
- Each scene has a header label and detailed explanation
- 16:9 horizontal/landscape format
- Clean, professional illustration style (not manga/comic style)

SCENE STRUCTURE:
Scene 1 - Introduction/Concept:
- Header: "SCENE 1 - [タイトル]" with blue background
- Main visual showing the concept
- Text explanation of the core idea
- Supporting icons and illustrations

Scene 2 - Process/Method:
- Header: "SCENE 2 - [タイトル]" with blue background
- Visual demonstration of how it works
- Detailed explanation text
- Step-by-step visual elements

Scene 3 - Climax/Key Point:
- Header: "SCENE 3 - [タイトル]" with blue background
- Dramatic visualization of the main action/result
- Emphasis on key moments
- Impact visualization

Scene 4 - Results/Conclusion:
- Header: "SCENE 4 - [タイトル]" with blue background
- Final outcome visualization
- Summary and conclusion
- Success indicators

VISUAL STYLE:
- Clean vector illustration style
- Rounded corner boxes for each scene
- Pastel color palette (light blue, soft pink, yellow accents)
- Simple character illustrations (not detailed manga style)
- Professional infographic aesthetic
- Clear visual hierarchy

TEXT ELEMENTS:
- Blue header bars for scene titles
- Black body text for explanations
- All text in clear Japanese
- Good spacing and readability
- Text boxes with light backgrounds

LAYOUT:
- 16:9 horizontal format
- 4 equal-width vertical sections
- Each scene separated by subtle dividers
- Consistent styling across all scenes
- Left-to-right reading flow
"""

        print(f"Generating 4-scene infographic with Gemini 3 Pro Image Preview...")
        print(f"Prompt: {prompt[:100]}...")

        # 画像生成 (Gemini 3 Pro Image Preview - generate_content を使用)
        response = client.models.generate_content(
            model='gemini-3-pro-image-preview',
            contents=optimized_prompt,
            config=types.GenerateContentConfig(
                response_modalities=['TEXT', 'IMAGE'],
                image_config=types.ImageConfig(
                    aspect_ratio="16:9",
                    image_size="2K"
                ),
            )
        )

        # 画像保存
        image_saved = False
        if response.parts:
            for part in response.parts:
                # テキスト部分を表示
                if hasattr(part, 'text') and part.text:
                    print(f"Response text: {part.text[:200]}...")

                # 画像部分を保存
                if hasattr(part, 'as_image'):
                    image = part.as_image()
                    if image:
                        # 出力ディレクトリ作成
                        output_dir = Path(output_path).parent
                        output_dir.mkdir(parents=True, exist_ok=True)

                        # 保存
                        image.save(output_path)
                        print(f"Success: Infographic saved to {output_path}")

                        # ファイルサイズを表示
                        file_size = os.path.getsize(output_path)
                        print(f"File size: {file_size / 1024:.1f} KB")

                        # Wrapper用マーカー出力（ファイル作成検出用）
                        print(f"FILE_CREATED:{output_path}")

                        image_saved = True
                        break

        if not image_saved:
            print("Error: No image generated from API response")
            return False

        return True

    except Exception as e:
        error_msg = str(e)
        print(f"Error generating infographic: {error_msg}")

        # 特定のエラーに対するアドバイス
        if "quota" in error_msg.lower() or "rate" in error_msg.lower():
            print("Hint: API rate limit reached. Wait a moment and try again.")
        elif "invalid" in error_msg.lower() and "key" in error_msg.lower():
            print("Hint: Check if your GOOGLE_API_KEY is valid.")
        elif "permission" in error_msg.lower():
            print("Hint: Your API key may not have access to gemini-3-pro-image-preview.")
        elif "404" in error_msg:
            print("Hint: Model not found. Ensure gemini-3-pro-image-preview is available.")

        return False


def main():
    parser = argparse.ArgumentParser(
        description="Generate 4-scene infographic using Gemini 3 Pro Image Preview (16:9, Japanese text)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_infographic.py -p "TikTokの没入体験について説明するインフォグラフィック" -o output.png
  python generate_infographic.py --prompt "ゲームAI市場の成長を説明" --output "./infographics/gaming.png"

IMPORTANT: Include Japanese content description in your prompt for best results!
        """
    )
    parser.add_argument(
        "--prompt", "-p",
        required=True,
        help="Image generation prompt (describe content in Japanese for Japanese output)"
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        help="Output file path (PNG format)"
    )
    parser.add_argument(
        "--api-key", "-k",
        help="Google API Key (or set GOOGLE_API_KEY environment variable)"
    )

    args = parser.parse_args()

    # 出力パスの拡張子チェック
    if not args.output.lower().endswith('.png'):
        print("Warning: Output file should have .png extension")
        args.output = args.output + '.png'

    success = generate_infographic(
        prompt=args.prompt,
        output_path=args.output,
        api_key=args.api_key
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
