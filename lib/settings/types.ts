/**
 * 設定管理の型定義
 * 
 * アプリケーション全体の設定を一元管理するための型定義
 */

/** 設定カテゴリ */
export type SettingCategory = 
  | "general"      // 一般設定
  | "llm"          // LLM設定
  | "cache"        // キャッシュ設定
  | "rateLimit"    // レート制限
  | "ui"           // UI設定
  | "security";    // セキュリティ設定

/** 設定項目の型 */
export type SettingValue = string | number | boolean | string[];

/** 設定項目 */
export interface SettingItem {
  id: string;
  category: SettingCategory;
  key: string;
  label: string;
  description: string;
  type: "string" | "number" | "boolean" | "select" | "multiselect" | "textarea";
  value: SettingValue;
  defaultValue: SettingValue;
  options?: { label: string; value: string }[]; // select/multiselect用
  min?: number;      // number用
  max?: number;      // number用
  step?: number;     // number用
  required?: boolean;
  secret?: boolean;  // パスワード等（表示時にマスク）
  readOnly?: boolean;
}

/** カテゴリ情報 */
export interface SettingCategoryInfo {
  id: SettingCategory;
  label: string;
  description: string;
  icon: string;
}

/** 設定カテゴリ一覧 */
export const SETTING_CATEGORIES: SettingCategoryInfo[] = [
  {
    id: "general",
    label: "一般設定",
    description: "アプリケーション全般の基本設定",
    icon: "Settings",
  },
  {
    id: "llm",
    label: "LLM設定",
    description: "AIモデルとAPI関連の設定",
    icon: "Brain",
  },
  {
    id: "cache",
    label: "キャッシュ設定",
    description: "レスポンスキャッシュの設定",
    icon: "Database",
  },
  {
    id: "rateLimit",
    label: "レート制限",
    description: "API利用制限の設定",
    icon: "Gauge",
  },
  {
    id: "ui",
    label: "UI設定",
    description: "インターフェース関連の設定",
    icon: "Palette",
  },
  {
    id: "security",
    label: "セキュリティ",
    description: "認証・認可関連の設定",
    icon: "Shield",
  },
];

/** デフォルト設定値 */
export const DEFAULT_SETTINGS: SettingItem[] = [
  // 一般設定
  {
    id: "app-name",
    category: "general",
    key: "app.name",
    label: "アプリケーション名",
    description: "ヘッダーに表示されるアプリケーション名",
    type: "string",
    value: "Teddy",
    defaultValue: "Teddy",
    required: true,
  },
  {
    id: "app-description",
    category: "general",
    key: "app.description",
    label: "アプリケーション説明",
    description: "メタタグ等に使用される説明文",
    type: "textarea",
    value: "テレビ制作業務を支援するAIアシスタント",
    defaultValue: "テレビ制作業務を支援するAIアシスタント",
  },

  // LLM設定
  {
    id: "llm-default-provider",
    category: "llm",
    key: "llm.defaultProvider",
    label: "デフォルトLLMプロバイダー",
    description: "チャットで使用するデフォルトのAIモデル",
    type: "select",
    value: "gemini-2.5-flash-lite",
    defaultValue: "gemini-2.5-flash-lite",
    options: [
      { label: "Gemini 2.5 Flash-Lite", value: "gemini-2.5-flash-lite" },
      { label: "Gemini 3.0 Flash", value: "gemini-3.0-flash" },
      { label: "Grok 4.1 Fast", value: "grok-4-1-fast-reasoning" },
      { label: "Grok 4", value: "grok-4-0709" },
      { label: "GPT-4o-mini", value: "gpt-4o-mini" },
      { label: "GPT-5", value: "gpt-5" },
      // { label: "Claude Sonnet 4.5", value: "claude-sonnet-4.5" },
      // { label: "Claude Opus 4.6", value: "claude-opus-4.6" },
      { label: "Perplexity Sonar", value: "perplexity-sonar" },
      { label: "Perplexity Sonar Pro", value: "perplexity-sonar-pro" },
    ],
  },
  {
    id: "llm-max-tokens",
    category: "llm",
    key: "llm.maxTokens",
    label: "最大トークン数",
    description: "1回のリクエストで生成される最大トークン数",
    type: "number",
    value: 4096,
    defaultValue: 4096,
    min: 256,
    max: 8192,
    step: 256,
  },
  {
    id: "llm-temperature",
    category: "llm",
    key: "llm.temperature",
    label: "Temperature",
    description: "出力のランダム性（低いほど決定的）",
    type: "number",
    value: 0.7,
    defaultValue: 0.7,
    min: 0,
    max: 2,
    step: 0.1,
  },
  {
    id: "llm-streaming",
    category: "llm",
    key: "llm.streamingEnabled",
    label: "ストリーミング有効",
    description: "リアルタイムでレスポンスを表示",
    type: "boolean",
    value: true,
    defaultValue: true,
  },

  // キャッシュ設定
  {
    id: "cache-enabled",
    category: "cache",
    key: "cache.enabled",
    label: "キャッシュ有効",
    description: "LLMレスポンスのキャッシュを有効にする",
    type: "boolean",
    value: true,
    defaultValue: true,
  },
  {
    id: "cache-ttl",
    category: "cache",
    key: "cache.ttl",
    label: "キャッシュ有効期間（時間）",
    description: "キャッシュデータの保持期間",
    type: "number",
    value: 24,
    defaultValue: 24,
    min: 1,
    max: 168,
    step: 1,
  },

  // レート制限
  {
    id: "rate-limit-rpm",
    category: "rateLimit",
    key: "rateLimit.rpm",
    label: "RPM制限",
    description: "1分あたりの最大リクエスト数",
    type: "number",
    value: 30,
    defaultValue: 30,
    min: 10,
    max: 100,
    step: 5,
  },
  {
    id: "rate-limit-rpd",
    category: "rateLimit",
    key: "rateLimit.rpd",
    label: "RPD制限",
    description: "1日あたりの最大リクエスト数",
    type: "number",
    value: 1500,
    defaultValue: 1500,
    min: 100,
    max: 10000,
    step: 100,
  },

  // UI設定
  {
    id: "ui-sidebar-default",
    category: "ui",
    key: "ui.sidebarCollapsed",
    label: "サイドバー初期状態",
    description: "ページ読み込み時のサイドバー状態",
    type: "select",
    value: "expanded",
    defaultValue: "expanded",
    options: [
      { label: "展開", value: "expanded" },
      { label: "縮小", value: "collapsed" },
    ],
  },
  {
    id: "ui-theme",
    category: "ui",
    key: "ui.theme",
    label: "テーマ",
    description: "アプリケーションのカラーテーマ",
    type: "select",
    value: "light",
    defaultValue: "light",
    options: [
      { label: "ライト", value: "light" },
      { label: "ダーク", value: "dark" },
      { label: "システム", value: "system" },
    ],
  },
  {
    id: "ui-message-format",
    category: "ui",
    key: "ui.defaultMessageFormat",
    label: "デフォルトメッセージ形式",
    description: "チャットメッセージのデフォルト表示形式",
    type: "select",
    value: "markdown",
    defaultValue: "markdown",
    options: [
      { label: "Markdown", value: "markdown" },
      { label: "プレーンテキスト", value: "plaintext" },
    ],
  },

  // セキュリティ設定
  {
    id: "security-session-timeout",
    category: "security",
    key: "security.sessionTimeout",
    label: "セッションタイムアウト（分）",
    description: "自動ログアウトまでの非活動時間",
    type: "number",
    value: 60,
    defaultValue: 60,
    min: 15,
    max: 480,
    step: 15,
  },
  {
    id: "security-max-login-attempts",
    category: "security",
    key: "security.maxLoginAttempts",
    label: "最大ログイン試行回数",
    description: "アカウントロックまでの失敗許容回数",
    type: "number",
    value: 5,
    defaultValue: 5,
    min: 3,
    max: 10,
    step: 1,
  },
];

/** 設定をカテゴリ別にグループ化 */
export function groupSettingsByCategory(settings: SettingItem[]): Record<SettingCategory, SettingItem[]> {
  return settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<SettingCategory, SettingItem[]>);
}

/** 設定値の検証 */
export function validateSetting(setting: SettingItem, value: SettingValue): string | null {
  // 必須チェック
  if (setting.required && (value === "" || value === null || value === undefined)) {
    return "この項目は必須です";
  }

  // 型別の検証
  switch (setting.type) {
    case "number": {
      const num = Number(value);
      if (isNaN(num)) {
        return "数値を入力してください";
      }
      if (setting.min !== undefined && num < setting.min) {
        return `${setting.min}以上の値を入力してください`;
      }
      if (setting.max !== undefined && num > setting.max) {
        return `${setting.max}以下の値を入力してください`;
      }
      break;
    }
    case "string":
    case "textarea": {
      if (typeof value !== "string") {
        return "文字列を入力してください";
      }
      break;
    }
    case "select": {
      if (!setting.options?.some(opt => opt.value === value)) {
        return "有効な選択肢を選んでください";
      }
      break;
    }
    case "multiselect": {
      if (!Array.isArray(value)) {
        return "配列を選択してください";
      }
      break;
    }
  }

  return null;
}
