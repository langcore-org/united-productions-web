/**
 * 番組情報の型定義（詳細版）
 */

/** 放送時間の詳細 */
export interface BroadcastSchedule {
  /** 曜日 */
  day: string;
  /** 開始時間 */
  startTime: string;
  /** 終了時間 */
  endTime: string;
  /** 備考（SP時の拡張など） */
  note?: string;
}

/** スタッフ情報 */
export interface StaffInfo {
  /** 役職 */
  role: string;
  /** 名前 */
  name: string;
  /** 所属（任意） */
  affiliation?: string;
}

/** コーナー/企画 */
export interface CornerInfo {
  /** コーナー名 */
  name: string;
  /** 内容説明 */
  description: string;
  /** 人気度（高/中/低） */
  popularity?: "high" | "medium" | "low";
}

/** SNS・Web情報 */
export interface SocialInfo {
  /** プラットフォーム */
  platform: string;
  /** URLまたはハンドル */
  url: string;
  /** フォロワー数（任意） */
  followers?: string;
}

/** 受賞・実績 */
export interface AwardInfo {
  /** 年 */
  year: string;
  /** 賞名 */
  name: string;
  /** 備考 */
  note?: string;
}

/** 視聴率情報 */
export interface RatingInfo {
  /** 対象期間 */
  period: string;
  /** 平均視聴率 */
  average?: string;
  /** 最高視聴率 */
  highest?: string;
  /** 備考 */
  note?: string;
}

/** 提供・スポンサー */
export interface SponsorInfo {
  /** 提供社名 */
  name: string;
  /** 提供枠 */
  slot?: string;
}

/** 番組情報（詳細版） */
export interface ProgramInfo {
  /** 番組ID（URL-friendly） */
  id: string;
  /** 番組名 */
  name: string;
  /** 番組名（英語表記・任意） */
  nameEn?: string;
  /** 放送局 */
  station: string;
  /** 放送時間（簡易表示） */
  schedule: string;
  /** 放送時間詳細 */
  scheduleDetail?: BroadcastSchedule[];
  /** 放送枠 */
  timeSlot?: string;
  /** 公式HP URL */
  officialUrl?: string;

  /** MC/メイン出演者 */
  cast: string;
  /** レギュラー出演者（詳細） */
  regularCast?: string[];
  /** ナレーター */
  narrator?: string;
  /** 進行アナウンサー */
  announcer?: string;

  /** スタッフ */
  staff?: StaffInfo[];
  /** 総合演出 */
  chiefDirector?: string;
  /** プロデューサー */
  producers?: string[];
  /** ディレクター */
  directors?: string[];

  /** 番組内容（概要） */
  description: string;
  /** 番組コンセプト */
  concept?: string;
  /** ターゲット層 */
  targetAudience?: string;
  /** 主要コーナー・企画 */
  corners?: CornerInfo[];
  /** 特徴的なルール・形式 */
  format?: string;

  /** 開始年月日 */
  startDate?: string;
  /** 開始時期（テキスト） */
  startDateText?: string;
  /** レギュラー化日 */
  regularStartDate?: string;
  /** 放送回数（累計） */
  totalEpisodes?: string;
  /** 放送歴 */
  broadcastHistory?: string;

  /** 視聴率情報 */
  ratings?: RatingInfo[];
  /** 受賞歴 */
  awards?: AwardInfo[];
  /** 実績・記録 */
  achievements?: string[];

  /** SNS・Web情報 */
  social?: SocialInfo[];
  /** YouTubeチャンネル */
  youtubeChannel?: string;
  /** Twitter/X */
  twitter?: string;
  /** Instagram */
  instagram?: string;
  /** TikTok */
  tiktok?: string;

  /** 提供・スポンサー */
  sponsors?: SponsorInfo[];
  /** 制作協力 */
  productionCooperation?: string[];

  /** 特記事項 */
  notes?: string;
  /** 関連番組 */
  relatedPrograms?: string[];
  /** 派生コンテンツ（書籍・グッズ等） */
  spinoffs?: string[];
  /** 過去のSP */
  pastSpecials?: string[];

  /** キーワード・タグ */
  tags?: string[];
  /** ジャンル */
  genre?: string;
  /** カテゴリ */
  category?: string;
}

/** 会社概要 */
export interface CompanyInfo {
  /** 社名 */
  name: string;
  /** 社名（英語） */
  nameEn?: string;
  /** 設立 */
  founded: string;
  /** 創業（源流） */
  origin?: string;
  /** 所在地 */
  location: string;
  /** 代表者 */
  representative: string;
  /** 従業員数 */
  employees: string;
  /** 資本金 */
  capital: string;
  /** 売上高 */
  revenue?: string;
  /** ミッション */
  mission: string;
  /** ビジョン */
  vision?: string;
  /** 企業理念 */
  philosophy?: string;
  /** 事業内容 */
  businessActivities?: string[];
  /** 親会社 */
  parentCompany?: string;
  /** 関連会社 */
  subsidiaries?: string[];
  /** 公式HP */
  website?: string;
  /** SNS */
  social?: SocialInfo[];
}

/** ナレッジベース全体 */
export interface KnowledgeBase {
  /** 会社概要 */
  company: CompanyInfo;
  /** レギュラー番組一覧 */
  programs: ProgramInfo[];
  /** 更新日 */
  updatedAt: string;
  /** 更新者 */
  updatedBy?: string;
}

/** セレクトボックス用のオプション */
export interface ProgramOption {
  value: string;
  label: string;
  station: string;
  genre?: string;
}
