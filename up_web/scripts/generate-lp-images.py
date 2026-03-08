#!/usr/bin/env python3
"""
Generate LP images for AD-Agent using Google Gemini Imagen API.
Creates bright, vibrant images for the landing page.
"""

from google import genai
from google.genai import types
from pathlib import Path

# Configuration
GEMINI_API_KEY = "AIzaSyB0PAI9lwr6iq4dwRKOmEfQtKlqskaNVZk"
OUTPUT_DIR = Path("/Users/sangyeolyi/Dev/LangCore/cli_proxy/up_web/public/images/lp")

# Create client
client = genai.Client(api_key=GEMINI_API_KEY)


def generate_image(prompt: str, filename: str, aspect_ratio: str = "16:9"):
    """Generate an image using Gemini Imagen and save it."""
    print(f"Generating: {filename}...")

    try:
        result = client.models.generate_images(
            model="imagen-4.0-generate-001",
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=aspect_ratio,
            )
        )

        # Save the generated image
        if result.generated_images:
            image = result.generated_images[0]
            output_path = OUTPUT_DIR / filename

            # Save image data
            image.image.save(output_path)

            print(f"  ✓ Saved: {output_path}")
            return True
        else:
            print(f"  ✗ No image generated for {filename}")
            return False

    except Exception as e:
        print(f"  ✗ Error generating {filename}: {e}")
        return False


def main():
    """Generate all LP images for AD-Agent."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("AD-Agent LP Image Generation")
    print("=" * 60)

    # Image prompts - bright, modern, professional
    images = [
        {
            "filename": "hero-main.png",
            "aspect_ratio": "16:9",
            "prompt": """Modern bright illustration for TV production AI platform.
            White background with vibrant blue and orange accent colors.
            Abstract geometric shapes representing AI and creativity.
            Clean, minimal, professional Japanese style.
            No text or letters. Bright and optimistic mood.
            Digital art style, flat design with subtle shadows."""
        },
        {
            "filename": "feature-research.png",
            "aspect_ratio": "4:3",
            "prompt": """Bright illustration of AI research assistant concept.
            Abstract representation of data analysis and information gathering.
            White background with teal and light blue accents.
            Modern flat design, clean lines.
            Magnifying glass, documents, and neural network elements.
            No text. Cheerful and efficient mood."""
        },
        {
            "filename": "feature-planning.png",
            "aspect_ratio": "4:3",
            "prompt": """Vibrant illustration of creative planning and brainstorming.
            Abstract lightbulb and idea generation concept.
            White background with warm orange and yellow accents.
            Modern flat design style.
            Floating cards, sparkles, and creative elements.
            No text. Innovative and inspiring mood."""
        },
        {
            "filename": "feature-script.png",
            "aspect_ratio": "4:3",
            "prompt": """Clean illustration of script and content creation.
            Abstract representation of writing and structuring content.
            White background with purple and blue gradients.
            Modern flat design, organized layout elements.
            Document icons, timeline, and flow charts.
            No text. Professional and organized mood."""
        },
        {
            "filename": "feature-drive.png",
            "aspect_ratio": "4:3",
            "prompt": """Bright illustration of cloud file management and collaboration.
            Abstract representation of Google Drive integration.
            White background with green and teal accents.
            Modern flat design, folder and file icons.
            Connected nodes showing file sharing.
            No text. Seamless and connected mood."""
        },
        {
            "filename": "og-image.png",
            "aspect_ratio": "16:9",
            "prompt": """Professional Open Graph image for AD-Agent platform.
            Modern, bright white background.
            Abstract AI and TV production elements.
            Blue, orange, and teal accent colors.
            Clean geometric shapes.
            No text. Premium and trustworthy mood."""
        }
    ]

    success_count = 0
    for img in images:
        if generate_image(img["prompt"], img["filename"], img["aspect_ratio"]):
            success_count += 1

    print("=" * 60)
    print(f"Generated {success_count}/{len(images)} images")
    print(f"Output directory: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
