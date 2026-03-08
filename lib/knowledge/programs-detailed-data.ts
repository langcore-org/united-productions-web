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
  recentEpisodes: [
    {
      episodeNumber: "第600回以上",
      broadcastDate: "2026-02-24",
      title: "野生ネコの世界",
      content:
        "世界に41種類存在する野生ネコの世界を大特集。絶滅危機にある貴重な野生ネコたちの生態に迫る。スナネコ（砂漠の天使）、マヌルネコ（マツコ似!?）、カラカル、ベンガルヤマネコなどを紹介。",
      guests: ["秋山知伸（写真家）"],
    },
    {
      episodeNumber: "第600回以上",
      broadcastDate: "2026-02-17",
      title: "味噌の世界",
      content:
        "9歳から味噌を作り続ける高校1年生・結城敬蔵さんと、全国の味噌蔵を夜行バスで巡る味噌マニア・岩木みさきさんが登場。海外向けの進化系味噌から、伝統的な木桶で作る「ガチ味噌」まで幅広く紹介。",
      guests: ["結城敬蔵（味噌職人）", "岩木みさき（味ソムリエ）"],
    },
    {
      episodeNumber: "第600回以上",
      broadcastDate: "2026-02-10",
      title: "踏切の世界／ご当地喫茶店モーニングの世界",
      content:
        "22年間、踏切を一途に愛し続ける会社員・村竹真法さんが登場。全国の踏切名所やマニアックな音の楽しみ方を紹介。",
      guests: [
        "村竹真法（踏切マニア）",
        "あきたろ",
        "まぐろ大明神",
        "もんさん（モーニングマニア）",
      ],
    },
    {
      episodeNumber: "第600回以上",
      broadcastDate: "2026-02-03",
      title: "マンガ描き文字の世界",
      content: "マンガの描き文字に特化した世界。文字のデザインや表現技法について深く掘り下げる。",
      guests: ["藤村緋二（マンガ描き文字研究家）"],
    },
    {
      episodeNumber: "第600回以上",
      broadcastDate: "2026-01-13",
      title: "御守りの世界／豪華列車の世界 完結編",
      content:
        "「御守りの世界」と「豪華列車の世界 完結編」の2テーマ。林直岳さんが御守りの世界を、櫻井寛さん率いる鉄道オールスターズが豪華列車の完結編を紹介。スイスの山岳鉄道「ゴルナーグラート鉄道」や冬の絶景、富山県の観光列車「一万三千尺物語」ではスタジオで絶品の握りたて寿司が振る舞われる。",
      guests: [
        "林直岳（御守りマニア）",
        "櫻井寛",
        "三上雄平",
        "廣戸晶",
        "鈴木省吾",
        "鈴木哲也・健生",
        "堀切邦生",
        "髙橋健（鉄道マニア）",
      ],
    },
    {
      episodeNumber: "第600回以上",
      broadcastDate: "2026-01-03",
      title: "歌舞伎女方の世界／豪華列車の世界",
      content:
        "新春特別番組（21:00～2時間15分）。前半「歌舞伎女方の世界」では人間国宝・坂東玉三郎が歌舞伎女方の魅力を語る。後半「豪華列車の世界」では鉄道オールスターズ（櫻井寛、三上雄平、廣戸晶、鈴木省吾・哲也・健生、堀切邦生、髙橋健）が国内・海外14列車を紹介（スペーシアX、36+3、雪月花、氷河特急など）。",
      guests: [
        "坂東玉三郎（歌舞伎俳優・人間国宝）",
        "櫻井寛",
        "三上雄平",
        "廣戸晶",
        "鈴木省吾",
        "鈴木哲也・健生",
        "堀切邦生",
        "髙橋健（鉄道マニア）",
      ],
    },
  ],
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
  recentEpisodes: [
    {
      broadcastDate: "2026-01-09",
      title: "お笑い研究部 エバース「大躍進中の若手漫才師 エバースの今後を考える」後半戦",
      content:
        'M-1グランプリ2024で3位入賞した若手漫才師・エバースの今後を考えるお笑い研究部。ボケ担当の佐々木隆史が「女性が絡むとおかしくなって暴走する」と町田の"しくじり特徴"を語る。',
      guests: [
        "エバース（佐々木隆史、町田和悠）",
        "若林正恭",
        "澤部佑",
        "吉村崇",
        "伊集院光",
        "高橋真麻",
        "柏木由紀",
        "二瓶有加",
      ],
    },
    {
      broadcastDate: "2026-01-02",
      title: "お笑い研究部 エバース「大躍進中の若手漫才師 エバースの今後を考える」前半戦",
      content:
        "エバース特集の前半戦。大躍進中の若手漫才師・エバースの今後を考える。2024年のM-1で注目を集めたエバースのコンビ特性や今後の課題について、若林正恭や澤部佑らがアドバイス。",
      guests: [
        "エバース（佐々木隆史、町田和悠）",
        "若林正恭",
        "澤部佑",
        "吉村崇",
        "伊集院光",
        "高橋真麻",
        "柏木由紀",
        "二瓶有加",
      ],
    },
    {
      broadcastDate: "2025-12-30",
      title: "ユージ先生「母親とのしくじりまくり親子関係を激白SP」",
      content:
        '年末特別授業。ユージがテレビ初となる壮絶な過去を激白。「非行・ケンカを繰り返し中2で退学処分」「母親に『お前を殺して私も死ぬ』と包丁を突きつけられ、母親と2年間の接見禁止」という壮絶な親子関係のしくじりを"NGなし"で告白。',
      guests: ["ユージ（ふぉ〜ゆ〜）", "若林正恭", "澤部佑", "吉村崇", "伊集院光", "高橋真麻"],
    },
    {
      broadcastDate: "2025-12-19",
      title: "お笑い研究部「2025年総決算！しくじり芸人ニュース 後半戦」",
      content:
        "2025年のお笑い界を振り返る「しくじり芸人ニュース」の後半戦。2025年に起こったお笑い界のできごとや、芸人たちのしくじりエピソードをニュース形式で振り返る。",
      guests: ["若林正恭", "澤部佑", "吉村崇", "伊集院光", "高橋真麻", "お笑い芸人多数"],
    },
    {
      broadcastDate: "2025-12-12",
      title: "お笑い研究部「2025年総決算！しくじり芸人ニュース 前半戦」",
      content:
        "2025年のお笑い界を振り返る「しくじり芸人ニュース」の前半戦。今年一年のお笑い界の動向や、話題になったしくじりエピソードを総まとめ。",
      guests: ["若林正恭", "澤部佑", "吉村崇", "伊集院光", "高橋真麻", "お笑い芸人多数"],
    },
  ],
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
  recentEpisodes: [
    {
      broadcastDate: "2026-02-01",
      title: "新サービス続々！タクシーのお金のヒミツ",
      content:
        "配車アプリの普及で身近になったタクシー業界のお金のヒミツを徹底調査。学校や塾にドアtoドアで送迎する「子育てタクシー」、サスペンションでケージの揺れを軽減した「ペットタクシー」、買い物からお墓参りまで請け負う「おつかいタクシー」などを紹介。",
      guests: [
        "有吉弘行",
        "田牧そら",
        "ノブ（カネオくん声）",
        "日本交通・国際交通のタクシー乗務員",
      ],
    },
    {
      broadcastDate: "2026-01-25",
      title: "ファン急増！バスケ「Bリーグ」のヒミツ",
      content:
        "全国で急速にファンを増やすBリーグ（バスケットボール国内プロリーグ）のヒミツを調査。1試合の演出費用に数千万円を投じる音響、スモーク、巨大火柱などコンサートのような会場演出の裏側に迫る。",
      guests: ["有吉弘行", "田牧そら", "ノブ（カネオくん声）", "馬場雄大選手", "富永啓生選手"],
    },
    {
      broadcastDate: "2026-01-18",
      title: "「氷上の格闘技」アイスホッケーのヒミツ",
      content:
        "「氷上の格闘技」と呼ばれるアイスホッケーのお金のヒミツを徹底調査。海外のプロリーグでは試合中の乱闘を容認し、戦略としてワザと乱闘を仕掛けることも。",
      guests: ["有吉弘行", "田牧そら", "ノブ（カネオくん声）", "アイスホッケー現役プロ選手"],
    },
    {
      broadcastDate: "2026-01-11",
      title: "全国各地の愛され「ご当地銘菓」SP！",
      content:
        "これまでに特集してきた「ご当地銘菓」を一挙大公開する特別編。鹿児島のロングセラー「ボンタン果汁アメ」の製造工場に潜入し、重力を利用した驚きの仕掛けを紹介。",
      guests: ["有吉弘行", "田牧そら", "ノブ（カネオくん声）"],
    },
    {
      broadcastDate: "2026-01-04",
      title: "2026年新春98分スペシャル",
      content:
        "2026年新春特別番組（98分拡大版）。寒い冬に食べたい「名物ご当地鍋」を徹底調査。各地の絶品鍋を続々と紹介し、お金にまつわるヒミツを解き明かす。",
      guests: ["有吉弘行", "田牧そら", "ノブ（カネオくん声）"],
    },
  ],
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
  recentEpisodes: [
    {
      broadcastDate: "2026-02-18",
      title: "アルコ＆ピース＆カミナリ＆吉住",
      content:
        "「芸能人の反省ノートを見てみよう！」をテーマに、アルコ＆ピース、カミナリ、吉住が来店。若林正恭が不在（体調不良）で、アルコ＆ピースの平子祐希が緊急MCを務める。",
      guests: [
        "アルコ＆ピース（平子祐希、酒井健太）",
        "カミナリ（竹内まなぶ、石田たくみ）",
        "吉住",
        "平子祐希（緊急MC）",
      ],
    },
    {
      broadcastDate: "2026-02-11",
      title: "Aマッソ＆山崎怜奈＆宮下草薙",
      content:
        "若林正恭不在でアルピー平子が緊急MCを務める回。Aマッソのむらきゃみがご懐妊を報告し、春日からご祝儀を贈られる。宮下草薙がM-1ラストイヤーへの想いを語り、山崎怜奈はレギュラー3本を持つ人気パーソナリティとしての本音を吐露。",
      guests: [
        "Aマッソ（加賀翔、むらきゃみ）",
        "山崎怜奈",
        "宮下草薙（宮下兼史鷹、草薙航基）",
        "平子祐希（緊急MC）",
      ],
    },
    {
      broadcastDate: "2026-02-04",
      title: "髙地優吾＆松田好花＆ママタルト",
      content:
        "「私がくらった一言発表会」をテーマに、髙地優吾（SixTONES）、松田好花（日向坂46）、ママタルトが来店。髙地は「忘れられない一言」として、興味がないと物事に着手できない自分の性格について語る。",
      guests: [
        "髙地優吾（SixTONES）",
        "松田好花（日向坂46）",
        "ママタルト（大鶴肥満、粟根まこと）",
        "平子祐希（緊急MC）",
      ],
    },
    {
      broadcastDate: "2026-01-28",
      title: "俵万智＆ヒコロヒー",
      content:
        "教養が高まるゲスト回。短歌「サラダ記念日」で280万部超えの大ヒットを記録した歌人・俵万智が登場。毎月ホストと歌会を開催しているという俵の意外な一面や、SNSのクソリプ考察も。",
      guests: ["俵万智（歌人）", "ヒコロヒー"],
    },
    {
      broadcastDate: "2026-01-22",
      title: "年末特大号「嫌なこと悩み全放出SP」",
      content:
        "年末特大号「嫌なこと悩み全放出SP」（2025-12-30放送）。大久保佳代子、若槻千夏、渋谷凪咲、あの、福留光帆、イワクラ（蛙亭）、福田麻貴（3時のヒロイン）、やす子など豪華ゲストが登場し、1年の嫌なことを全て吐き出す。",
      guests: [
        "大久保佳代子",
        "若槻千夏",
        "渋谷凪咲",
        "あの",
        "福留光帆",
        "イワクラ（蛙亭）",
        "福田麻貴（3時のヒロイン）",
        "やす子",
      ],
    },
  ],
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
  recentEpisodes: [
    {
      broadcastDate: "2025-02-05",
      title: "なるおの息子に冬服を買ってあげたいねん！",
      content:
        "わらふぢなるお・口笛なるおの息子に冬服をプレゼントする企画。なるおの家族に密着し、息子の好みやサイズを調査。買い物ロケで山内・濱家が服を選び、プレゼントのサプライズを実施。",
      guests: [
        "口笛なるお（わらふぢなるお）",
        "とにかく明るい安村",
        "みなみかわ",
        "芝大輔（モグライダー）",
      ],
    },
    {
      broadcastDate: "2025-02-12",
      title: "SUPER BEAVER渋谷龍太参戦！「居酒屋のこと俺が一番わかってんねん」",
      content:
        "人気企画「居酒屋のこと俺が一番わかってんねん」第4弾。居酒屋で約7年バイト経験があるSUPER BEAVER・渋谷龍太が参戦。店長は誰か、一番人気メニューは何かなどのクイズに挑戦。",
      guests: ["渋谷龍太（SUPER BEAVER）", "藤本敏史（FUJIWARA）", "みなみかわ"],
    },
    {
      broadcastDate: "2025-02-19",
      title: "キンタロー。ジョイマン一瞬の輝き！1シャッターで最高の1枚とるねん",
      content:
        "一瞬の表情や動作をカメラで捉える「最高の1枚」を撮影する企画。キンタロー。やジョイマンなどが被写体となり、かまいたちとゲストがカメラマンとして最高の瞬間を狙う。",
      guests: ["水田信二（和牛）", "みなみかわ", "加賀翔（かが屋）", "ジョイマン", "キンタロー。"],
    },
    {
      broadcastDate: "2025-02-26",
      title: "ダイアン ユースケ「ここからは聞いた話なんやけど…」禁断の噂話",
      content:
        "芸人たちが楽屋で語る「ここからは聞いた話なんやけど…」をテーマに、業界の噂話や裏話を披露。ユースケを中心に、かまいたち、みなみかわ、ガクテンソク・奥田、岡野陽一、相席スタート・山添が集結し、禁断のトークを展開。",
      guests: [
        "ユースケ（ダイアン）",
        "みなみかわ",
        "奥田修二（ガクテンソク）",
        "岡野陽一",
        "山添寛（相席スタート）",
      ],
    },
    {
      broadcastDate: "2025-03-05",
      title: "「でな、話はここからやねん」ハライチ岩井 配信に残された恐怖体験告白",
      content:
        "人気トーク企画「でな、話はここからやねん」第5回。最初は楽しげな話から始まり、「でな、話はここからやねん」をきっかけに急展開する怖い話を披露。ハライチ・岩井が配信に残された自身の恐怖体験を語る。",
      guests: [
        "岩井勇気（ハライチ）",
        "太田博久（ジャングルポケット）",
        "芝大輔（モグライダー）",
        "中山功太",
        "松村沙友理",
      ],
    },
  ],
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
  recentEpisodes: [
    {
      broadcastDate: "2025-01-05",
      title: "サビだけカラオケ 新春タッグモード大会",
      content:
        "新春特別企画。タッグモードでサビだけカラオケに挑戦。2人1組でサビを交互に歌い、10曲連続クリアで鬼レンチャン達成（賞金100万円）。",
      guests: [
        "WEST.（神山智洋＆濱田崇裕）",
        "池田裕楽（STU48）＆キンタロー。",
        "ほいけんた＆Toshl",
        "FRUITS ZIPPER（仲川瑠夏＆櫻井優衣）",
        "日向坂46（富田鈴花＆髙橋未来虹）",
        "THE RAMPAGE（浦川翔平＆鈴木昂秀）",
      ],
    },
    {
      broadcastDate: "2025-01-19",
      title: "サビだけカラオケ",
      content:
        "ノーマルモードでのサビだけカラオケ。各挑戦者が10曲連続でサビを歌いきり、鬼レンチャン（10レンチャン）を目指す。",
      guests: ["リン・ユーチュン", "荒牧陽子", "河合郁人（A.B.C-Z）", "Crystal Kay"],
    },
    {
      broadcastDate: "2025-02-09",
      title: "サビだけカラオケ",
      content: "ノーマルモードでのサビだけカラオケ。城南海や平野綾らが挑戦。",
      guests: ["城南海", "平野綾", "ササキオサム（MOON CHILD）", "宇徳敬子"],
    },
    {
      broadcastDate: "2025-02-23",
      title: "冬のスポーツレンチャンSP",
      content:
        "スポーツ競技で鬼レンチャンを目指す2時間スペシャル。女子300m走サバイバルレンチャンとメダリストレンチャンを開催。サバイバルレンチャンは予選で最下位が脱落し、勝ち残るごとにレンチャンが加算。",
      guests: [
        "金田朋子",
        "福島和可菜",
        "ギャビー",
        "守屋茜",
        "くわがた心",
        "信子（ぱーてぃーちゃん）",
        "井上咲楽",
        "AYA",
        "上谷沙弥",
        "風見和香（私立恵比寿中学）",
        "安田美沙子",
        "キンタロー。",
        "鏡優翔",
        "青木マッチョ（かけおち）",
        "太田博久（ジャングルポケット）",
        "和田まんじゅう（ネルソンズ）",
        "福島善成（ガリットチュウ）",
        "青山フォール勝ち（ネルソンズ）",
      ],
    },
    {
      broadcastDate: "2025-03-16",
      title: "サビだけカラオケ",
      content:
        "ノーマルモードでのサビだけカラオケ。Aぇ! group・佐野晶哉が鬼ハードモードに挑戦。シェネル、SARI、TEEも参戦。",
      guests: ["佐野晶哉（Aぇ! group）", "シェネル", "SARI", "TEE"],
    },
  ],
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
  recentEpisodes: [
    {
      broadcastDate: "2024-12-07",
      title: "年末の悩み一斉解決SP",
      content:
        "「名もなき家事」を撃退するマニア激推しの便利グッズを紹介。芸能界のご意見番・辛口主婦軍団（虻川美穂子、くわばたりえ、高橋ユウ、松嶋尚美）がジャッジ。また、掃除グッズマニアさんが劇的に楽になる年末予防掃除術を伝授。",
      guests: [
        "アンミカ",
        "岡本知高",
        "ギャル曽根",
        "小森隼（GENERATIONS）",
        "なすなかにし",
        "池田美優（みちょぱ）",
        "虻川美穂子",
        "くわばたりえ",
        "高橋ユウ",
        "中岡創一（ロッチ）",
        "松嶋尚美",
      ],
    },
    {
      broadcastDate: "2024-12-01",
      title: "節約マニア集結！年末年始散財したお金を取り戻せ…大節約術SP",
      content:
        "2時間スペシャル。全国から節約マニア軍団が集結し、ポイ活、誕生日特典、絶品激安グルメなど新年の節約術を紹介。",
      guests: [
        "アンミカ",
        "岡本知高",
        "影山優佳",
        "ギャル曽根",
        "錦鯉（長谷川雅紀・渡辺隆）",
        "池田美優（みちょぱ）",
        "近藤千尋",
        "なすなかにし",
        "松嶋尚美",
      ],
    },
    {
      broadcastDate: "2025-01-25",
      title: "マニアさんの住みたい街ランキング〜ご当地スーパー編〜",
      content:
        "新企画「マニアさんの住みたい街ランキング」が始動。毎年発表される「住みたい街ランキング」に乗じ、特定のジャンルに全振りしたランキングを作成。今回は「ご当地スーパー」をテーマに、マニアさんが選ぶ住みたい街を検証。",
      guests: [
        "アンミカ",
        "岡本知高",
        "ギャル曽根",
        "佐藤大樹（FANTASTICS）",
        "錦鯉（長谷川雅紀・渡辺隆）",
        "池田美優（みちょぱ）",
        "エハラマサヒロ",
        "中山エミリ",
        "松嶋尚美",
        "横澤夏子",
      ],
    },
    {
      broadcastDate: "2025-02-22",
      title: "マニアさんの住みたい街ランキング〜デカ盛り編〜",
      content:
        "「マニアさんの住みたい街ランキング」第2弾。今回は「デカ盛り」をテーマに、デカ盛りマニアさんが選ぶ住みたい街を特集。YouTube再生回数1億7500万回超えのトラックドライバーおじとらとギャル曽根の二人旅では、富士山付近のドライブイングルメを紹介。",
      guests: [
        "アンミカ",
        "ギャル曽根",
        "鈴木伸之",
        "なすなかにし",
        "池田美優（みちょぱ）",
        "タイムマシーン3号",
        "東京ホテイソン",
        "浜口京子",
        "山下健二郎（三代目 J SOUL BROTHERS）",
      ],
    },
  ],
};
