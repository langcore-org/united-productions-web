import fs from "node:fs";
import { encodingForModel } from "js-tiktoken";

// GPT-4/Claude用のトークナイザー（cl100k_base）
const enc = encodingForModel("gpt-4");

function countTokens(text) {
  return enc.encode(text).length;
}

// プロンプトファイルを読み込み
const promptFiles = [
  { key: "GENERAL_CHAT", file: "docs/prompts/GENERAL_CHAT.md" },
  { key: "MINUTES", file: "docs/prompts/MINUTES.md" },
  { key: "PROPOSAL", file: "docs/prompts/PROPOSAL.md" },
  { key: "RESEARCH_CAST", file: "docs/prompts/RESEARCH_CAST.md" },
  { key: "RESEARCH_EVIDENCE", file: "docs/prompts/RESEARCH_EVIDENCE.md" },
];

console.log("=== 正確なトークン数計算（cl100k_base）===\n");

// 番組情報（system-prompt.ts の内容を再現）
const programInfo = `# レギュラー番組一覧（13本）

## マツコの知らない世界

- 放送局: TBS
- 放送時間: 毎週火曜 20:55〜
- MC/出演者: マツコ・デラックス
- 番組内容: ゲスト自ら得意ジャンルやハマっているものを企画として持ち込み、マツコ・デラックスとサシトーク
- 開始時期: 2011年〜
- 特記事項: TBSの看板バラエティ番組。様々なジャンルのマニアが登場し、マツコにプレゼン

## しくじり先生 俺みたいになるな!!

- 放送局: テレビ朝日系列／Abema
- 放送時間: 毎週月曜 23:15〜（レギュラー）、Abemaで毎月1〜3週金曜21:30〜配信
- MC/出演者: ギャル曽根
- 番組内容: 有名人が自身の失敗談を「授業」として披露するバラエティ。視聴者が教訓を学ぶ形式
- 特記事項: 「しくじり」という言葉を定着させた人気番組

## 有吉のお金発見 突撃！カネオくん

- 放送局: NHK総合テレビ
- 放送時間: 毎週土曜 20:15〜20:53
- MC/出演者: 有吉弘行、カネオくん（千鳥・ノブのキャラクター）
- 番組内容: 身近なものの「お金の秘密」を徹底調査。商品の値段の仕組みや裏側を解説
- 特記事項: NHKで珍しいバラエティ色の強い番組。カネオくん人形が人気。再放送は土曜10:05〜10:38

## あちこちオードリー

- 放送局: テレビ東京
- 放送時間: 毎週水曜 23:06〜
- MC/出演者: オードリー（若林正恭・春日俊彰）
- 番組内容: 飲食店を模したスタジオで、オードリーがゲストとトークを展開。大将（春日）と常連（若林）の設定
- 開始時期: 2019年10月5日〜
- 特記事項: オードリーの冠番組。330回以上放送中の長寿番組

## かまいガチ

- 放送局: テレビ朝日
- 放送時間: 毎週水曜 23:15〜
- MC/出演者: かまいたち（山内健司・濱家隆一）
- 番組内容: かまいたちが「ガチ」で様々なことに挑戦。演技・ロケ・ゲームなど多岐にわたる
- 特記事項: かまいたちの関東初冠レギュラー番組。2022年4月から放送時間が23:15に繰り上がり

## 千鳥の鬼レンチャン

- 放送局: フジテレビ
- 放送時間: 毎週日曜 19:00〜20:54（2025年4月から2時間番組に拡大）
- MC/出演者: 千鳥（大悟・ノブ）、対決パネラー：かまいたち（濱家隆一・山内健司）
- 番組内容: 「サビだけカラオケ」などの人気企画で、芸能人が挑戦。1音も外さずに10曲歌えるかなどのゲーム
- 開始時期: 2022年レギュラー化
- 特記事項: 2025年4月から放送時間拡大（1時間→2時間）。フジテレビの看板バラエティ

## 熱狂マニアさん！

- 放送局: TBS
- 放送時間: 毎週土曜 19:00〜（基本1時間、SP時は2〜3時間）
- MC/出演者: 
- 番組内容: 様々なジャンルの熱狂的なマニアを発掘。行き過ぎた愛を語る
- 開始時期: 2023年4月15日から現タイトル・時間帯に変更
- 特記事項: 旧タイトル：「〜通販マニアさん」。ニトリマニア、家事マニアなど身近なジャンルのマニアが登場

## 林修の今知りたいでしょ！

- 放送局: テレビ朝日
- 放送時間: 毎週木曜 19:00〜
- MC/出演者: 林修、副担任：斎藤ちはる（テレビ朝日アナウンサー）
- 番組内容: 普段は教える立場の林修先生が生徒に変身。各分野の講師が林修に知らない世界をレクチャー
- 特記事項: テレビ朝日が選ぶ「青少年に見てもらいたい番組」。林修の名言「今でしょ！」が番組名に

## THE神業チャレンジ

- 放送局: TBS
- 放送時間: 毎週火曜 19:00〜（基本1時間、SP時は拡大）
- MC/出演者: 総合演出：林博史（UNITED PRODUCTIONS所属）
- 番組内容: 神業クレーンゲーム、画面隠し太鼓の達人など、達人の技をクリアするゲームバラエティ
- 開始時期: 2023年4月11日〜
- 特記事項: 達人の技を芸能人が挑戦する形式。スペシャル版も定期的に放送

## ニカゲーム

- 放送局: テレビ朝日
- 放送時間: 毎週水曜 25:58〜（深夜）
- MC/出演者: 二階堂高嗣（Kis-My-Ft2）、松井ケムリ（令和ロマン）、猪俣周杜（timelesz）
- 番組内容: 「二階堂＋カム（Come）＝ニカゲーム」。ちょっと奇妙な教育番組の世界でひらめきゲームに挑戦
- 開始時期: 2025年10月1日〜
- 特記事項: 2025年4月『バラバラマンスリー』→6月全国放送特番→8月リアルイベントを経てレギュラー化

## まいにち大喜利

- 放送局: テレビ朝日／YouTube
- 放送時間: 月〜金 朝7:00〜（ショート動画）、完全版は金曜17:00〜配信
- MC/出演者: MC：モグライダー（芝大輔・ともしげ）
- 番組内容: 芸人たちが毎日渾身の大喜利を披露。テレ朝公式YouTube「動画、はじめてみました」で配信される人気コンテンツ
- 開始時期: 2022年11月〜
- 特記事項: 「まいにちシリーズ」第1弾。累計再生回数1.4億回を誇る人気YouTube番組

## まいにち賞レース

- 放送局: テレビ朝日／YouTube
- 放送時間: 金曜17:00〜配信（完全版）
- MC/出演者: MC：アルコ＆ピース（平子祐希・酒井健太）
- 番組内容: 極狭（ごくせま）＝ニッチなジャンルで特異な能力を発揮する人々にスポットライトを当て、その頂点を決める賞レース
- 開始時期: 2023年11月〜
- 特記事項: 「まいにちシリーズ」第2弾。審査員は週替りで若者世代に人気のアイドルが担当

## 偏愛博物館

- 放送局: BS-TBS
- 放送時間: 毎週日曜 18:30〜（再放送も同時間帯）
- MC/出演者: 伊集院光
- 番組内容: 何かを愛しすぎてしまった人が作った私設博物館＝「偏愛ミュージアム」に伊集院光が訪問し、その魅力を楽しむ
- 開始時期: 2025年3月〜
- 特記事項: 日本全国にある5700以上の博物館の中から、個人が愛情を注いで作ったユニークな博物館を紹介

---

上記の詳細な番組情報を前提知識として保持してください。
ユーザーの質問に応じて、番組情報を参照しつつ適切に回答してください。
可能な限り具体的な情報（放送時間、出演者、コーナー名など）を含めて回答してください。`;

const programTokens = countTokens(programInfo);

console.log("【番組情報ベース】");
console.log(`  文字数: ${programInfo.length.toLocaleString()} 文字`);
console.log(`  トークン数: ${programTokens.toLocaleString()} tokens\n`);

console.log("【機能プロンプト】");
let maxFeatureTokens = 0;
let maxFeatureKey = "";

for (const { key, file } of promptFiles) {
  try {
    const content = fs.readFileSync(file, "utf-8");
    const tokens = countTokens(content);
    console.log(
      `  ${key}: ${tokens.toLocaleString()} tokens (${content.length.toLocaleString()} 文字)`,
    );

    if (tokens > maxFeatureTokens) {
      maxFeatureTokens = tokens;
      maxFeatureKey = key;
    }
  } catch (_e) {
    console.log(`  ${key}: エラー`);
  }
}

// 機能固有の指示ヘッダー
const featureHeader = "\n---\n\n## 機能固有の指示\n\n";
const featureHeaderTokens = countTokens(featureHeader);

console.log(`\n【機能ヘッダー】: ${featureHeaderTokens} tokens`);

// 合計
console.log("\n【機能別 合計トークン数（システムプロンプト全体）】");
for (const { key, file } of promptFiles) {
  try {
    const content = fs.readFileSync(file, "utf-8");
    const total = programTokens + featureHeaderTokens + countTokens(content);
    console.log(`  ${key}: ${total.toLocaleString()} tokens`);
  } catch (_e) {
    // ignore
  }
}

console.log("\n=== サマリー ===");
console.log(`番組情報（13本）: ${programTokens.toLocaleString()} tokens`);
console.log(`最大機能プロンプト (${maxFeatureKey}): ${maxFeatureTokens.toLocaleString()} tokens`);
console.log(
  `最大合計: ${(programTokens + featureHeaderTokens + maxFeatureTokens).toLocaleString()} tokens`,
);
console.log(
  `最小合計 (GENERAL_CHAT): ${(programTokens + featureHeaderTokens + countTokens(fs.readFileSync("docs/prompts/GENERAL_CHAT.md", "utf-8"))).toLocaleString()} tokens`,
);
