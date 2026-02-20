/**
 * エージェント思考プロセスの型定義
 * 
 * Manus風の階層的ステップ表示用
 * 
 * @updated 2026-02-20 23:10
 */

/**
 * サブステップの型（検索クエリ、ツール呼び出し等）
 */
export interface SubStep {
  /** 一意のID */
  id: string;
  /** サブステップの種類 */
  type: 'search' | 'tool_use' | 'knowledge' | 'file_edit' | 'read';
  /** 表示ラベル */
  label: string;
  /** 詳細内容（オプション） */
  detail?: string;
  /** ステータス */
  status: 'pending' | 'running' | 'completed' | 'error';
  /** 検索クエリ（type='search'の場合） */
  searchQuery?: string;
  /** ツール名（type='tool_use'の場合） */
  toolName?: string;
  /** アイコン（オプション） */
  icon?: string;
  /** メタデータ */
  metadata?: {
    resultCount?: number;
    duration?: number;
    [key: string]: unknown;
  };
  /** 作成時刻 */
  timestamp: Date;
}

/**
 * 検索結果のアイテム
 */
export interface SearchResultItem {
  /** 一意のID */
  id: string;
  /** タイトル */
  title: string;
  /** 説明文/スニペット */
  description: string;
  /** URL */
  url: string;
  /** ファビコンURL（オプション） */
  favicon?: string;
  /** ソース名 */
  source?: string;
  /** 関連するサブステップID */
  subStepId?: string;
}

/**
 * 思考ステップの型
 */
export interface ThinkingStep {
  /** 一意のID */
  id: string;
  /** ステップ番号（表示用） */
  stepNumber: number;
  /** ステップの種類 */
  type: 'thinking' | 'search' | 'analysis' | 'synthesis' | 'complete';
  /** タイトル */
  title: string;
  /** 説明文 */
  content?: string;
  /** ステータス */
  status: 'running' | 'completed' | 'error';
  /** サブステップ一覧 */
  subSteps: SubStep[];
  /** 検索結果（type='search'の場合） */
  searchResults?: SearchResultItem[];
  /** 進捗情報（例: "3/3"） */
  progress?: {
    current: number;
    total: number;
  };
  /** メタデータ */
  metadata?: {
    toolName?: string;
    knowledgeCount?: number;
    [key: string]: unknown;
  };
  /** 作成時刻 */
  timestamp: Date;
  /** 完了時刻（オプション） */
  completedAt?: Date;
}

/**
 * Computerパネルの状態
 */
export interface ComputerPanelState {
  /** 表示状態 */
  isOpen: boolean;
  /** 現在表示中の検索結果 */
  activeSearchResults: SearchResultItem[];
  /** アクティブなサブステップID */
  activeSubStepId?: string;
  /** 検索クエリ */
  searchQuery?: string;
}

/**
 * 思考プロセス全体の状態
 */
export interface ThinkingProcessState {
  /** ステップ一覧 */
  steps: ThinkingStep[];
  /** 現在アクティブなステップID */
  activeStepId?: string;
  /** 完了したステップ数 */
  completedSteps: number;
  /** 全ステップ数 */
  totalSteps: number;
  /** 全体のステータス */
  overallStatus: 'idle' | 'running' | 'completed' | 'error';
  /** 開始時刻 */
  startedAt?: Date;
  /** 完了時刻 */
  completedAt?: Date;
}

/**
 * ストリーミングイベントの型
 */
export type ThinkingEvent =
  | { type: 'step_start'; step: ThinkingStep }
  | { type: 'step_update'; stepId: string; updates: Partial<ThinkingStep> }
  | { type: 'step_complete'; stepId: string; completedAt: Date }
  | { type: 'substep_add'; stepId: string; subStep: SubStep }
  | { type: 'substep_update'; stepId: string; subStepId: string; updates: Partial<SubStep> }
  | { type: 'search_results'; stepId: string; subStepId: string; results: SearchResultItem[] }
  | { type: 'content_append'; stepId: string; content: string }
  | { type: 'complete' }
  | { type: 'error'; error: string };

/**
 * コンポーネントPropsの共通型
 */
export interface ThinkingComponentProps {
  /** 追加クラス名 */
  className?: string;
}
