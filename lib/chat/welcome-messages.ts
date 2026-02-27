/**
 * 番組選択時のウェルカムメッセージ（シンプル版）
 *
 * ユーザーが番組セレクターで番組を選択した際に、
 * エージェントが瞬時に表示するメッセージを定義
 */

/** 機能ID → メッセージテンプレート */
const WELCOME_TEMPLATES: Record<string, string> = {
  "general-chat": `「{program}」についてお話ししましょう。
番組の企画案、出演者についての相談、業界のトレンドなど——知りたいことを何でもお聞かせください。

例：「バラエティ企画に合う若手俳優を探して」「この番組の視聴率を教えて」「企画書の書き方のアドバイスをください」`,

  "research-cast": `「{program}」にぴったりの出演者を探します。
MCに合うゲスト、企画のテーマに沿った専門家、新しい顔ぶれなどをご提案します。

どのような出演者をお探しですか？
例：「料理のプロ」「若手芸人」「視聴者参加型に合う一般の方」「専門家として博士」`,

  proposal: `「{program}」を題材に、新しい企画を一緒に考えましょう。
既存の魅力を活かしながら、斬新なアイデアを出し合います。

どのような方向性から始めますか？
例：「視聴者参加型」「対決企画」「ロケ特別版」「感動系ドキュメンタリー」`,

  "research-evidence": `「{program}」に関する情報の真偽を検証します。
噂、統計データ、過去の放送内容など、事実確認が必要な情報を調査します。

どのような情報を確認しますか？
例：「この視聴率データは本当？」「〇〇さんは過去に出演したことがある？」「SNSで話題の情報をファクトチェックして」`,

  minutes: `「{program}」の制作会議の議事録を作成します。
文字起こしテキストを貼り付けていただければ、議事録形式に整形します。

どのような形式で出力しますか？
例：「決定事項だけ箇条書きで」「Markdown形式で」「TODOリストを抽出して」「話者を判定して整形して」`,
};

/**
 * ウェルカムメッセージを取得
 *
 * @param featureId - 機能ID
 * @param programName - 番組名
 * @returns ウェルカムメッセージ（該当機能がない場合は空文字）
 */
export function getWelcomeMessage(featureId: string, programName: string): string {
  const template = WELCOME_TEMPLATES[featureId];
  if (!template) {
    return "";
  }

  return template.replace("{program}", programName);
}

/**
 * ウェルカムメッセージが定義されている機能かチェック
 *
 * @param featureId - 機能ID
 * @returns 定義されていればtrue
 */
export function hasWelcomeMessage(featureId: string): boolean {
  return featureId in WELCOME_TEMPLATES;
}
