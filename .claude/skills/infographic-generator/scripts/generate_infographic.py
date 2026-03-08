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
import time
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
    # パッケージインポート
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("Error: google-genai package not installed.")
        print("Run: pip install google-genai")
        return False

    try:
        from PIL import Image
        from io import BytesIO
    except ImportError:
        print("Error: pillow package not installed.")
        print("Run: pip install pillow")
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

        # インフォグラフィック用にプロンプトを最適化
        optimized_prompt = f"""Create a professional infographic visualization:

{prompt}

Style requirements:
- Modern, clean, professional infographic design
- Clear visual hierarchy with distinct sections
- Professional color palette with high contrast for readability
- Include relevant icons and visual elements
- Vertical layout optimized for digital viewing
- Data-driven visual representation
- Easy to understand at a glance
"""

        print(f"Generating infographic with Gemini Imagen 3...")
        print(f"Prompt: {prompt[:100]}...")

        # 画像生成
        response = client.models.generate_images(
            model='imagen-4.0-generate-001',
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

            # ファイルサイズを表示
            file_size = os.path.getsize(output_path)
            print(f"File size: {file_size / 1024:.1f} KB")

            return True
        else:
            print("Error: No image generated from API response")
            return False

    except Exception as e:
        error_msg = str(e)
        print(f"Error generating infographic: {error_msg}")

        # 特定のエラーに対するアドバイス
        if "quota" in error_msg.lower() or "rate" in error_msg.lower():
            print("Hint: API rate limit reached. Wait a moment and try again.")
        elif "invalid" in error_msg.lower() and "key" in error_msg.lower():
            print("Hint: Check if your GOOGLE_API_KEY is valid.")
        elif "permission" in error_msg.lower():
            print("Hint: Your API key may not have Imagen access enabled.")

        return False


def main():
    parser = argparse.ArgumentParser(
        description="Generate infographic using Gemini Imagen 3 (Nano Banana Pro)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_infographic.py -p "AI market trends 2024" -o output.png
  python generate_infographic.py --prompt "Gaming industry statistics" --output "./infographics/gaming.png"
        """
    )
    parser.add_argument(
        "--prompt", "-p",
        required=True,
        help="Image generation prompt (English recommended for best results)"
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
