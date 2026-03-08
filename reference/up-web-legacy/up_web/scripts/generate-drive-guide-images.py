#!/usr/bin/env python3
"""
Generate guide images for Google Drive settings page using Google Gemini Imagen API.
Creates bright, helpful illustrations explaining the integration flow.
"""

from google import genai
from google.genai import types
from pathlib import Path

# Configuration
GEMINI_API_KEY = "AIzaSyB0PAI9lwr6iq4dwRKOmEfQtKlqskaNVZk"
OUTPUT_DIR = Path("/Users/sangyeolyi/Dev/LangCore/cli_proxy/up_web/public/images/guides/drive")

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
    """Generate all guide images for Google Drive settings."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("Google Drive Guide Image Generation")
    print("=" * 60)

    # Image prompts - bright, modern, professional guide illustrations
    images = [
        {
            "filename": "hero-drive-connection.png",
            "aspect_ratio": "16:9",
            "prompt": """Bright, clean illustration showing cloud storage integration concept.
            Modern flat design with white background.
            Abstract representation of Google Drive folder icon connecting to a chat interface.
            Teal, green, and light blue color palette.
            Flowing connection lines and nodes showing data flow.
            Professional, friendly, and approachable style.
            No text or letters. Clean and minimal."""
        },
        {
            "filename": "step-1-why-connect.png",
            "aspect_ratio": "4:3",
            "prompt": """Bright illustration showing benefits of file integration.
            White background with teal and green accents.
            Abstract representation of documents floating around a central hub.
            Icons representing: reference materials, export, collaboration.
            Modern flat design, Japanese minimalist style.
            Connected nodes showing seamless workflow.
            No text or letters. Professional and helpful mood."""
        },
        {
            "filename": "step-2-service-account.png",
            "aspect_ratio": "4:3",
            "prompt": """Clean illustration explaining secure authentication concept.
            White background with blue and green accents.
            Abstract key or lock icon with shield representing security.
            Cloud icon with a service account representation.
            Modern flat design showing secure connection flow.
            Trust and security theme with professional aesthetic.
            No text or letters. Trustworthy and secure mood."""
        },
        {
            "filename": "step-3-share-folder.png",
            "aspect_ratio": "4:3",
            "prompt": """Bright illustration showing folder sharing concept.
            White background with green and teal accents.
            Folder icon being shared with another user/service icon.
            Arrows showing permission flow.
            Modern flat design, collaborative theme.
            Simple and clear visual explanation.
            No text or letters. Collaborative and easy mood."""
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
