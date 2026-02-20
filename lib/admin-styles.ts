/**
 * 管理画面共通スタイル定数
 * 
 * アプリ画面と同様のモノトーンカラーパレットを使用
 * 保守性を高めるため、すべての色定義をここに集約
 */

// ============================================
// ベースカラー（モノトーン）
// ============================================

export const COLORS = {
  // プライマリーカラー（黒〜グレー）
  primary: {
    900: "bg-gray-900",
    800: "bg-gray-800",
    700: "bg-gray-700",
    600: "bg-gray-600",
    500: "bg-gray-500",
    400: "bg-gray-400",
    300: "bg-gray-300",
    200: "bg-gray-200",
    100: "bg-gray-100",
    50: "bg-gray-50",
  },
  // テキストカラー
  text: {
    900: "text-gray-900",
    800: "text-gray-800",
    700: "text-gray-700",
    600: "text-gray-600",
    500: "text-gray-500",
    400: "text-gray-400",
    300: "text-gray-300",
  },
  // ボーダーカラー
  border: {
    200: "border-gray-200",
    300: "border-gray-300",
  },
  // 状態カラー（最小限に抑える）
  state: {
    success: "text-green-600",
    error: "text-red-600",
    warning: "text-amber-600",
  },
  stateBg: {
    success: "bg-green-50",
    error: "bg-red-50",
    warning: "bg-amber-50",
  },
} as const;

// ============================================
// コンポーネント別スタイル
// ============================================

export const STYLES = {
  // ヘッダーアイコン
  headerIcon: "w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center text-white",
  
  // カード
  card: "bg-white border border-gray-200 rounded-xl",
  cardHover: "hover:shadow-md transition-shadow",
  
  // 管理メニューカード
  menuCard: (borderColor: string = "gray") => 
    `hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-${borderColor}-500`,
  menuIcon: "w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600",
  
  // バッジ
  badge: {
    default: "bg-gray-100 text-gray-800",
    outline: "border border-gray-200",
    active: "bg-gray-900 text-white",
  },
  
  // ボタン
  button: {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    outline: "border border-gray-200 hover:bg-gray-50",
    danger: "bg-gray-100 text-gray-700 hover:text-red-600 hover:bg-red-50",
  },
  
  // テーブル
  table: {
    header: "border-b border-gray-200 text-sm font-medium text-gray-700",
    row: "border-b border-gray-100 hover:bg-gray-50",
    cell: "py-3 px-4",
  },
  
  // フォーム
  input: "bg-white border border-gray-200 rounded-lg focus:border-gray-400",
  
  // トグル
  toggle: {
    on: "bg-gray-900",
    off: "bg-gray-200",
    thumb: "bg-white",
  },
  
  // アラート
  alert: {
    info: "bg-gray-50 border border-gray-200 text-gray-700",
    warning: "bg-amber-50 border border-amber-200 text-amber-800",
    error: "bg-red-50 border border-red-200 text-red-800",
    success: "bg-green-50 border border-green-200 text-green-800",
  },
  
  // ローディング
  spinner: "text-gray-400",
  
  // リンク
  link: "text-gray-600 hover:text-gray-900 hover:underline",
  
  // 区切り線
  divider: "border-gray-200",
} as const;

// ============================================
// 管理メニュー定義
// ============================================

export const ADMIN_MENU_ITEMS = [
  { id: "users", label: "ユーザー一覧", icon: "Users", borderColor: "gray" },
  { id: "prompts", label: "プロンプト管理", icon: "FileText", borderColor: "gray" },
  { id: "usage", label: "使用量・コスト", icon: "Activity", borderColor: "gray" },
  { id: "logs", label: "アプリケーションログ", icon: "ScrollText", borderColor: "gray" },
  { id: "grok-tools", label: "Grokツール設定", icon: "Bot", borderColor: "gray" },
] as const;

// ============================================
// ユーティリティ関数
// ============================================

/**
 * プロバイダーに応じたバッジスタイルを取得（モノトーン版）
 */
export function getProviderBadgeStyle(providerId: string): string {
  // すべてのプロバイダーで共通のグレースタイルを使用
  return "bg-gray-100 text-gray-800 border-gray-200";
}

/**
 * 統計バッジのカラースタイル（モノトーン版）
 */
export function getStatBadgeStyle(index: number): string {
  // インデックスに関わらずグレー系を循環
  const styles = [
    "bg-gray-100 text-gray-800",
    "bg-gray-200 text-gray-800",
    "bg-gray-300 text-gray-800",
  ];
  return styles[index % styles.length];
}
