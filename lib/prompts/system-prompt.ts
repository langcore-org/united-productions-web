/**
 * システムプロンプト構築（一元管理版 / Supabase版）
 *
 * 番組情報と機能プロンプトを結合してシステムプロンプトを生成
 *
 * @created 2026-02-25
 * @updated 2026-03-09 Supabase移行
 * @updated 2026-03-12 ラインナップ情報を追加
 */

import { getLineupByProgramId } from "@/lib/knowledge/lineup";
import type { LineupEpisodeInfo } from "@/lib/knowledge/types";
import { createClient } from "@/lib/supabase/server";
import { getPromptFromDB } from "@/lib/prompts/db/crud";

// =============================================================================
// データ（直接定義）
// =============================================================================

const PROGRAMS = [
  {
    id: "matsuko",
    name: "マツコの知らない世界",
    station: "TBS",
    schedule: "毎週火曜 20:55〜",
    cast: "マツコ・デラックス",
    description:
      "ゲスト自ら得意ジャンルやハマっているものを企画として持ち込み、マツコ・デラックスとサシトーク",
    startDate: "2011年〜",
    notes: "TBSの看板バラエティ番組。様々なジャンルのマニアが登場し、マツコにプレゼン",
  },
  {
    id: "shikujiri",
    name: "しくじり先生 俺みたいになるな!!",
    station: "テレビ朝日系列／Abema",
    schedule: "毎週月曜 23:15〜（レギュラー）、Abemaで毎月1〜3週金曜21:30〜配信",
    cast: "ギャル曽根",
    description: "有名人が自身の失敗談を「授業」として披露するバラエティ。視聴者が教訓を学ぶ形式",
    notes: "「しくじり」という言葉を定着させた人気番組",
  },
  {
    id: "kaneo",
    name: "有吉のお金発見 突撃！カネオくん",
    station: "NHK総合テレビ",
    schedule: "毎週土曜 20:15〜20:53",
    cast: "有吉弘行、カネオくん（千鳥・ノブのキャラクター）",
    description: "身近なものの「お金の秘密」を徹底調査。商品の値段の仕組みや裏側を解説",
    notes: "NHKで珍しいバラエティ色の強い番組。カネオくん人形が人気。再放送は土曜10:05〜10:38",
  },
  {
    id: "achikochi",
    name: "あちこちオードリー",
    station: "テレビ東京",
    schedule: "毎週水曜 23:06〜",
    cast: "オードリー（若林正恭・春日俊彰）",
    description:
      "飲食店を模したスタジオで、オードリーがゲストとトークを展開。大将（春日）と常連（若林）の設定",
    startDate: "2019年10月5日〜",
    notes: "オードリーの冠番組。330回以上放送中の長寿番組",
  },
  {
    id: "kamaigachi",
    name: "かまいガチ",
    station: "テレビ朝日",
    schedule: "毎週水曜 23:15〜",
    cast: "かまいたち（山内健司・濱家隆一）",
    description: "かまいたちが「ガチ」で様々なことに挑戦。演技・ロケ・ゲームなど多岐にわたる",
    notes: "かまいたちの関東初冠レギュラー番組。2022年4月から放送時間が23:15に繰り上がり",
  },
  {
    id: "onirenchan",
    name: "千鳥の鬼レンチャン",
    station: "フジテレビ",
    schedule: "毎週日曜 19:00〜20:54（2025年4月から2時間番組に拡大）",
    cast: "千鳥（大悟・ノブ）、対決パネラー：かまいたち（濱家隆一・山内健司）",
    description:
      "「サビだけカラオケ」などの人気企画で、芸能人が挑戦。1音も外さずに10曲歌えるかなどのゲーム",
    startDate: "2022年レギュラー化",
    notes: "2025年4月から放送時間拡大（1時間→2時間）。フジテレビの看板バラエティ",
  },
  {
    id: "maniasan",
    name: "熱狂マニアさん！",
    station: "TBS",
    schedule: "毎週土曜 19:00〜（基本1時間、SP時は2〜3時間）",
    cast: "",
    description: "様々なジャンルの熱狂的なマニアを発掘。行き過ぎた愛を語る",
    startDate: "2023年4月15日から現タイトル・時間帯に変更",
    notes:
      "旧タイトル：「〜通販マニアさん」。ニトリマニア、家事マニアなど身近なジャンルのマニアが登場",
  },
  {
    id: "hayashiosamu",
    name: "林修の今知りたいでしょ！",
    station: "テレビ朝日",
    schedule: "毎週木曜 19:00〜",
    cast: "林修、副担任：斎藤ちはる（テレビ朝日アナウンサー）",
    description:
      "普段は教える立場の林修先生が生徒に変身。各分野の講師が林修に知らない世界をレクチャー",
    notes: "テレビ朝日が選ぶ「青少年に見てもらいたい番組」。林修の名言「今でしょ！」が番組名に",
  },
  {
    id: "kamichallenge",
    name: "THE神業チャレンジ",
    station: "TBS",
    schedule: "毎週火曜 19:00〜（基本1時間、SP時は拡大）",
    cast: "総合演出：林博史（UNITED PRODUCTIONS所属）",
    description: "神業クレーンゲーム、画面隠し太鼓の達人など、達人の技をクリアするゲームバラエティ",
    startDate: "2023年4月11日〜",
    notes: "達人の技を芸能人が挑戦する形式。スペシャル版も定期的に放送",
  },
  {
    id: "nikagame",
    name: "ニカゲーム",
    station: "テレビ朝日",
    schedule: "毎週水曜 25:58〜（深夜）",
    cast: "二階堂高嗣（Kis-My-Ft2）、松井ケムリ（令和ロマン）、猪俣周杜（timelesz）",
    description:
      "「二階堂＋カム（Come）＝ニカゲーム」。ちょっと奇妙な教育番組の世界でひらめきゲームに挑戦",
    startDate: "2025年10月1日〜",
    notes: "2025年4月『バラバラマンスリー』→6月全国放送特番→8月リアルイベントを経てレギュラー化",
  },
  {
    id: "mainichioogiri",
    name: "まいにち大喜利",
    station: "テレビ朝日／YouTube",
    schedule: "月〜金 朝7:00〜（ショート動画）、完全版は金曜17:00〜配信",
    cast: "MC：モグライダー（芝大輔・ともしげ）",
    description:
      "芸人たちが毎日渾身の大喜利を披露。テレ朝公式YouTube「動画、はじめてみました」で配信される人気コンテンツ",
    startDate: "2022年11月〜",
    notes: "「まいにちシリーズ」第1弾。累計再生回数1.4億回を誇る人気YouTube番組",
  },
  {
    id: "mainichishouresu",
    name: "まいにち賞レース",
    station: "テレビ朝日／YouTube",
    schedule: "金曜17:00〜配信（完全版）",
    cast: "MC：アルコ＆ピース（平子祐希・酒井健太）",
    description:
      "極狭（ごくせま）＝ニッチなジャンルで特異な能力を発揮する人々にスポットライトを当て、その頂点を決める賞レース",
    startDate: "2023年11月〜",
    notes: "「まいにちシリーズ」第2弾。審査員は週替りで若者世代に人気のアイドルが担当",
  },
  {
    id: "henaimuseum",
    name: "偏愛博物館",
    station: "BS-TBS",
    schedule: "毎週日曜 18:30〜（再放送も同時間帯）",
    cast: "伊集院光",
    description:
      "何かを愛しすぎてしまった人が作った私設博物館＝「偏愛ミュージアム」に伊集院光が訪問し、その魅力を楽しむ",
    startDate: "2025年3月〜",
    notes: "日本全国にある5700以上の博物館の中から、個人が愛情を注いで作ったユニークな博物館を紹介",
  },
];

// =============================================================================
// フォーマット関数
// =============================================================================

function formatProgram(program: (typeof PROGRAMS)[0]): string {
  const lines = [
    `## ${program.name}`,
    "",
    `- 放送局: ${program.station}`,
    `- 放送時間: ${program.schedule}`,
    `- MC/出演者: ${program.cast || "記載なし"}`,
    `- 番組内容: ${program.description}`,
  ];

  if (program.startDate) {
    lines.push(`- 開始時期: ${program.startDate}`);
  }
  if (program.notes) {
    lines.push(`- 特記事項: ${program.notes}`);
  }

  return lines.join("\n");
}

function formatAllPrograms(): string {
  const programTexts = PROGRAMS.map(formatProgram);
  return [`# レギュラー番組一覧（${PROGRAMS.length}本）`, "", ...programTexts].join("\n");
}

// =============================================================================
// ラインナップ情報フォーマット関数
// =============================================================================

/**
 * エピソード情報をフォーマット
 */
function formatEpisode(episode: LineupEpisodeInfo, index: number): string {
  const lines: string[] = [];

  lines.push(`### エピソード ${index + 1}`);
  lines.push("");

  if (episode.episodeNumber) {
    lines.push(`- 回数: ${episode.episodeNumber}`);
  }
  lines.push(`- 放送日: ${episode.broadcastDateRaw.replace(/\r\n/g, " ").trim()}`);

  if (episode.recordingDate) {
    lines.push(`- 収録日: ${episode.recordingDate.replace(/\r\n/g, " ").trim()}`);
  }
  if (episode.director) {
    lines.push(`- 演出: ${episode.director}`);
  }

  lines.push(`- 内容: ${episode.content.replace(/\r\n/g, " ").trim()}`);

  if (episode.locationCast) {
    lines.push(`- ロケ出演者: ${episode.locationCast.replace(/\r\n/g, " ").trim()}`);
  }
  if (episode.studioCast) {
    lines.push(`- スタジオ出演者: ${episode.studioCast.replace(/\r\n/g, " ").trim()}`);
  }
  if (episode.rating) {
    lines.push(`- 視聴率: ${episode.rating.replace(/\r\n/g, " ").trim()}`);
  }
  if (episode.competingPrograms) {
    lines.push(`- 裏番組: ${episode.competingPrograms.replace(/\r\n/g, " ").trim()}`);
  }
  if (episode.notes) {
    lines.push(`- 備考: ${episode.notes.replace(/\r\n/g, " ").trim()}`);
  }

  // 制作情報
  if (episode.production && Object.keys(episode.production).length > 0) {
    lines.push("- 制作情報:");
    for (const [key, value] of Object.entries(episode.production)) {
      if (typeof value === "string") {
        lines.push(`  - ${key}: ${value.replace(/\r\n/g, " ").trim()}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * ラインナップ情報をフォーマット
 */
function formatLineup(programId: string): string {
  const lineup = getLineupByProgramId(programId);

  if (!lineup || lineup.length === 0) {
    return "";
  }

  const program = PROGRAMS.find((p) => p.id === programId);
  const programName = program?.name || programId;

  const lines: string[] = [];
  lines.push(`## ${programName}の放送回ラインナップ（${lineup.length}回分）`);
  lines.push("");

  // 最新の放送回から順に表示（最大20回）
  const recentLineup = lineup.slice(0, 20);

  for (let i = 0; i < recentLineup.length; i++) {
    lines.push(formatEpisode(recentLineup[i], i));
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * 全番組のラインナップ情報をフォーマット
 */
function formatAllLineups(): string {
  const lines: string[] = [];
  lines.push("# 番組ラインナップ情報");
  lines.push("");

  // マニアさんのラインナップ
  const maniasanLineupText = formatLineup("maniasan");
  if (maniasanLineupText) {
    lines.push(maniasanLineupText);
    lines.push("");
  }

  // 神チャレンジのラインナップ
  const kamichallengeLineupText = formatLineup("kamichallenge");
  if (kamichallengeLineupText) {
    lines.push(kamichallengeLineupText);
    lines.push("");
  }

  return lines.join("\n");
}

// =============================================================================
// 出演者リサーチ用：全出演者リスト
// =============================================================================

/**
 * テキストから出演者名を抽出（○や⚪︎マークを除去）
 */
function extractCastNames(text: string | undefined): string[] {
  if (!text) return [];

  // ○や⚪︎などのマークと空白を除去して抽出
  const cleaned = text
    .replace(/○/g, "")
    .replace(/⚪/g, "")
    .replace(/⚪︎/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[（(].*?[)）]/g, "") // 括弧内の文字を除去
    .replace(/\s+/g, " ")
    .trim();

  // 区切り文字で分割
  const names = cleaned
    .split(/[、,\n\r・]/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0 && n.length < 50); // 長すぎるものは除外（本文の可能性）

  return names;
}

/**
 * ラインナップから全出演者を抽出して集計
 */
function extractAllCasts(
  lineup: LineupEpisodeInfo[],
): Map<string, { count: number; episodes: string[] }> {
  const castMap = new Map<string, { count: number; episodes: string[] }>();

  for (const episode of lineup) {
    const episodeNum = episode.episodeNumber || "不明";

    // ロケ出演者から抽出
    const locationCasts = extractCastNames(episode.locationCast);
    for (const name of locationCasts) {
      const current = castMap.get(name) || { count: 0, episodes: [] };
      current.count++;
      if (!current.episodes.includes(episodeNum)) {
        current.episodes.push(episodeNum);
      }
      castMap.set(name, current);
    }

    // スタジオ出演者から抽出
    const studioCasts = extractCastNames(episode.studioCast);
    for (const name of studioCasts) {
      const current = castMap.get(name) || { count: 0, episodes: [] };
      current.count++;
      if (!current.episodes.includes(episodeNum)) {
        current.episodes.push(episodeNum);
      }
      castMap.set(name, current);
    }
  }

  return castMap;
}

/**
 * 出演者リサーチ用：全出演者名のみをフォーマット（回数なし・コンパクト版）
 */
function formatCastListForResearch(programId: string): string {
  const lineup = getLineupByProgramId(programId);

  if (!lineup || lineup.length === 0) {
    return "";
  }

  const program = PROGRAMS.find((p) => p.id === programId);
  const programName = program?.name || programId;

  const castMap = extractAllCasts(lineup);

  if (castMap.size === 0) {
    return "";
  }

  // アルファベット順・あいうえお順にソート
  const sortedCasts = Array.from(castMap.keys()).sort((a, b) => a.localeCompare(b, "ja"));

  const lines: string[] = [];
  lines.push(`## ${programName}の出演者一覧（全${sortedCasts.length}名）`);
  lines.push("");
  lines.push(sortedCasts.join("、"));
  lines.push("");

  return lines.join("\n");
}

/**
 * 全番組の出演者リストをフォーマット（出演者リサーチ用）
 */
function formatAllCastListsForResearch(): string {
  const lines: string[] = [];
  lines.push("# 全番組の出演者一覧");
  lines.push("");

  // マニアさんの出演者
  const maniasanCastText = formatCastListForResearch("maniasan");
  if (maniasanCastText) {
    lines.push(maniasanCastText);
    lines.push("");
  }

  // 神チャレンジの出演者
  const kamichallengeCastText = formatCastListForResearch("kamichallenge");
  if (kamichallengeCastText) {
    lines.push(kamichallengeCastText);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * 出演者リサーチ用：直近5回の詳細ラインナップをフォーマット
 */
function formatRecentLineupForResearch(programId: string): string {
  const lineup = getLineupByProgramId(programId);

  if (!lineup || lineup.length === 0) {
    return "";
  }

  const program = PROGRAMS.find((p) => p.id === programId);
  const programName = program?.name || programId;

  const lines: string[] = [];
  lines.push(`## ${programName}の直近5回放送回詳細`);
  lines.push("");

  // 直近5回を取得（末尾から）
  const recentLineup = lineup.slice(-5);

  for (let i = 0; i < recentLineup.length; i++) {
    lines.push(formatEpisode(recentLineup[i], i));
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * 全番組の直近5回放送回をフォーマット（出演者リサーチ用）
 */
function formatAllRecentLineupsForResearch(): string {
  const lines: string[] = [];
  lines.push("# 全番組の直近5回放送回詳細");
  lines.push("");

  // マニアさんの直近5回
  const maniasanLineupText = formatRecentLineupForResearch("maniasan");
  if (maniasanLineupText) {
    lines.push(maniasanLineupText);
    lines.push("");
  }

  // 神チャレンジの直近5回
  const kamichallengeLineupText = formatRecentLineupForResearch("kamichallenge");
  if (kamichallengeLineupText) {
    lines.push(kamichallengeLineupText);
    lines.push("");
  }

  return lines.join("\n");
}

function createFooter(): string {
  return [
    "---",
    "",
    "上記の詳細な番組情報を前提知識として保持してください。",
    "ユーザーの質問に応じて、番組情報を参照しつつ適切に回答してください。",
    "可能な限り具体的な情報（放送時間、出演者、コーナー名など）を含めて回答してください。",
  ].join("\n");
}

// =============================================================================
// キャッシュ
// =============================================================================

interface CacheEntry {
  prompt: string;
  expires: number;
}

const promptCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCacheKey(programId: string, featureId?: string): string {
  return `${programId}:${featureId || "default"}`;
}

function getCachedPrompt(programId: string, featureId?: string): string | null {
  const key = getCacheKey(programId, featureId);
  const entry = promptCache.get(key);

  if (!entry) return null;

  if (Date.now() > entry.expires) {
    promptCache.delete(key);
    return null;
  }

  return entry.prompt;
}

function setCachedPrompt(programId: string, featureId: string | undefined, prompt: string): void {
  const key = getCacheKey(programId, featureId);
  promptCache.set(key, {
    prompt,
    expires: Date.now() + CACHE_TTL_MS,
  });
}

// =============================================================================
// DB操作
// =============================================================================

async function getPromptByFeatureId(featureId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: mapping } = await supabase
    .from("feature_prompts")
    .select("prompt_key")
    .eq("feature_id", featureId)
    .eq("is_active", true)
    .single();

  if (!mapping) return null;

  return getPromptFromDB(mapping.prompt_key);
}

// =============================================================================
// 公開API
// =============================================================================

/**
 * システムプロンプトを構築
 */
export async function buildSystemPrompt(
  programId: string = "all",
  featureId?: string,
): Promise<string> {
  const isDevOrTest = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  if (!isDevOrTest) {
    const cached = getCachedPrompt(programId, featureId);
    if (cached) {
      return cached;
    }
  }

  const baseParts: string[] = [];

  if (programId === "all") {
    baseParts.push(formatAllPrograms());
    baseParts.push("");

    // 出演者リサーチ機能の場合は全出演者リスト+直近5回詳細を追加
    if (featureId === "research-cast") {
      baseParts.push(formatAllCastListsForResearch());
      baseParts.push("");
      baseParts.push(formatAllRecentLineupsForResearch());
    } else {
      // その他の機能はラインナップ情報（最新20回）
      baseParts.push(formatAllLineups());
    }
  } else {
    const program = PROGRAMS.find((p) => p.id === programId);
    if (program) {
      baseParts.push(formatProgram(program));
      baseParts.push("");

      // 出演者リサーチ機能の場合は全出演者リスト+直近5回詳細を追加
      if (featureId === "research-cast") {
        const castListText = formatCastListForResearch(programId);
        if (castListText) {
          baseParts.push(castListText);
        }
        const recentLineupText = formatRecentLineupForResearch(programId);
        if (recentLineupText) {
          baseParts.push("");
          baseParts.push(recentLineupText);
        }
      } else {
        // その他の機能はラインナップ情報（最新20回）
        const lineupText = formatLineup(programId);
        if (lineupText) {
          baseParts.push(lineupText);
        }
      }
    } else {
      baseParts.push(formatAllPrograms());
      baseParts.push("");

      // 出演者リサーチ機能の場合は全出演者リスト+直近5回詳細を追加
      if (featureId === "research-cast") {
        baseParts.push(formatAllCastListsForResearch());
        baseParts.push("");
        baseParts.push(formatAllRecentLineupsForResearch());
      } else {
        baseParts.push(formatAllLineups());
      }
    }
  }

  baseParts.push("", createFooter());
  const basePrompt = baseParts.join("\n");

  if (!featureId) return basePrompt;

  const featurePrompt = await getPromptByFeatureId(featureId);
  if (!featurePrompt) return basePrompt;

  const finalPrompt = `${basePrompt}\n\n---\n\n## 機能固有の指示\n\n${featurePrompt}`;

  if (!isDevOrTest) {
    setCachedPrompt(programId, featureId, finalPrompt);
  }

  return finalPrompt;
}

/**
 * 番組情報のみのプロンプトを構築（同期版）
 */
export function buildProgramPrompt(programId: string = "all"): string {
  const parts: string[] = [];

  if (programId === "all") {
    parts.push(formatAllPrograms());
    parts.push("");
    parts.push(formatAllLineups());
  } else {
    const program = PROGRAMS.find((p) => p.id === programId);
    if (program) {
      parts.push(formatProgram(program));
      parts.push("");
      const lineupText = formatLineup(programId);
      if (lineupText) {
        parts.push(lineupText);
      }
    } else {
      parts.push(formatAllPrograms());
      parts.push("");
      parts.push(formatAllLineups());
    }
  }

  parts.push("", createFooter());
  return parts.join("\n");
}
