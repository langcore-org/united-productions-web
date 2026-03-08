/**
 * 番組選択時のウェルカムメッセージ（シンプル版）
 *
 * ユーザーが番組セレクターで番組を選択した際に、
 * エージェントが瞬時に表示するメッセージを定義
 */

/** 機能ID → メッセージテンプレート */
/** 番組選択不要の機能のウェルカムメッセージ */
const NO_PROGRAM_WELCOME_MESSAGES: Record<string, string> = {
  "research-evidence": `情報のファクトチェックを行います。
噂やSNSで話題の情報、出典の不明なデータなど、真偽を確認したい情報を調査します。

どのような情報をファクトチェックしますか？
例：「SNSで話題のこの情報は本当？」「視聴率〇〇％というデータの出典を確認して」「〇〇さんが番組に出演したという噂を検証して」`,
};

/** 番組選択が必要な機能のウェルカムメッセージ */
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

  minutes: `「{program}」の制作会議の議事録を作成します。

【使い方】
1. ZoomやPremiere Proなどの文字起こしテキストを貼り付けてください
2. 必要に応じて出力形式を指定してください（指定がない場合は標準形式で出力します）
3. 議事録に整形して出力します

【出力形式の例】
・標準議事録（出席者、議題、決定事項、次回予定）
・決定事項のみ箇条書き
・TODOリストだけ抽出
・話者を判定して整形
・Markdown形式`,
};

/**
 * ウェルカムメッセージを取得
 *
 * @param featureId - 機能ID
 * @param programName - 番組名（番組選択が必要な機能の場合）
 * @returns ウェルカムメッセージ（該当機能がない場合は空文字）
 */
export function getWelcomeMessage(featureId: string, programName?: string): string {
  // 番組選択不要のメッセージを先にチェック
  const noProgramMessage = NO_PROGRAM_WELCOME_MESSAGES[featureId];
  if (noProgramMessage) {
    return noProgramMessage;
  }

  // 番組選択が必要なメッセージ
  const template = WELCOME_TEMPLATES[featureId];
  if (!template) {
    return "";
  }

  return template.replace("{program}", programName ?? "指定なし");
}

/**
 * ウェルカムメッセージが定義されている機能かチェック
 * （番組選択が必要かどうかも判定）
 *
 * @param featureId - 機能ID
 * @returns 定義されていればtrue
 */
export function hasWelcomeMessage(featureId: string): boolean {
  return featureId in WELCOME_TEMPLATES || featureId in NO_PROGRAM_WELCOME_MESSAGES;
}

/**
 * 番組選択が必要な機能かチェック
 *
 * @param featureId - 機能ID
 * @returns 番組選択が必要ならtrue
 */
export function needsProgramSelection(featureId: string): boolean {
  return featureId in WELCOME_TEMPLATES;
}
