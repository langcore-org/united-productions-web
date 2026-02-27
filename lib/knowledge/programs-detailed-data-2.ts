/**
 * United Productions レギュラー番組データ（詳細版・データ部分その2）
 */

import type { ProgramInfo } from "./types";

// 林修の今知りたいでしょ！
export const programHayashiosamu: ProgramInfo = {
  id: "hayashiosamu",
  name: "林修の今知りたいでしょ！",
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
  station: "TBS",
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

// まいにち大喜利
export const programMainichioogiri: ProgramInfo = {
  id: "mainichioogiri",
  name: "まいにち大喜利",
  station: "テレビ朝日／YouTube",
  schedule: "月〜金 朝7:00〜（ショート動画）、金曜17:00〜（完全版）",
  scheduleDetail: [
    { day: "月〜金", startTime: "07:00", endTime: "07:05", note: "ショート動画（YouTube）" },
    { day: "金曜", startTime: "17:00", endTime: "17:30", note: "完全版配信" },
  ],
  timeSlot: "平日朝／金曜夕方",
  officialUrl: "https://www.youtube.com/c/動画-はじめてみました-テレビ朝日公式",
  cast: "モグライダー（芝大輔・ともしげ）",
  regularCast: ["芝大輔（モグライダー）", "ともしげ（モグライダー）"],
  narrator: "不明",
  staff: [
    { role: "総合演出", name: "不明", affiliation: "UNITED PRODUCTIONS" },
    { role: "プロデューサー", name: "不明", affiliation: "UNITED PRODUCTIONS" },
  ],
  description:
    "芸人たちが毎日渾身の大喜利を披露。テレ朝公式YouTube「動画、はじめてみました」で配信される人気コンテンツ",
  concept: "「毎日大喜利」を気軽に楽しむ",
  targetAudience: "10代〜30代、お笑い好き、YouTube視聴者",
  corners: [
    { name: "大喜利コーナー", description: "お題に対して芸人が回答", popularity: "high" },
    { name: "ベスト大喜利", description: "週間ベスト回答を紹介", popularity: "high" },
  ],
  format: "YouTubeショート動画＋長尺完全版",
  startDate: "2022-11",
  startDateText: "2022年11月",
  regularStartDate: "2022年11月",
  totalEpisodes: "数百回以上",
  broadcastHistory: "2022年11月開始→累計再生回数1.4億回を突破→2023年まいにち賞レース開始",
  ratings: [{ period: "YouTube", average: "", note: "累計再生回数1.4億回以上" }],
  awards: [],
  achievements: [
    "「まいにちシリーズ」第1弾",
    "累計再生回数1.4億回を突破",
    "テレビ朝日のYouTubeチャンネル看板コンテンツ",
  ],
  social: [
    {
      platform: "YouTube",
      url: "https://www.youtube.com/c/動画-はじめてみました-テレビ朝日公式",
      followers: "登録者数数十万",
    },
    { platform: "TikTok", url: "@dogahajime", followers: "" },
    { platform: "X", url: "@douhaji_ex", followers: "" },
  ],
  sponsors: [{ name: "au", slot: "スポンサー" }],
  productionCooperation: ["テレビ朝日", "UNITED PRODUCTIONS"],
  notes:
    "「まいにちシリーズ」第1弾。累計再生回数1.4億回を誇る人気YouTube番組。auの提供で運営。イベント「まいにちフェス」も開催。",
  relatedPrograms: ["まいにち賞レース", "動画、はじめてみました"],
  spinoffs: ["まいにち賞レース", "まいにちフェス（イベント）"],
  pastSpecials: ["まいにちフェス 2024", "まいにちフェス 2025"],
  tags: ["大喜利", "YouTube", "お笑い", "モグライダー", "テレビ朝日"],
  genre: "お笑いバラエティ",
  category: "エンターテイメント",
};

// まいにち賞レース
export const programMainichishouresu: ProgramInfo = {
  id: "mainichishouresu",
  name: "まいにち賞レース",
  station: "テレビ朝日／YouTube",
  schedule: "金曜17:00〜配信（完全版）",
  scheduleDetail: [{ day: "金曜", startTime: "17:00", endTime: "17:30", note: "完全版配信" }],
  timeSlot: "金曜夕方",
  officialUrl: "https://www.youtube.com/c/動画-はじめてみました-テレビ朝日公式",
  cast: "アルコ＆ピース（平子祐希・酒井健太）",
  regularCast: ["平子祐希（アルコ＆ピース）", "酒井健太（アルコ＆ピース）"],
  narrator: "不明",
  staff: [
    { role: "総合演出", name: "不明", affiliation: "UNITED PRODUCTIONS" },
    { role: "プロデューサー", name: "不明", affiliation: "UNITED PRODUCTIONS" },
  ],
  description:
    "極狭（ごくせま）＝ニッチなジャンルで特異な能力を発揮する人々にスポットライトを当て、その頂点を決める賞レース",
  concept: "「平日最後の賞レース」でニッチなチャンピオンを決定",
  targetAudience: "10代〜30代、お笑い好き、YouTube視聴者",
  corners: [
    { name: "賞レース", description: "ニッチなジャンルで頂点を決める", popularity: "high" },
    { name: "アイドル審査員", description: "週替りのアイドルが審査員を担当", popularity: "high" },
  ],
  format: "YouTube動画（長尺）",
  startDate: "2023-11",
  startDateText: "2023年11月",
  regularStartDate: "2023年11月",
  totalEpisodes: "数十回以上",
  broadcastHistory: "2023年11月開始→まいにちシリーズ第2弾として展開中",
  ratings: [
    { period: "YouTube", average: "", note: "累計再生回数1.4億回以上（まいにちシリーズ全体）" },
  ],
  awards: [],
  achievements: [
    "「まいにちシリーズ」第2弾",
    "ニッチなジャンルの達人を発掘",
    "アイドル審査員の「迷」審査が話題",
  ],
  social: [
    {
      platform: "YouTube",
      url: "https://www.youtube.com/c/動画-はじめてみました-テレビ朝日公式",
      followers: "",
    },
    { platform: "TikTok", url: "@dogahajime", followers: "" },
    { platform: "X", url: "@douhaji_ex", followers: "" },
  ],
  sponsors: [{ name: "au", slot: "スポンサー" }],
  productionCooperation: ["テレビ朝日", "UNITED PRODUCTIONS"],
  notes:
    "「まいにちシリーズ」第2弾。審査員は週替りで若者世代に絶大な人気を誇るアイドルたちが担当。「絶対に負けられない戦いが、毎日ある」。",
  relatedPrograms: ["まいにち大喜利", "動画、はじめてみました"],
  spinoffs: ["まいにちフェス（イベント）"],
  pastSpecials: ["まいにちフェス 2024", "まいにちフェス 2025"],
  tags: ["賞レース", "YouTube", "お笑い", "アルコ＆ピース", "テレビ朝日"],
  genre: "お笑いバラエティ",
  category: "エンターテイメント",
};

// 偏愛博物館
export const programHenaimuseum: ProgramInfo = {
  id: "henaimuseum",
  name: "偏愛博物館",
  station: "BS-TBS",
  schedule: "毎週日曜 18:30〜19:00（再放送も同時間帯）",
  scheduleDetail: [
    { day: "日曜", startTime: "18:30", endTime: "19:00", note: "レギュラー＋再放送" },
  ],
  timeSlot: "日曜夕方",
  officialUrl: "https://bs.tbs.co.jp/entertainment/henaimuseum/",
  cast: "伊集院光",
  regularCast: ["伊集院光（MC）"],
  narrator: "不明",
  staff: [
    { role: "総合演出", name: "不明", affiliation: "BS-TBS" },
    { role: "プロデューサー", name: "不明", affiliation: "UNITED PRODUCTIONS" },
  ],
  description:
    "何かを愛しすぎてしまった人が作った私設博物館＝「偏愛ミュージアム」に伊集院光が訪問。博物館の展示物や館長との会話を通して、偏愛の世界の魅力を楽しむ",
  concept: "「偏愛」の世界を伊集院光が体験",
  targetAudience: "20代〜50代、博物館好き、カルチャー好き",
  corners: [
    { name: "偏愛ミュージアム訪問", description: "伊集院光が個人博物館を訪問", popularity: "high" },
    { name: "館長との対談", description: "偏愛の理由や背景を掘り下げる", popularity: "high" },
  ],
  format: "ロケドキュメント（伊集院光が全国の博物館を訪問）",
  startDate: "2025-03",
  startDateText: "2025年3月",
  regularStartDate: "2025年3月",
  totalEpisodes: "10回以上",
  broadcastHistory: "2025年3月開始（第1回〜第6回）→シーズン2（2025年7月）→シーズン3（2025年10月）",
  ratings: [{ period: "2025年", average: "", note: "BS-TBSで放送" }],
  awards: [],
  achievements: [
    "日本全国にある5700以上の博物館の中から、個人が愛情を注いで作ったユニークな博物館を紹介",
    "シーズン3まで継続中",
  ],
  social: [
    { platform: "BS-TBS", url: "https://bs.tbs.co.jp/entertainment/henaimuseum/", followers: "" },
    { platform: "TVer", url: "見逃し配信", followers: "" },
  ],
  sponsors: [{ name: "複数社提供", slot: "30秒提供" }],
  productionCooperation: ["BS-TBS", "UNITED PRODUCTIONS"],
  notes:
    "日本全国にある5700以上の博物館の中から、個人が愛情を注いで作ったユニークな博物館を紹介。伊集院光の博識とユーモアが光る。",
  relatedPrograms: ["熱狂マニアさん！", "マツコの知らない世界"],
  spinoffs: [],
  pastSpecials: [],
  tags: ["ドキュメントバラエティ", "博物館", "伊集院光", "BS-TBS", "カルチャー"],
  genre: "ドキュメントバラエティ",
  category: "教養・エンターテイメント",
};
