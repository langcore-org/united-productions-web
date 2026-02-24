/**
 * 番組情報の型定義
 */

export interface ProgramInfo {
  /** 番組ID（URL-friendly） */
  id: string;
  /** 番組名 */
  name: string;
  /** 放送局 */
  station: string;
  /** 放送時間 */
  schedule: string;
  /** MC/出演者 */
  cast: string;
  /** 番組内容 */
  description: string;
  /** 開始時期 */
  startDate?: string;
  /** 特記事項 */
  notes?: string;
  /** 追加情報（キー値ペア） */
  extra?: Record<string, string>;
}

export interface CompanyInfo {
  /** 社名 */
  name: string;
  /** 設立 */
  founded: string;
  /** 所在地 */
  location: string;
  /** 代表者 */
  representative: string;
  /** 従業員数 */
  employees: string;
  /** 資本金 */
  capital: string;
  /** ミッション */
  mission: string;
}

export interface KnowledgeBase {
  /** 会社概要 */
  company: CompanyInfo;
  /** レギュラー番組一覧 */
  programs: ProgramInfo[];
  /** 更新日 */
  updatedAt: string;
}

/** セレクトボックス用のオプション */
export interface ProgramOption {
  value: string;
  label: string;
  station: string;
}
