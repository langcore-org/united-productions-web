/**
 * United Productions レギュラー番組データ（詳細版）
 *
 * 網羅的な番組情報をTypeScriptとして管理
 */

import {
  companyInfoDetailed,
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
  programKamichallenge,
  programNikagame,
  programSorega,
  programTalksurvivor,
  programYakai,
} from "./programs-detailed-data-2";
import {
  companyToPromptText,
  createAllProgramsPromptBase,
  createCompositeSystemPrompt as createCompositePrompt,
  createSingleProgramPromptBase,
  programToPromptTextDetailed,
} from "./system-prompt";
import type { CompanyInfo, KnowledgeBase, ProgramInfo, ProgramOption } from "./types";

// 会社概要（詳細版）
export const companyInfo: CompanyInfo = companyInfoDetailed;

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
  programYakai,
  programSorega,
  programTalksurvivor,
];

/** ナレッジベース全体 */
export const knowledgeBase: KnowledgeBase = {
  company: companyInfo,
  programs: programs,
  updatedAt: "2026-02-24",
  updatedBy: "AI Assistant",
};

/** セレクトボックス用オプション一覧 */
export const programOptions: ProgramOption[] = programs.map((p) => ({
  value: p.id,
  label: p.name,
  station: p.station,
  genre: p.genre,
}));

/** 全番組選択オプション（デフォルト用） */
export const ALL_PROGRAMS_OPTION: ProgramOption = {
  value: "all",
  label: "全番組",
  station: "",
  genre: "",
};

/** 番組IDで番組情報を取得 */
export function getProgramById(id: string): ProgramInfo | undefined {
  return programs.find((p) => p.id === id);
}

/** 番組情報をプロンプト用テキストに変換（詳細版） */
export function programToPromptText(program: ProgramInfo): string {
  return programToPromptTextDetailed(program);
}

/** 会社概要をプロンプト用テキストに変換（詳細版） */
export function companyToPromptTextFn(company: CompanyInfo): string {
  return companyToPromptText(company);
}

/** システムプロンプトを生成（単一番組・詳細版） */
export function createSingleProgramPrompt(programId: string): string {
  const program = getProgramById(programId);
  return createSingleProgramPromptBase(companyInfo, program, { detailed: true });
}

/** システムプロンプトを生成（全番組・詳細版） */
export function createAllProgramsPrompt(): string {
  return createAllProgramsPromptBase(companyInfo, programs, { detailed: true });
}

/** システムプロンプトを生成（番組ID指定、allで全番組） */
export function createSystemPrompt(programId: string = "all"): string {
  if (programId === "all") {
    return createAllProgramsPrompt();
  }
  return createSingleProgramPrompt(programId);
}

/** 複合システムプロンプトを生成（番組情報 + 機能固有の指示） */
export function createCompositeSystemPrompt(
  programId: string = "all",
  featurePrompt?: string,
): string {
  const basePrompt = createSystemPrompt(programId);
  return createCompositePrompt(basePrompt, featurePrompt);
}
