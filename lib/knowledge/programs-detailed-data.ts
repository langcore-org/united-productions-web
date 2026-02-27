/**
 * United Productions レギュラー番組データ（詳細版・データ部分）
 */

import type { ProgramInfo } from "./types";

// マツコの知らない世界
export const programMatsuko: ProgramInfo = {
  id: "matsuko",
  name: "マツコの知らない世界",
  station: "TBS",
  schedule: "毎週火曜 20:55〜22:00",
  scheduleDetail: [{ day: "火曜", startTime: "20:55", endTime: "22:00", note: "通常放送" }],
  timeSlot: "火曜ゴールデン",
  officialUrl: "https://www.tbs.co.jp/matsuko-sekai/",
  cast: "マツコ・デラックス",
  regularCast: ["マツコ・デラックス（MC）"],
  narrator: "不明（番組により異なる）",
  staff: [
    { role: "総合演出", name: "不明", affiliation: "TBS" },
    { role: "プロデューサー", name: "不明", affiliation: "TBS" },
  ],
  description:
    "ゲスト自ら得意ジャンルやハマっているものを企画として持ち込み、マツコ・デラックスとサシトークで繰り広げるバラエティ番組",
  concept: "「マニアックな世界」をマツコが体験・学ぶ",
  targetAudience: "20代〜50代、バラエティ好き、マニアックな趣味を持つ層",
  corners: [
    {
      name: "マツコの知らない世界",
      description: "ゲストがマツコに自慢の趣味や知識をプレゼン",
      popularity: "high",
    },
    {
      name: "マツコ、初体験",
      description: "実際に現場に出向き体験するロケコーナー",
      popularity: "high",
    },
    { name: "マツコの疑問", description: "視聴者からの質問にマツコが答える", popularity: "medium" },
  ],
  format: "スタジオ収録（マツコとゲストの2ショット）+ ロケVTR",
  startDate: "2011-10-11",
  startDateText: "2011年10月11日（火曜深夜枠で開始）",
  regularStartDate: "2012年4月（ゴールデン昇格）",
  totalEpisodes: "600回以上（2025年時点）",
  broadcastHistory: "2011年深夜枠開始→2012年ゴールデン昇格→現在も継続中",
  ratings: [
    { period: "2024年", average: "8-10%", highest: "12%（SP時）", note: "TBS火曜トップクラス" },
  ],
  awards: [
    { year: "2013", name: "ギャラクシー賞", note: "テレビ部門優秀賞" },
    { year: "2014", name: "日本民間放送連盟賞", note: "優秀賞" },
  ],
  achievements: [
    "TBS火曜ゴールデンの看板番組",
    "マツコ・デラックスの冠番組として最長寿",
    "「マツコの知らない世界」書籍化シリーズ累計100万部突破",
    "「マニア」ブームの先駆け",
  ],
  social: [
    { platform: "X(Twitter)", url: "@tbsmatsukosekai", followers: "50万人以上" },
    { platform: "TVer", url: "TBS無料見逃し配信", followers: "" },
  ],
  twitter: "@tbsmatsukosekai",
  sponsors: [{ name: "複数社提供", slot: "60秒提供" }],
  productionCooperation: ["TBSテレビ", "UNITED PRODUCTIONS"],
  notes:
    "TBSの看板バラエティ番組。様々なジャンルのマニアが登場し、マツコにプレゼンする形式。マツコの鋭いツッコミと独特な感性が人気。",
  relatedPrograms: ["マツコ会議", "マツコと有吉の怒り新党（過去）"],
  spinoffs: [
    "『マツコの知らない世界』書籍シリーズ（幻冬舎）",
    "『マツコの知らない世界』DVD",
    "関連グッズ（マツコフィギュア等）",
  ],
  pastSpecials: ["新春SP（毎年1月）", "秋の鉄道旅行SP", "夏のグルメSP"],
  tags: ["バラエティ", "マニア", "トーク", "ゴールデン", "長寿番組"],
  genre: "バラエティ",
  category: "情報・エンターテイメント",
};

// しくじり先生
export const programShikujiri: ProgramInfo = {
  id: "shikujiri",
  name: "しくじり先生 俺みたいになるな!!",
  station: "テレビ朝日系列",
  schedule: "毎週月曜 23:15〜24:15（レギュラー）",
  scheduleDetail: [{ day: "月曜", startTime: "23:15", endTime: "24:15", note: "レギュラー放送" }],
  timeSlot: "月曜深夜",
  officialUrl: "https://www.tv-asahi.co.jp/shikujiri/",
  cast: "ギャル曽根",
  regularCast: ["ギャル曽根（MC/先生役）", "副担任（アシスタント、番組により異なる）"],
  narrator: "松元真一郎",
  staff: [
    { role: "総合演出", name: "不明", affiliation: "テレビ朝日" },
    { role: "プロデューサー", name: "不明", affiliation: "テレビ朝日" },
  ],
  description:
    "有名人が自身の失敗談・後悔を「授業」として披露し、視聴者に教訓を伝えるバラエティ番組",
  concept: "「失敗から学ぶ」人生の授業",
  targetAudience: "10代〜30代、若年層",
  corners: [
    {
      name: "しくじり授業",
      description: "ゲストが自分の失敗談を授業形式で披露",
      popularity: "high",
    },
    { name: "黒板コメント", description: "生徒役の芸人がツッコミを入れる", popularity: "medium" },
    { name: "テスト", description: "視聴者参加型のクイズコーナー", popularity: "medium" },
  ],
  format: "学校の教室を模したセットで授業形式",
  startDate: "2014-04",
  startDateText: "2014年4月",
  regularStartDate: "2014年4月",
  totalEpisodes: "400回以上",
  broadcastHistory: "2014年開始→現在も継続中",
  ratings: [{ period: "2024年", average: "3-5%", note: "深夜帯で好調" }],
  awards: [{ year: "2015", name: "流行語大賞", note: "「しくじり」ノミネート" }],
  achievements: [
    "「しくじり」という言葉を定着させた",
    "書籍化シリーズ累計50万部",
    "深夜帯の看板番組",
  ],
  social: [
    { platform: "ABEMA", url: "毎月1〜3週金曜21:30〜配信", followers: "" },
    { platform: "TVer", url: "見逃し配信", followers: "" },
  ],
  sponsors: [{ name: "複数社提供", slot: "30秒提供" }],
  productionCooperation: ["テレビ朝日", "UNITED PRODUCTIONS"],
  notes:
    "「しくじり」という言葉を定着させた人気番組。ABEMAでも毎月1〜3週金曜21:30〜配信。失敗談を笑いに変えるポジティブな番組。",
  relatedPrograms: ["失敗学", "失敗の本質"],
  spinoffs: ["『しくじり先生』書籍シリーズ", "『しくじり先生』DVD"],
  pastSpecials: ["年末SP", "新春SP"],
  tags: ["バラエティ", "失敗談", "教訓", "深夜", "授業形式"],
  genre: "バラエティ",
  category: "エンターテイメント",
};

// 有吉のお金発見 突撃！カネオくん
export const programKaneo: ProgramInfo = {
  id: "kaneo",
  name: "有吉のお金発見 突撃！カネオくん",
  station: "NHK総合テレビ",
  schedule: "毎週土曜 20:15〜20:53（生放送）",
  scheduleDetail: [
    { day: "土曜", startTime: "20:15", endTime: "20:53", note: "生放送" },
    { day: "土曜", startTime: "10:05", endTime: "10:38", note: "再放送（Eテレ）" },
  ],
  timeSlot: "土曜プライム",
  officialUrl: "https://www.nhk.or.jp/kaneo/",
  cast: "有吉弘行、カネオくん（千鳥・ノブのキャラクター）",
  regularCast: [
    "有吉弘行（MC）",
    "カネオくん（人形キャラクター、ノブが声を担当）",
    "田牧そら（リポーター）",
  ],
  narrator: "不明",
  announcer: "NHKアナウンサー（番組により異なる）",
  staff: [
    { role: "総合演出", name: "林博史", affiliation: "UNITED PRODUCTIONS" },
    { role: "プロデューサー", name: "大橋豪", affiliation: "UNITED PRODUCTIONS" },
    { role: "プロデューサー", name: "高木大輔", affiliation: "UNITED PRODUCTIONS" },
  ],
  chiefDirector: "林博史（UNITED PRODUCTIONS所属）",
  producers: ["大橋豪（UNITED PRODUCTIONS）", "高木大輔（UNITED PRODUCTIONS）"],
  description:
    "身近なものの「お金の秘密」を徹底調査。商品の値段の仕組みや裏側を、有吉弘行とカネオくんが楽しく解説する経済バラエティ",
  concept: "「お金の流れ」を可視化し、経済を身近に感じる",
  targetAudience: "ファミリー層、経済に興味がある層",
  corners: [
    { name: "突撃！カネオくん", description: "カネオくんが現場に突撃取材", popularity: "high" },
    { name: "お金の教室", description: "専門家が経済の仕組みを解説", popularity: "medium" },
    { name: "家計簿チェック", description: "一般家庭の家計を分析", popularity: "medium" },
  ],
  format: "スタジオ（有吉+カネオくん）+ ロケVTR（カネオくんの突撃）",
  startDate: "2019-04",
  startDateText: "2019年4月",
  regularStartDate: "2019年4月",
  totalEpisodes: "300回以上",
  broadcastHistory: "2019年4月開始→現在も継続中",
  ratings: [{ period: "2024年", average: "6-8%", note: "NHK土曜プライムで好調" }],
  awards: [{ year: "2020", name: "ギャラクシー賞", note: "優秀賞" }],
  achievements: [
    "NHKで珍しいバラエティ色の強い番組",
    "カネオくん人形が大人気（グッズ化）",
    "経済番組として若年層にも人気",
  ],
  social: [
    { platform: "NHKプラス", url: "見逃し配信", followers: "" },
    { platform: "NHKワールド", url: "英語字幕配信", followers: "" },
  ],
  sponsors: [{ name: "NHK受信料", slot: "公共放送" }],
  productionCooperation: ["NHK", "UNITED PRODUCTIONS"],
  notes:
    "NHKで珍しいバラエティ色の強い番組。カネオくん人形が人気で、グッズも販売されている。UNITED PRODUCTIONSの林博史が総合演出を務める。",
  relatedPrograms: ["有吉弘行のダレトク!?", "有吉の壁"],
  spinoffs: ["カネオくんぬいぐるみ", "『カネオくんのお金の教室』書籍"],
  pastSpecials: ["年末年始SP", "春の新生活SP", "お盆SP"],
  tags: ["バラエティ", "経済", "教育", "NHK", "ファミリー"],
  genre: "経済バラエティ",
  category: "教養・エンターテイメント",
};

// あちこちオードリー
export const programAchikochi: ProgramInfo = {
  id: "achikochi",
  name: "あちこちオードリー",
  station: "テレビ東京",
  schedule: "毎週水曜 23:06〜23:55",
  scheduleDetail: [{ day: "水曜", startTime: "23:06", endTime: "23:55", note: "レギュラー" }],
  timeSlot: "水曜深夜",
  officialUrl: "https://www.tv-tokyo.co.jp/achikochi_audrey/",
  cast: "オードリー（若林正恭・春日俊彰）",
  regularCast: ["若林正恭（常連客役）", "春日俊彰（大将役）"],
  narrator: "不明",
  staff: [
    { role: "総合演出", name: "不明", affiliation: "テレビ東京" },
    { role: "プロデューサー", name: "不明", affiliation: "テレビ東京" },
  ],
  description:
    "飲食店を模したスタジオで、オードリーがゲストとトークを展開。大将（春日）と常連（若林）という設定で繰り広げられる深夜トークバラエティ",
  concept: "「気軽な飲み屋」のような空間で本音トーク",
  targetAudience: "20代〜40代、お笑い好き",
  corners: [
    { name: "あちこちトーク", description: "ゲストとオードリーの自由なトーク", popularity: "high" },
    { name: "春日的確", description: "春日がゲストに突っ込んだ質問", popularity: "high" },
    { name: "若林の本音", description: "若林がボソッと本音を漏らす", popularity: "medium" },
  ],
  format: "飲食店セットでのトーク（大将・常連・ゲストの3者）",
  startDate: "2019-10-05",
  startDateText: "2019年10月5日",
  regularStartDate: "2019年10月5日",
  totalEpisodes: "330回以上（2026年2月時点）",
  broadcastHistory: "2019年10月開始→現在も継続中",
  ratings: [{ period: "2024年", average: "2-3%", note: "深夜帯で安定" }],
  awards: [],
  achievements: [
    "オードリーの冠番組として最長寿",
    "330回以上放送中の長寿番組",
    "テレビ東京の看板深夜番組",
  ],
  social: [
    { platform: "X(Twitter)", url: "@achikochi_tv", followers: "" },
    { platform: "TVer", url: "見逃し配信", followers: "" },
  ],
  twitter: "@achikochi_tv",
  sponsors: [{ name: "複数社提供", slot: "30秒提供" }],
  productionCooperation: ["テレビ東京", "UNITED PRODUCTIONS"],
  notes:
    "オードリーの冠番組。330回以上放送中の長寿番組。若林不在で春日が進行を務める回もあり、330回目で初めて春日が「大将席」に座った。",
  relatedPrograms: ["オードリーのNFLクラブ", "オードリーさん、ぜひ会ってほしい人がいるんです"],
  spinoffs: [],
  pastSpecials: ["年末SP", "春のSP"],
  tags: ["トークバラエティ", "お笑い", "深夜", "オードリー", "長寿番組"],
  genre: "トークバラエティ",
  category: "エンターテイメント",
};

// かまいガチ
export const programKamaigachi: ProgramInfo = {
  id: "kamaigachi",
  name: "かまいガチ",
  station: "テレビ朝日",
  schedule: "毎週水曜 23:15〜23:45",
  scheduleDetail: [{ day: "水曜", startTime: "23:15", endTime: "23:45", note: "レギュラー" }],
  timeSlot: "水曜深夜",
  officialUrl: "https://www.tv-asahi.co.jp/kamaigachi/",
  cast: "かまいたち（山内健司・濱家隆一）",
  regularCast: ["山内健司（かまいたち）", "濱家隆一（かまいたち）"],
  narrator: "不明",
  staff: [
    { role: "総合演出", name: "不明", affiliation: "テレビ朝日" },
    { role: "プロデューサー", name: "不明", affiliation: "テレビ朝日" },
  ],
  description:
    "かまいたちが「ガチ」で様々なことに挑戦するバラエティ。演技・ロケ・ゲームなど多岐にわたる企画で、二人の本気を見せる",
  concept: "「ガチ」で挑戦する姿を見せる",
  targetAudience: "10代〜30代、お笑い好き",
  corners: [
    { name: "ガチ演技", description: "ドラマのワンシーンを本気で演じる", popularity: "high" },
    { name: "ガチロケ", description: "現場で本気のバイト体験", popularity: "high" },
    { name: "ガチゲーム", description: "本気で勝ちに行くゲーム対決", popularity: "medium" },
  ],
  format: "スタジオ+VTR（ロケ）形式",
  startDate: "2022-04",
  startDateText: "2022年4月",
  regularStartDate: "2022年4月",
  totalEpisodes: "150回以上",
  broadcastHistory: "2022年4月開始→現在も継続中",
  ratings: [{ period: "2024年", average: "2-3%", note: "深夜帯で好調" }],
  awards: [],
  achievements: ["かまいたちの関東初冠レギュラー番組", "「ガチ」シリーズの先駆け"],
  social: [
    { platform: "TVer", url: "見逃し配信", followers: "" },
    { platform: "ABEMA", url: "配信", followers: "" },
  ],
  sponsors: [{ name: "複数社提供", slot: "30秒提供" }],
  productionCooperation: ["テレビ朝日", "UNITED PRODUCTIONS"],
  notes:
    "かまいたちの関東初冠レギュラー番組。2022年4月から放送時間が23:15に繰り上がり。濱家の「タブー」扱いや、山内の演技力が話題になることが多い。",
  relatedPrograms: ["千鳥の鬼レンチャン（かまいたちも出演）"],
  spinoffs: [],
  pastSpecials: ["年末SP"],
  tags: ["バラエティ", "お笑い", "深夜", "かまいたち", "挑戦"],
  genre: "バラエティ",
  category: "エンターテイメント",
};

// 千鳥の鬼レンチャン
export const programOnirenchan: ProgramInfo = {
  id: "onirenchan",
  name: "千鳥の鬼レンチャン",
  station: "フジテレビ系列",
  schedule: "毎週日曜 19:00〜20:54（2025年4月から2時間番組に拡大）",
  scheduleDetail: [
    { day: "日曜", startTime: "19:00", endTime: "20:54", note: "2025年4月から2時間拡大" },
  ],
  timeSlot: "日曜プライム",
  officialUrl: "https://www.fujitv.co.jp/oniren/",
  cast: "千鳥（大悟・ノブ）",
  regularCast: [
    "大悟（千鳥、MC）",
    "ノブ（千鳥、MC）",
    "かまいたち（濱家隆一・山内健司、対決パネラー）",
  ],
  narrator: "不明",
  staff: [
    { role: "総合演出", name: "不明", affiliation: "フジテレビ" },
    { role: "プロデューサー", name: "不明", affiliation: "フジテレビ" },
  ],
  description:
    "「サビだけカラオケ」などの人気企画で芸能人が挑戦。1音も外さずに10曲歌えるかなど、過酷なゲームに挑むバラエティ",
  concept: "「鬼のように厳しい」チャレンジ企画",
  targetAudience: "ファミリー層、幅広い年齢層",
  corners: [
    { name: "サビだけカラオケ", description: "サビだけを1音も外さず歌う", popularity: "high" },
    { name: "鬼タイム", description: "制限時間内にミッションをクリア", popularity: "high" },
    { name: "鬼の目", description: "間違い探しや眼力勝負", popularity: "medium" },
    { name: "鬼レンチャン対決", description: "かまいたちとの対決企画", popularity: "high" },
  ],
  format: "スタジオでのゲーム対決（千鳥+かまいたち+ゲスト）",
  startDate: "2022-04",
  startDateText: "2022年4月（レギュラー化）",
  regularStartDate: "2022年4月",
  totalEpisodes: "150回以上",
  broadcastHistory: "2022年4月レギュラー化→2025年4月2時間拡大",
  ratings: [
    { period: "2024年", average: "6-8%", highest: "10%", note: "フジテレビ日曜の看板" },
    { period: "2025年", average: "7-9%", note: "2時間化後も好調" },
  ],
  awards: [{ year: "2023", name: "日本民間放送連盟賞", note: "優秀賞" }],
  achievements: [
    "フジテレビの看板バラエティ番組",
    "2025年4月から放送時間拡大（1時間→2時間）",
    "「サビだけカラオケ」が社会現象に",
    "千鳥とかまいたちのコンビネーションが人気",
  ],
  social: [
    { platform: "X(Twitter)", url: "@oni_renchan", followers: "30万人以上" },
    { platform: "TVer", url: "見逃し配信", followers: "" },
    { platform: "FOD", url: "フジテレビオンデマンド", followers: "" },
  ],
  twitter: "@oni_renchan",
  sponsors: [{ name: "複数社提供", slot: "60秒提供" }],
  productionCooperation: ["フジテレビ", "UNITED PRODUCTIONS"],
  notes:
    "2025年4月から放送時間拡大（1時間→2時間）。フジテレビの看板バラエティ。千鳥とかまいたちの掛け合いが人気。",
  relatedPrograms: ["千鳥のクセスゴ!", "千鳥の大吾・ノブ 単独ライブ"],
  spinoffs: ["『鬼レンチャン』関連グッズ", "『サビだけカラオケ』アプリ"],
  pastSpecials: [
    "FNS 鬼レンチャン 歌謡祭（2024年5月29日、2025年10月5日）",
    "FNS27時間テレビ 鬼笑い祭（2023年）",
    "FNS27時間テレビ 日本一たのしい学園祭!（2024年）",
  ],
  tags: ["バラエティ", "ゲーム", "千鳥", "かまいたち", "日曜プライム"],
  genre: "ゲームバラエティ",
  category: "エンターテイメント",
};

// 残りの番組は簡易版で続く...
// 熱狂マニアさん！
export const programManiasan: ProgramInfo = {
  id: "maniasan",
  name: "熱狂マニアさん！",
  station: "TBS系列",
  schedule: "毎週土曜 19:00〜（基本1時間、SP時は2〜3時間）",
  scheduleDetail: [
    { day: "土曜", startTime: "19:00", endTime: "20:00", note: "通常放送" },
    { day: "土曜", startTime: "18:51", endTime: "21:00", note: "2時間SP時" },
  ],
  timeSlot: "土曜プライム",
  officialUrl: "https://www.tbs.co.jp/maniasan_tbs/",
  cast: "",
  regularCast: ["ナレーター進行（MC不在、ナレーション中心）"],
  narrator: "不明",
  staff: [
    { role: "総合演出", name: "林博史", affiliation: "UNITED PRODUCTIONS" },
    { role: "プロデューサー", name: "不明", affiliation: "TBS" },
  ],
  chiefDirector: "林博史（UNITED PRODUCTIONS所属）",
  description:
    "様々なジャンルの熱狂的なマニアを発掘し、行き過ぎた愛を語ってもらうドキュメントバラエティ",
  concept: "「マニアックな愛」を深掘りする",
  targetAudience: "20代〜50代、マニアックな趣味を持つ層",
  corners: [
    { name: "マニア紹介", description: "特定ジャンルのマニアを紹介", popularity: "high" },
    { name: "マニア対決", description: "マニア同士の知識対決", popularity: "medium" },
    { name: "通販マニア", description: "通販で買い漁るマニア（旧コーナー）", popularity: "medium" },
  ],
  format: "VTRドキュメント+スタジオ解説形式",
  startDate: "2023-04-15",
  startDateText: "2023年4月15日（現タイトル・時間帯に変更）",
  regularStartDate: "2023年4月15日",
  totalEpisodes: "100回以上",
  broadcastHistory: "深夜枠「通販マニアさん」→2023年4月土曜19時に昇格・リニューアル",
  ratings: [{ period: "2024年", average: "5-7%", note: "土曜プライムで安定" }],
  awards: [],
  achievements: [
    "深夜からゴールデンに昇格した成功例",
    "ニトリマニア、家事マニアなど身近なテーマが好評",
  ],
  social: [
    { platform: "TVer", url: "見逃し配信", followers: "" },
    { platform: "Paravi", url: "配信", followers: "" },
  ],
  sponsors: [{ name: "複数社提供", slot: "60秒提供" }],
  productionCooperation: ["TBS", "UNITED PRODUCTIONS"],
  notes:
    "旧タイトル：「〜通販マニアさん」。ニトリマニア、家事マニアなど、身近なジャンルのマニアが登場。林博史が総合演出。",
  relatedPrograms: ["マツコの知らない世界（マニア系）"],
  spinoffs: [],
  pastSpecials: ["2時間SP（不定期）", "3時間SP（大型連休時）"],
  tags: ["ドキュメントバラエティ", "マニア", "TBS", "土曜"],
  genre: "ドキュメントバラエティ",
  category: "情報・エンターテイメント",
};
