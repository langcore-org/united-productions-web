export * from './database';

// ===========================================
// Navigation Types
// ===========================================

export interface NavigationItem {
  title: string;
  href: string;
  icon?: string;
  badge?: string | number;
  children?: NavigationItem[];
  isActive?: boolean;
}

// ===========================================
// UI Types
// ===========================================

export interface PageProps {
  params: Promise<{ [key: string]: string | string[] | undefined }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ [key: string]: string | string[] | undefined }>;
}

// ===========================================
// Auth Context Types
// ===========================================

export interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_system_admin: boolean;
}

export interface AuthContext {
  user: AuthUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

// ===========================================
// Agent Type Configurations
// ===========================================

export const AGENT_TYPE_CONFIG = {
  research: {
    label: 'リサーチ',
    icon: '🔍',
    description: '情報収集・調査資料作成',
    color: 'blue',
  },
  idea_finder: {
    label: 'ネタ探し',
    icon: '💡',
    description: 'トレンド・話題発掘',
    color: 'yellow',
  },
  planning: {
    label: '企画作家',
    icon: '📝',
    description: '企画立案・企画書作成',
    color: 'green',
  },
  structure: {
    label: '構成作家',
    icon: '🎬',
    description: '台本・構成作成',
    color: 'purple',
  },
  custom: {
    label: 'カスタム',
    icon: '⚙️',
    description: '自分でプロンプトを設定',
    color: 'gray',
  },
} as const;

// ===========================================
// Program Status Configurations
// ===========================================

export const PROGRAM_STATUS_CONFIG = {
  active: {
    label: '進行中',
    color: 'green',
    dotColor: 'bg-green-500',
  },
  archived: {
    label: 'アーカイブ',
    color: 'gray',
    dotColor: 'bg-gray-500',
  },
  completed: {
    label: '完了',
    color: 'blue',
    dotColor: 'bg-blue-500',
  },
} as const;

// ===========================================
// Role Configurations
// ===========================================

export const WORKSPACE_ROLE_CONFIG = {
  owner: {
    label: 'オーナー',
    description: 'すべての権限を持つワークスペースの所有者',
    color: 'yellow',
  },
  admin: {
    label: '管理者',
    description: 'すべての設定と管理が可能',
    color: 'blue',
  },
  member: {
    label: 'メンバー',
    description: '番組とチームの利用が可能',
    color: 'gray',
  },
} as const;
