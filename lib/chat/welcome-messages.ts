/**
 * 番組選択時のウェルカムメッセージ（シンプル版）
 *
 * ユーザーが番組セレクターで番組を選択した際に、
 * エージェントが瞬時に表示するメッセージを定義
 */

/** 機能ID → メッセージテンプレート */
/** 番組選択不要の機能のウェルカムメッセージ */
const NO_PROGRAM_WELCOME_MESSAGES: Record<string, string> = {
  "research-evidence": `情報のファクトチェックを行います。チェックしたい内容を入力してください。
  
  エビデンスがあるかどうかを判定し、根拠となるURLをつけて回答します。`,
};

/** 番組選択が必要な機能のウェルカムメッセージ */
const WELCOME_TEMPLATES: Record<string, string> = {
  "general-chat": `私はUnited Productionsの制作するレギュラー番組の情報を学習したAIです。番組の企画案、出演者についての相談、業界のトレンドなど——知りたいことを何でもお聞かせください。`,

  "research-cast": `「{program}」の出演者候補を探します。

どのような方向性で出演者をお探しですか？
`,

  proposal: `「新しい企画を一緒に考えましょう。どんな企画のアイデアを出してほしいですか？
  `,

  minutes: `「会議の文字起こしから議事録を作成します。

【使い方】
1. Zoomなどの文字起こしテキストを貼り付けて送信してください。テキストをチャットに直接貼ってもいいですし、VTT形式・TXT形式のファイルをアップロードも可能です。
2. 必要に応じて、チャットで議事録の出力形式を指定してください（指定がない場合は標準形式で出力します）
3. 議事録に整形して出力します
`,
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
