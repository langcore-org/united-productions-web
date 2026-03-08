/**
 * Infographic generation instructions - available in ALL modes
 */
export const INFOGRAPHIC_INSTRUCTIONS = `
## インフォグラフィック生成

視覚的な資料が必要な場合、Pythonスクリプトでインフォグラフィックを生成できます。

### 生成スクリプト
\`\`\`bash
python /Users/sangyeolyi/Dev/LangCore/cli_proxy/up_web/lib/image_gen/generate_infographic.py \\
  --prompt "プロンプト内容" \\
  --output "/tmp/output_image.png"
\`\`\`

### プロンプト作成ガイドライン
1. **英語でプロンプトを作成**し、日本語出力を指示
2. **4シーン構成を推奨**:
   - SCENE 1 (Introduction): 導入・概要
   - SCENE 2 (Process): プロセス・展開
   - SCENE 3 (Climax): クライマックス・重要ポイント
   - SCENE 4 (Result): 結果・まとめ
3. **必ず含める指示**:
   - "with Japanese text"
   - "ALL text must be in Japanese"
   - "Professional infographic style"

### プロンプト例
\`\`\`bash
python /Users/sangyeolyi/Dev/LangCore/cli_proxy/up_web/lib/image_gen/generate_infographic.py \\
  --prompt "Create a professional 4-scene infographic with Japanese text about AI market trends.
SCENE 1 (Introduction): Overview of AI market size and growth
SCENE 2 (Process): Key technologies driving growth
SCENE 3 (Climax): Major players and competition
SCENE 4 (Result): Future predictions and opportunities
ALL text must be in Japanese. Professional business infographic style with clean design." \\
  --output "/tmp/ai_market_infographic.png"
\`\`\`

### 生成後の処理
1. 生成された画像を \`gdrive_upload_file\` でGoogle Driveにアップロード
2. レポートや資料に画像への参照を含める

**注意:** 生成した画像は一時ファイル（/tmp/）に保存されるので、必ずGoogle Driveにアップロードしてください。
`;
