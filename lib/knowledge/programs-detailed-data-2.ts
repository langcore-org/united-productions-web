/**
 * United Productions レギュラー番組データ（詳細版・データ部分その2）
 */

import type { ProgramInfo } from "./types";

// 林修の今、知りたいでしょ！
export const programHayashiosamu: ProgramInfo = {
  id: "hayashiosamu",
  name: "林修の今、知りたいでしょ！",
  station: "テレビ朝日",
  schedule: "毎週木曜 19:00〜20:00",
  scheduleDetail: [{ day: "木曜", startTime: "19:00", endTime: "20:00", note: "レギュラー" }],
  timeSlot: "木曜プライム",
  officialUrl: "https://www.tv-asahi.co.jp/imadesho/",
  cast: "林修",
  regularCast: ["林修（生徒役）", "斎藤ちはる（テレビ朝日アナウンサー、副担任役）"],
  narrator: "不明",
  announcer: "斎藤ちはる",
  staff: [
    { role: "総合演出", name: "不明", affiliation: "テレビ朝日" },
    { role: "プロデューサー", name: "不明", affiliation: "テレビ朝日" },
  ],
  description:
    "普段は教える立場の林修先生が生徒に変身。各分野の講師が林修に知らない世界をレクチャーする教養バラエティ",
  concept: "「今でしょ！」の林修が学ぶ側に回る",
  targetAudience: "20代〜50代、教養番組好き",
  corners: [
    { name: "今知りたい講座", description: "専門家が林修にレクチャー", popularity: "high" },
    { name: "林修の疑問", description: "林修が素朴な疑問をぶつける", popularity: "medium" },
    { name: "テスト", description: "学んだ内容の確認テスト", popularity: "medium" },
  ],
  format: "学校の教室セットで講義形式",
  startDate: "2021-04",
  startDateText: "2021年4月",
  regularStartDate: "2021年4月",
  totalEpisodes: "200回以上",
  broadcastHistory: "2021年4月開始→現在も継続中",
  ratings: [{ period: "2024年", average: "5-7%", note: "テレビ朝日木曜で好調" }],
  awards: [],
  achievements: [
    "テレビ朝日が選ぶ「青少年に見てもらいたい番組」",
    "林修の名言「今でしょ！」が番組名に",
  ],
  social: [
    { platform: "TVer", url: "見逃し配信", followers: "" },
    { platform: "ABEMA", url: "配信", followers: "" },
  ],
  sponsors: [{ name: "複数社提供", slot: "60秒提供" }],
  productionCooperation: ["テレビ朝日", "UNITED PRODUCTIONS"],
  notes:
    "テレビ朝日が選ぶ「青少年に見てもらいたい番組」。林修の名言「今でしょ！」が番組名に採用されている。",
  relatedPrograms: ["林修の今でしょ!講座", "林修のレッスン"],
  spinoffs: ["『林修の今、知りたいでしょ！』書籍"],
  pastSpecials: ["2時間SP（不定期）"],
  tags: ["教養バラエティ", "林修", "教育", "テレビ朝日"],
  genre: "教養バラエティ",
  category: "教養・エンターテイメント",
};

// THE神業チャレンジ
export const programKamichallenge: ProgramInfo = {
  id: "kamichallenge",
  name: "THE神業チャレンジ",
  station: "TBS系列",
  schedule: "毎週火曜 19:00〜20:00（基本1時間、SP時は拡大）",
  scheduleDetail: [
    { day: "火曜", startTime: "19:00", endTime: "20:00", note: "通常放送" },
    { day: "火曜", startTime: "18:30", endTime: "21:00", note: "2時間30分SP時" },
  ],
  timeSlot: "火曜プライム",
  officialUrl: "https://www.tbs.co.jp/kamiwazachallenge_tbs/",
  cast: "チョコレートプラネット（長田庄平・松尾駿）",
  regularCast: [
    "長田庄平（チョコレートプラネット）",
    "松尾駿（チョコレートプラネット）",
    "ゲスト挑戦者（毎回異なる芸能人）",
  ],
  narrator: "不明",
  staff: [
    { role: "総合演出", name: "林博史", affiliation: "UNITED PRODUCTIONS" },
    { role: "プロデューサー", name: "大橋豪", affiliation: "UNITED PRODUCTIONS" },
    { role: "プロデューサー", name: "高木大輔", affiliation: "UNITED PRODUCTIONS" },
  ],
  chiefDirector: "林博史（UNITED PRODUCTIONS所属）",
  producers: ["大橋豪（UNITED PRODUCTIONS）", "高木大輔（UNITED PRODUCTIONS）"],
  description:
    "神業クレーンゲーム、画面隠し太鼓の達人など、達人の技をクリアするゲームバラエティ。芸能人が本気で挑戦する",
  concept: "「神業」をクリアすることを目指す",
  targetAudience: "ファミリー層、ゲーム好き",
  corners: [
    { name: "神業クレーンゲーム", description: "達人のクレーンゲーム技を再現", popularity: "high" },
    {
      name: "画面隠し太鼓の達人",
      description: "画面を隠して太鼓の達人をプレイ",
      popularity: "high",
    },
    { name: "神業チャレンジ", description: "様々なジャンルの達人技に挑戦", popularity: "high" },
  ],
  format: "スタジオでのゲーム対決（MC+ゲスト挑戦者）",
  startDate: "2023-04-11",
  startDateText: "2023年4月11日",
  regularStartDate: "2023年4月11日",
  totalEpisodes: "100回以上",
  broadcastHistory: "2023年4月開始→現在も継続中",
  ratings: [
    { period: "2024年", average: "5-7%", note: "TBS火曜で好調" },
    { period: "2025年", average: "6-8%", note: "SP時は10%前後" },
  ],
  awards: [],
  achievements: [
    "達人の技を芸能人が挑戦する形式が好評",
    "スペシャル版も定期的に放送",
    "SixTONES・髙地優吾、高橋恭平、木村柾哉、中島颯太など人気アイドルが出演",
  ],
  social: [
    { platform: "TVer", url: "見逃し配信", followers: "" },
    { platform: "Paravi", url: "配信", followers: "" },
  ],
  sponsors: [{ name: "複数社提供", slot: "60秒提供" }],
  productionCooperation: ["TBS", "UNITED PRODUCTIONS"],
  notes:
    "達人の技を芸能人が挑戦する形式。スペシャル版も定期的に放送。林博史が総合演出、UNITED PRODUCTIONSのプロデューサーが担当。",
  relatedPrograms: ["神業チャレンジ（過去の特番）"],
  spinoffs: [],
  pastSpecials: [
    "THE神業チャレンジSP（2025年12月16日、2時間30分）",
    "THE神業チャレンジSP（2025年7月22日）",
    "THE神業チャレンジSP（2025年11月25日）",
  ],
  tags: ["ゲームバラエティ", "達人", "チャレンジ", "TBS"],
  genre: "ゲームバラエティ",
  category: "エンターテイメント",
};

// ニカゲーム
export const programNikagame: ProgramInfo = {
  id: "nikagame",
  name: "ニカゲーム",
  station: "テレビ朝日",
  schedule: "毎週水曜 25:58〜26:17（深夜）",
  scheduleDetail: [
    { day: "水曜", startTime: "25:58", endTime: "26:17", note: "レギュラー（19分）" },
  ],
  timeSlot: "水曜深夜",
  officialUrl: "",
  cast: "二階堂高嗣、松井ケムリ、猪俣周杜",
  regularCast: ["二階堂高嗣（Kis-My-Ft2）", "松井ケムリ（令和ロマン）", "猪俣周杜（timelesz）"],
  narrator: "不明",
  staff: [
    { role: "総合演出", name: "不明", affiliation: "テレビ朝日" },
    { role: "プロデューサー", name: "不明", affiliation: "テレビ朝日" },
  ],
  description:
    "「二階堂＋カム（Come）＝ニカゲーム」。ちょっと奇妙な教育番組の世界で、ひらめきゲームに挑戦する新感覚バラエティ",
  concept: "「教育番組」×「ゲームバラエティ」",
  targetAudience: "10代〜20代、若年層",
  corners: [
    { name: "ひらめきゲーム", description: "英語やセンスが鍵になるゲーム", popularity: "high" },
    { name: "教育コーナー", description: "学びをテーマにした企画", popularity: "medium" },
  ],
  format: "スタジオでのゲーム対決（3人のMC）",
  startDate: "2025-10-01",
  startDateText: "2025年10月1日（レギュラー化）",
  regularStartDate: "2025年10月1日",
  totalEpisodes: "20回以上（2026年2月時点）",
  broadcastHistory:
    "2025年4月『バラバラマンスリー』→6月全国放送特番→8月リアルイベント→10月レギュラー化",
  ratings: [{ period: "2025年", average: "1-2%", note: "深夜帯" }],
  awards: [],
  achievements: [
    "2025年4月『バラバラマンスリー』から始まった企画",
    "6月全国放送特番、8月リアルイベントを経てレギュラー化",
    "異なるジャンルの3人のMCの化学反応が話題",
  ],
  social: [
    { platform: "TVer", url: "見逃し配信", followers: "" },
    { platform: "ABEMA", url: "配信", followers: "" },
  ],
  sponsors: [{ name: "複数社提供", slot: "30秒提供" }],
  productionCooperation: ["テレビ朝日", "UNITED PRODUCTIONS"],
  notes:
    "2025年4月『バラバラマンスリー』→6月全国放送特番→8月リアルイベントを経てレギュラー化。異なるジャンルの3人のMC（アイドル・お笑い・アイドル）の組み合わせが新鮮。",
  relatedPrograms: ["バラバラマンスリー"],
  spinoffs: [],
  pastSpecials: ["全国放送特番（2025年6月）"],
  tags: ["ゲームバラエティ", "深夜", "若手MC", "テレビ朝日"],
  genre: "ゲームバラエティ",
  category: "エンターテイメント",
};

// 櫻井・有吉THE夜会
export const programYakai: ProgramInfo = {
  id: "yakai",
  name: "櫻井・有吉THE夜会",
  station: "TBS",
  schedule: "毎週木曜 22:00〜22:57",
  scheduleDetail: [{ day: "木曜", startTime: "22:00", endTime: "22:57", note: "レギュラー" }],
  timeSlot: "木曜プライム",
  officialUrl: "https://www.tbs.co.jp/yakai_tbs/",
  cast: "櫻井翔、有吉弘行",
  regularCast: ["櫻井翔（元嵐、MC）", "有吉弘行（MC）"],
  narrator: "不明",
  staff: [
    { role: "総合演出", name: "不明", affiliation: "TBS" },
    { role: "プロデューサー", name: "不明", affiliation: "TBS" },
  ],
  description:
    "櫻井翔と有吉弘行がゲストを招いてトークを展開。プライベートな話題や、ゲストの意外な一面を掘り下げる深夜トークバラエティ",
  concept: "「夜の会」で本音トーク",
  targetAudience: "20代〜40代、女性層中心",
  corners: [
    { name: "夜会トーク", description: "ゲストとの自由なトーク", popularity: "high" },
    { name: "プライベート探訪", description: "ゲストの私生活に迫る", popularity: "high" },
    { name: "有吉のツッコミ", description: "有吉がゲストに突っ込む", popularity: "medium" },
  ],
  format: "バー/ラウンジ風セットでのトーク（MC2人+ゲスト）",
  startDate: "2021-04",
  startDateText: "2021年4月",
  regularStartDate: "2021年4月",
  totalEpisodes: "200回以上",
  broadcastHistory: "2021年4月開始→現在も継続中",
  ratings: [{ period: "2024年", average: "6-8%", note: "TBS木曜22時で好調" }],
  awards: [],
  achievements: ["元嵐の櫻井翔と有吉弘行のコンビネーションが人気", "女性視聴者層が厚い"],
  social: [
    { platform: "TVer", url: "見逃し配信", followers: "" },
    { platform: "Paravi", url: "配信", followers: "" },
  ],
  sponsors: [{ name: "複数社提供", slot: "60秒提供" }],
  productionCooperation: ["TBS", "UNITED PRODUCTIONS"],
  notes: "元嵐の櫻井翔と有吉弘行のコンビネーションが人気。女性視聴者層が厚い。",
  relatedPrograms: ["嵐にしやがれ（過去）", "有吉弘行のダレトク!?"],
  spinoffs: [],
  pastSpecials: ["拡大SP（不定期）"],
  tags: ["トークバラエティ", "櫻井翔", "有吉弘行", "TBS"],
  genre: "トークバラエティ",
  category: "エンターテイメント",
};

// 何を隠そう…ソレが！
export const programSorega: ProgramInfo = {
  id: "sorega",
  name: "何を隠そう…ソレが！",
  station: "テレビ東京",
  schedule: "不定期（スペシャル中心）",
  scheduleDetail: [{ day: "不定期", startTime: "", endTime: "", note: "スペシャル中心" }],
  timeSlot: "不定期",
  officialUrl: "",
  cast: "",
  regularCast: ["ナレーター進行（MCは固定しない）"],
  narrator: "不明",
  staff: [
    { role: "総合演出", name: "林博史", affiliation: "UNITED PRODUCTIONS" },
    { role: "プロデューサー", name: "不明", affiliation: "テレビ東京" },
  ],
  chiefDirector: "林博史（UNITED PRODUCTIONS所属）",
  description:
    "隠れた名店や知られざるスポットを探索するドキュメントバラエティ。マニアックな情報を掘り下げる",
  concept: "「隠れた名品」「知られざる名店」を発掘",
  targetAudience: "20代〜50代、グルメ・ショッピング好き",
  corners: [
    { name: "ソレが紹介", description: "隠れた名店や商品を紹介", popularity: "high" },
    { name: "マニア探訪", description: "マニアックなお店を訪問", popularity: "medium" },
  ],
  format: "VTRドキュメント形式",
  startDate: "2023",
  startDateText: "2023年頃（スペシャル開始）",
  regularStartDate: "",
  totalEpisodes: "不定期",
  broadcastHistory: "スペシャル番組として不定期放送→レギュラー化（時期不明）",
  ratings: [{ period: "2024年", average: "2-3%", note: "深夜帯" }],
  awards: [],
  achievements: ["レギュラー放送に加え、スペシャル版も多数制作"],
  social: [{ platform: "TVer", url: "見逃し配信", followers: "" }],
  sponsors: [{ name: "複数社提供", slot: "30秒提供" }],
  productionCooperation: ["テレビ東京", "UNITED PRODUCTIONS"],
  notes:
    "レギュラー放送に加え、スペシャル版も多数制作。林博史が総合演出。隠れた名店や知られざるスポットを探索する。",
  relatedPrograms: ["熱狂マニアさん！", "マツコの知らない世界"],
  spinoffs: [],
  pastSpecials: ["スペシャル版（2023年9月2日、12月28日、2024年3月13日）"],
  tags: ["ドキュメントバラエティ", "グルメ", "ショッピング", "テレビ東京"],
  genre: "ドキュメントバラエティ",
  category: "情報・エンターテイメント",
};

// トークサバイバー
export const programTalksurvivor: ProgramInfo = {
  id: "talksurvivor",
  name: "トークサバイバー",
  station: "Netflix（配信番組）",
  schedule: "配信（オンデマンド）",
  scheduleDetail: [{ day: "配信", startTime: "", endTime: "", note: "全エピソード一挙配信" }],
  timeSlot: "配信",
  officialUrl: "https://www.netflix.com/",
  cast: "",
  regularCast: ["MC（番組により異なる）", "ゲスト（芸能人）"],
  narrator: "不明",
  staff: [
    { role: "総合演出", name: "不明", affiliation: "UNITED PRODUCTIONS" },
    { role: "プロデューサー", name: "不明", affiliation: "UNITED PRODUCTIONS" },
  ],
  description:
    "トークバラエティ。Netflixオリジナル番組として配信されるUNITED PRODUCTIONS制作のコンテンツ",
  concept: "「トーク」で生き残るサバイバル",
  targetAudience: "10代〜40代、Netflixユーザー",
  corners: [
    { name: "トーク対決", description: "トーク力で勝負", popularity: "high" },
    { name: "サバイバル", description: "脱落者が出る形式", popularity: "medium" },
  ],
  format: "Netflixオリジナル（配信専用）",
  startDate: "2023",
  startDateText: "2023年頃",
  regularStartDate: "",
  totalEpisodes: "シーズン制",
  broadcastHistory: "Netflixオリジナルとして配信開始",
  ratings: [{ period: "配信", average: "", note: "Netflix内ランキング上位" }],
  awards: [],
  achievements: [
    "UNITED PRODUCTIONSが手がける配信プラットフォーム向けコンテンツの代表例",
    "Netflixオリジナルとして海外展開も",
  ],
  social: [{ platform: "Netflix", url: "配信", followers: "" }],
  sponsors: [{ name: "Netflix", slot: "配信プラットフォーム" }],
  productionCooperation: ["UNITED PRODUCTIONS", "Netflix"],
  notes:
    "UNITED PRODUCTIONSが手がける配信プラットフォーム向けコンテンツの代表例。Netflixオリジナルとして配信。",
  relatedPrograms: ["Netflixオリジナル日本番組"],
  spinoffs: [],
  pastSpecials: [],
  tags: ["トークバラエティ", "Netflix", "配信", "サバイバル"],
  genre: "トークバラエティ",
  category: "エンターテイメント",
};
