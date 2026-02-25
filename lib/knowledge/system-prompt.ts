/**
 * システムプロンプト生成の共通機能
 *
 * programs.ts と programs-simple.ts で重複していたロジックを共通化
 *
 * @created 2026-02-24
 */

import type { CompanyInfo, ProgramInfo } from "./types";

/**
 * 会社概要をプロンプト用テキストに変換
 */
export function companyToPromptText(company: CompanyInfo): string {
  const lines = ["# United Productions 会社概要", "", `## 基本情報`, `- 社名: ${company.name}`];

  if (company.nameEn) {
    lines.push(`- 社名（英語）: ${company.nameEn}`);
  }

  lines.push(
    `- 設立: ${company.founded}`,
    `- 所在地: ${company.location}`,
    `- 代表者: ${company.representative}`,
    `- 従業員数: ${company.employees}`,
    `- 資本金: ${company.capital}`,
  );

  if (company.revenue) {
    lines.push(`- 売上高: ${company.revenue}`);
  }

  lines.push(`- ミッション: ${company.mission}`);

  if (company.vision) {
    lines.push(`- ビジョン: ${company.vision}`);
  }

  if (company.philosophy) {
    lines.push(`- 企業理念: ${company.philosophy}`);
  }

  if (company.parentCompany) {
    lines.push(`- 親会社: ${company.parentCompany}`);
  }

  if (company.businessActivities && company.businessActivities.length > 0) {
    lines.push("", `## 事業内容`);
    for (const activity of company.businessActivities) {
      lines.push(`- ${activity}`);
    }
  }

  if (company.website) {
    lines.push("", `- 公式HP: ${company.website}`);
  }

  return lines.join("\n");
}

/**
 * 番組情報をプロンプト用テキストに変換（簡易版）
 */
export function programToPromptTextSimple(program: ProgramInfo): string {
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

/**
 * 番組情報をプロンプト用テキストに変換（詳細版）
 */
export function programToPromptTextDetailed(program: ProgramInfo): string {
  const lines = [
    `## ${program.name}`,
    "",
    `### 基本情報`,
    `- 放送局: ${program.station}`,
    `- 放送時間: ${program.schedule}`,
  ];

  if (program.timeSlot) {
    lines.push(`- 放送枠: ${program.timeSlot}`);
  }

  if (program.officialUrl) {
    lines.push(`- 公式HP: ${program.officialUrl}`);
  }

  lines.push("", `### 出演者`, `- MC/メイン: ${program.cast || "記載なし"}`);

  if (program.regularCast && program.regularCast.length > 0) {
    lines.push(`- レギュラー出演者:`);
    for (const cast of program.regularCast) {
      lines.push(`  - ${cast}`);
    }
  }

  if (program.narrator) {
    lines.push(`- ナレーター: ${program.narrator}`);
  }

  if (program.announcer) {
    lines.push(`- 進行アナウンサー: ${program.announcer}`);
  }

  if (program.staff && program.staff.length > 0) {
    lines.push("", `### スタッフ`);
    for (const staff of program.staff) {
      const affiliation = staff.affiliation ? `（${staff.affiliation}）` : "";
      lines.push(`- ${staff.role}: ${staff.name}${affiliation}`);
    }
  }

  lines.push("", `### 番組内容`, `- 概要: ${program.description}`);

  if (program.concept) {
    lines.push(`- コンセプト: ${program.concept}`);
  }

  if (program.targetAudience) {
    lines.push(`- ターゲット層: ${program.targetAudience}`);
  }

  if (program.format) {
    lines.push(`- 形式: ${program.format}`);
  }

  if (program.corners && program.corners.length > 0) {
    lines.push("", `### 主要コーナー`);
    for (const corner of program.corners) {
      const popularity = corner.popularity === "high" ? "【人気】" : "";
      lines.push(`- ${corner.name}${popularity}: ${corner.description}`);
    }
  }

  lines.push("", `### 放送歴`);

  if (program.startDateText) {
    lines.push(`- 開始: ${program.startDateText}`);
  }

  if (program.totalEpisodes) {
    lines.push(`- 累計放送回数: ${program.totalEpisodes}`);
  }

  if (program.broadcastHistory) {
    lines.push(`- 経緯: ${program.broadcastHistory}`);
  }

  if (program.ratings && program.ratings.length > 0) {
    lines.push("", `### 視聴率`);
    for (const rating of program.ratings) {
      const avg = rating.average ? `平均${rating.average}` : "";
      const highest = rating.highest ? `/最高${rating.highest}` : "";
      const note = rating.note ? `（${rating.note}）` : "";
      lines.push(`- ${rating.period}: ${avg}${highest}${note}`);
    }
  }

  if (program.awards && program.awards.length > 0) {
    lines.push("", `### 受賞歴`);
    for (const award of program.awards) {
      const note = award.note ? ` - ${award.note}` : "";
      lines.push(`- ${award.year}年: ${award.name}${note}`);
    }
  }

  if (program.achievements && program.achievements.length > 0) {
    lines.push("", `### 主な実績`);
    for (const achievement of program.achievements) {
      lines.push(`- ${achievement}`);
    }
  }

  if (program.social && program.social.length > 0) {
    lines.push("", `### SNS・配信`);
    for (const social of program.social) {
      const followers = social.followers ? `（${social.followers}）` : "";
      lines.push(`- ${social.platform}: ${social.url}${followers}`);
    }
  }

  if (program.sponsors && program.sponsors.length > 0) {
    lines.push("", `### 提供・スポンサー`);
    for (const sponsor of program.sponsors) {
      const slot = sponsor.slot ? ` - ${sponsor.slot}` : "";
      lines.push(`- ${sponsor.name}${slot}`);
    }
  }

  if (program.productionCooperation && program.productionCooperation.length > 0) {
    lines.push("", `### 制作`);
    for (const coop of program.productionCooperation) {
      lines.push(`- ${coop}`);
    }
  }

  if (program.notes) {
    lines.push("", `### 備考`, program.notes);
  }

  if (program.relatedPrograms && program.relatedPrograms.length > 0) {
    lines.push("", `### 関連番組`);
    for (const related of program.relatedPrograms) {
      lines.push(`- ${related}`);
    }
  }

  if (program.spinoffs && program.spinoffs.length > 0) {
    lines.push("", `### 派生コンテンツ`);
    for (const spinoff of program.spinoffs) {
      lines.push(`- ${spinoff}`);
    }
  }

  if (program.tags && program.tags.length > 0) {
    lines.push("", `### タグ`, program.tags.join("、"));
  }

  return lines.join("\n");
}

/**
 * システムプロンプトのフッターテキストを生成
 */
export function createSystemPromptFooter(): string {
  return [
    "---",
    "",
    "上記の詳細な番組情報を前提知識として保持してください。",
    "ユーザーの質問に応じて、番組情報を参照しつつ適切に回答してください。",
    "可能な限り具体的な情報（放送時間、出演者、コーナー名など）を含めて回答してください。",
  ].join("\n");
}

/**
 * 単一番組用のシステムプロンプトを生成
 */
export function createSingleProgramPromptBase(
  company: CompanyInfo,
  program: ProgramInfo | undefined,
  options: {
    detailed?: boolean;
    customFooter?: string;
  } = {},
): string {
  const { detailed = true, customFooter } = options;

  if (!program) {
    return createAllProgramsPromptBase(company, [], options);
  }

  const programText = detailed
    ? programToPromptTextDetailed(program)
    : programToPromptTextSimple(program);

  const footer = customFooter || createSystemPromptFooter();

  return [
    companyToPromptText(company),
    "",
    "# 選択中の番組情報（詳細）",
    "",
    programText,
    "",
    footer,
  ].join("\n");
}

/**
 * 全番組用のシステムプロンプトを生成
 */
export function createAllProgramsPromptBase(
  company: CompanyInfo,
  programs: ProgramInfo[],
  options: {
    detailed?: boolean;
    customFooter?: string;
  } = {},
): string {
  const { detailed = true, customFooter } = options;

  const programToText = detailed ? programToPromptTextDetailed : programToPromptTextSimple;
  const programTexts = programs.map(programToText);

  const footer = customFooter || createSystemPromptFooter();

  return [
    companyToPromptText(company),
    "",
    `# レギュラー番組一覧（${programs.length}本${detailed ? "・詳細" : ""}）`,
    "",
    ...programTexts,
    "",
    footer,
  ].join("\n");
}

/**
 * 複合システムプロンプトを生成（番組情報 + 機能固有の指示）
 */
export function createCompositeSystemPrompt(basePrompt: string, featurePrompt?: string): string {
  if (!featurePrompt) {
    return basePrompt;
  }

  return `${basePrompt}

---

## 機能固有の指示

${featurePrompt}`;
}
