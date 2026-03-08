import { GoogleGenerativeAI } from "@google/generative-ai";

const ENHANCEMENT_SYSTEM_PROMPT = `Role: Expert prompt engineer specializing in clarity and effectiveness.

Task: Transform the input text into an optimized AI prompt while PRESERVING file reference placeholders.

## CRITICAL: File Placeholder Handling
The input may contain file reference placeholders in the format: {{FILE:id:filename}}
These placeholders represent attached files and MUST be preserved in your output.

### Rules for File Placeholders:
1. NEVER remove, modify, or merge file placeholders
2. PRESERVE the exact format: {{FILE:id:filename}}
3. Keep file placeholders in semantically appropriate positions
4. Understand the context around each file:
   - "{{FILE:...}} を元に" or "based on {{FILE:...}}" = this file is the SOURCE/BASE
   - "{{FILE:...}} を参照して" or "referring to {{FILE:...}}" = this file is a REFERENCE
   - "{{FILE:...}} について" or "about {{FILE:...}}" = this file is the TARGET/SUBJECT
   - "{{FILE:...}} のフォーマットで" or "in the format of {{FILE:...}}" = this file is a FORMAT TEMPLATE

### Example:
Input: "{{FILE:abc123:report.pdf}} を元に {{FILE:def456:template.md}} のフォーマットで {{FILE:ghi789:data.csv}} について分析して"

Output: "{{FILE:abc123:report.pdf}} をベースドキュメントとして参照し、{{FILE:def456:template.md}} で定義されたフォーマット・構成に従って、{{FILE:ghi789:data.csv}} に含まれるデータを詳細に分析してください。分析では、データの傾向、パターン、重要な洞察を明確にしてください。"

## Enhancement Guidelines:
1. Clarify the objective and expected output
2. Add specific instructions where needed
3. Keep improvements minimal but impactful
4. Preserve the original language (Japanese/English)

IMPORTANT: Return ONLY the enhanced prompt text with file placeholders intact. Do not include explanations, markdown formatting, or meta-commentary.`;

/**
 * Enhance a prompt using Gemini 2.0 Flash
 * @param text - The original prompt text (may contain {{FILE:id:name}} placeholders)
 * @param fileContext - Optional context from attached files
 * @returns Enhanced prompt text with file placeholders preserved
 */
export async function enhancePrompt(
  text: string,
  fileContext?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API;
  if (!apiKey) {
    throw new Error("GEMINI_API environment variable is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  });

  // Build the user message with optional file context
  let userMessage = `Original prompt:\n${text}`;
  if (fileContext) {
    userMessage += `\n\nContext from attached files (for understanding only, do not include in output):\n${fileContext}`;
  }

  const result = await model.generateContent([
    { text: ENHANCEMENT_SYSTEM_PROMPT },
    { text: userMessage },
  ]);

  const response = result.response;
  const enhancedText = response.text().trim();

  // Validate that all original file placeholders are preserved
  const originalPlaceholders = text.match(/\{\{FILE:[^}]+\}\}/g) || [];
  const enhancedPlaceholders = enhancedText.match(/\{\{FILE:[^}]+\}\}/g) || [];

  // If placeholders were lost, fall back to original text with basic enhancement
  if (originalPlaceholders.length > enhancedPlaceholders.length) {
    console.warn("File placeholders were lost during enhancement, using fallback");
    // Simple enhancement: just clean up the text without AI
    return text;
  }

  return enhancedText;
}
