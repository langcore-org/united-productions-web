/**
 * 初期プロンプトデータ（Single Source of Truth）
 * DBが空の場合やフォールバック時に使用
 * 
 * @created 2026-02-22 12:10
 * @updated 2026-02-22 12:30
 * 
 * 注: 完全なプロンプト内容はDBで管理。ここでは最小限のフォールバックのみ定義。
 */

import { AGENTIC_BASE_PROMPT } from "./base";

export const DEFAULT_PROMPTS = [
  {
    id: "prompt_general_chat",
    key: "GENERAL_CHAT",
    name: "チャット",
    description: "汎用チャット用システムプロンプト（エージェント対応）",
    content: AGENTIC_BASE_PROMPT + `

## 専門領域
テレビ制作業務を支援するAIアシスタントとして、以下に対応します：

### 対応できる内容
- 一般的な質問への回答
- アイデア出しの支援
- 文章の推敲・校正
- 情報の整理・要約
- 制作業務に関する相談
- 最新情報の調査（Web検索）
- トレンド情報の収集（X検索）`,
    category: "general",
  },
];

/**
 * デフォルトプロンプトキーの一覧
 */
export const DEFAULT_PROMPT_KEYS = [
  "GENERAL_CHAT",
  "MINUTES",
  "MEETING_FORMAT_MEETING",
  "MEETING_FORMAT_INTERVIEW",
  "RESEARCH_CAST",
  "RESEARCH_LOCATION",
  "RESEARCH_INFO",
  "RESEARCH_EVIDENCE",
  "PROPOSAL",
] as const;
