/**
 * United Productions レギュラー番組データ
 *
 * マークダウンからパースせず、直接TypeScriptとして管理
 * 型安全性とIDEサポートを優先
 */

import type { CompanyInfo, KnowledgeBase, ProgramInfo, ProgramOption } from "./types";

export const companyInfo: CompanyInfo = {
  name: "株式会社UNITED PRODUCTIONS（ユナイテッドプロダクションズ）",
  founded: "2016年10月3日（源流：2008年創業のフーリンラージ）",
  location: "東京都渋谷区東3-16-3",
  representative: "代表取締役社長 森田篤",
  employees: "420名（2025年4月1日現在）",
  capital: "1,000万円",
  mission: "日本一のコンテンツサプライヤーになる",
};

export const programs: ProgramInfo[] = [
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
    station: "テレビ朝日系列",
    schedule: "毎週月曜 23:15〜（レギュラー）",
    cast: "ギャル曽根",
    description: "有名人が自身の失敗談を「授業」として披露するバラエティ。視聴者が教訓を学ぶ形式",
    notes: "「しくじり」という言葉を定着させた人気番組。ABEMAで毎月1〜3週金曜21:30〜配信",
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
    schedule: "毎週水曜 24:15〜",
    cast: "かまいたち（山内健司・濱家隆一）",
    description: "かまいたちが「ガチ」で様々なことに挑戦。演技・ロケ・ゲームなど多岐にわたる",
    notes: "かまいたちの関東初冠レギュラー番組",
  },
  {
    id: "onirenchan",
    name: "千鳥の鬼レンチャン",
    station: "フジテレビ系列",
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
    station: "TBS系列",
    schedule: "毎週土曜 19:00〜（基本1時間、SP時は2〜3時間）",
    cast: "",
    description: "様々なジャンルの熱狂的なマニアを発掘。行き過ぎた愛を語る",
    startDate: "2023年4月15日から現タイトル・時間帯に変更",
    notes:
      "旧タイトル：「〜通販マニアさん」。ニトリマニア、家事マニアなど身近なジャンルのマニアが登場",
  },
  {
    id: "hayashiosamu",
    name: "林修の今、知りたいでしょ！",
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
    station: "TBS系列",
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
    id: "yakai",
    name: "櫻井・有吉THE夜会",
    station: "TBS",
    schedule: "毎週木曜 22:00〜",
    cast: "櫻井翔、有吉弘行",
    description:
      "櫻井翔と有吉弘行がゲストを招いてトークを展開。プライベートな話題や、ゲストの意外な一面を掘り下げる",
    notes: "元嵐の櫻井翔と有吉弘行のコンビネーションが人気",
  },
  {
    id: "sorega",
    name: "何を隠そう…ソレが！",
    station: "テレビ東京",
    schedule: "不定期（スペシャル中心）",
    cast: "総合演出：林博史（UNITED PRODUCTIONS所属）",
    description: "隠れた名店や知られざるスポットを探索するバラエティ",
    notes: "レギュラー放送に加え、スペシャル版も多数制作",
  },
  {
    id: "talksurvivor",
    name: "トークサバイバー",
    station: "Netflix（配信番組）",
    schedule: "配信",
    cast: "",
    description: "トークバラエティ。Netflixオリジナル番組として配信",
    notes: "UNITED PRODUCTIONSが手がける配信プラットフォーム向けコンテンツの代表例",
  },
];

/** ナレッジベース全体 */
export const knowledgeBase: KnowledgeBase = {
  company: companyInfo,
  programs: programs,
  updatedAt: "2026-02-24",
};

/** セレクトボックス用オプション一覧 */
export const programOptions: ProgramOption[] = programs.map((p) => ({
  value: p.id,
  label: p.name,
  station: p.station,
}));

/** 全番組選択オプション（デフォルト用） */
export const ALL_PROGRAMS_OPTION: ProgramOption = {
  value: "all",
  label: "全番組",
  station: "",
};

/** 番組IDで番組情報を取得 */
export function getProgramById(id: string): ProgramInfo | undefined {
  return programs.find((p) => p.id === id);
}

/** 番組情報をプロンプト用テキストに変換 */
export function programToPromptText(program: ProgramInfo): string {
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

/** 会社概要をプロンプト用テキストに変換 */
export function companyToPromptText(company: CompanyInfo): string {
  return [
    "# United Productions 会社概要",
    "",
    `- 社名: ${company.name}`,
    `- 設立: ${company.founded}`,
    `- 所在地: ${company.location}`,
    `- 代表者: ${company.representative}`,
    `- 従業員数: ${company.employees}`,
    `- 資本金: ${company.capital}`,
    `- ミッション: ${company.mission}`,
  ].join("\n");
}

/** システムプロンプトを生成（単一番組） */
export function createSingleProgramPrompt(programId: string): string {
  const program = getProgramById(programId);
  if (!program) {
    return createAllProgramsPrompt();
  }

  return [
    companyToPromptText(companyInfo),
    "",
    "# 選択中の番組情報",
    "",
    programToPromptText(program),
    "",
    "---",
    "",
    "上記の番組情報を基に、ユーザーの質問に答えてください。",
    "番組に関する情報以外は「番組情報に含まれていません」と伝えてください。",
  ].join("\n");
}

/** システムプロンプトを生成（全番組） */
export function createAllProgramsPrompt(): string {
  const programTexts = programs.map(programToPromptText);

  return [
    companyToPromptText(companyInfo),
    "",
    "# レギュラー番組一覧（13本）",
    "",
    ...programTexts,
    "",
    "---",
    "",
    "上記の番組情報を基に、ユーザーの質問に答えてください。",
    "番組に関する情報以外は「番組情報に含まれていません」と伝えてください。",
  ].join("\n");
}

/** システムプロンプトを生成（番組ID指定、allで全番組） */
export function createSystemPrompt(programId: string = "all"): string {
  if (programId === "all") {
    return createAllProgramsPrompt();
  }
  return createSingleProgramPrompt(programId);
}
