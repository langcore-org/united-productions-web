/**
 * United Productions レギュラー番組データ（詳細版）
 *
 * データのみを提供（プロンプト生成は lib/prompts/system-prompt.ts で行う）
 */

import {
  programAchikochi,
  programKamaigachi,
  programKaneo,
  programManiasan,
  programMatsuko,
  programOnirenchan,
  programShikujiri,
} from "./programs-detailed-data";
import {
  programHayashiosamu,
  programHenaimuseum,
  programKamichallenge,
  programMainichioogiri,
  programMainichishouresu,
  programNikagame,
} from "./programs-detailed-data-2";
import type { KnowledgeBase, ProgramInfo, ProgramOption } from "./types";

// 13番組の詳細データ
export const programs: ProgramInfo[] = [
  programMatsuko,
  programShikujiri,
  programKaneo,
  programAchikochi,
  programKamaigachi,
  programOnirenchan,
  programManiasan,
  programHayashiosamu,
  programKamichallenge,
  programNikagame,
  programMainichioogiri,
  programMainichishouresu,
  programHenaimuseum,
];

/** ナレッジベース全体 */
export const knowledgeBase: KnowledgeBase = {
  programs: programs,
  updatedAt: "2026-02-27",
  updatedBy: "AI Assistant",
};

/** セレクトボックス用オプション一覧 */
export const programOptions: ProgramOption[] = programs.map((p) => ({
  value: p.id,
  label: p.name,
  station: p.station,
  genre: p.genre,
}));

/** 番組未指定選択オプション（デフォルト用） */
export const ALL_PROGRAMS_OPTION: ProgramOption = {
  value: "all",
  label: "番組を指定せずにはじめる",
  station: "",
  genre: "",
};

/** 番組IDで番組情報を取得 */
export function getProgramById(id: string): ProgramInfo | undefined {
  return programs.find((p) => p.id === id);
}
