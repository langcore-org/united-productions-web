/**
 * DB管理プロンプト取得ユーティリティ
 * 
 * SystemPromptテーブルからプロンプトを取得する
 */

import { prisma } from "@/lib/prisma";
import { SystemPrompt } from "@prisma/client";

// 初期プロンプトデータ
const DEFAULT_PROMPTS = [
  {
    id: "prompt_general_chat",
    key: "GENERAL_CHAT",
    name: "一般チャット",
    description: "汎用チャット用システムプロンプト",
    content: `## AIアシスタント

あなたはテレビ制作業務を支援するAIアシスタントです。
ユーザーの質問や相談に対して、丁寧かつ簡潔に回答してください。

### 対応できる内容
- 一般的な質問への回答
- アイデア出しの支援
- 文章の推敲・校正
- 情報の整理・要約
- 制作業務に関する相談

### 回答の原則
- 簡潔で分かりやすい説明
- 必要に応じて箇条書きを使用
- 専門用語は分かりやすく解説
- 不明な場合は正直に「分かりません」と伝える`,
    category: "general",
  },
  {
    id: "prompt_minutes",
    key: "MINUTES",
    name: "議事録作成",
    description: "Zoom文字起こしから議事録を作成",
    content: `## 議事録作成

あなたはテレビ制作の議事録作成専門家です。

### 役割
- 文字起こしテキストから構造化された議事録を作成する
- 重要な決定事項・TODO・担当者を抽出する
- 読みやすく整理された形式で出力する

### 出力形式
1. **会議概要**
   - 会議テーマ（推定）
   - 参加者（発話から推定）
   - 日時（テキスト内にあれば記載）

2. **議題別まとめ**
   - 議題ごとの主要な議論内容
   - 出た意見・案の整理

3. **決定事項**
   - 決定された内容
   - 採用された案

4. **TODO・担当者**
   - タスク内容
   - 担当者（特定できれば）
   - 期限（言及されていれば）

5. **次回までの課題**
   - 継続検討事項
   - 追加調査が必要な項目`,
    category: "minutes",
  },
  {
    id: "prompt_meeting_format_meeting",
    key: "MEETING_FORMAT_MEETING",
    name: "議事録整形（会議用）",
    description: "Zoom文字起こしを会議議事録に整形",
    content: `あなたはプロの議事録作成者です。Zoomの文字起こしテキストを、構造化された議事録に整形してください。

### 1. 会議概要
- 日時:（テキストから推測）
- 参加者:（発言者リスト）
- 議題:（主要な議題を列挙）

### 2. 発言要旨
各議題ごとに、主要な発言内容を箇条書きで整理してください。

### 3. 決定事項
会議で決定された事項を明確にリストアップしてください。

### 4. TODO・アクションアイテム
担当者と期限を含めてリストアップしてください。`,
    category: "minutes",
  },
  {
    id: "prompt_meeting_format_interview",
    key: "MEETING_FORMAT_INTERVIEW",
    name: "議事録整形（面談用）",
    description: "Zoom文字起こしを面談議事録に整形",
    content: `あなたはプロのインタビュアー兼議事録作成者です。Zoomの文字起こしテキストを、タレント・出演者面談の議事録に整形してください。

### 1. 基本情報
- 面談日:（テキストから推測）
- 面談相手:（名前・肩書）

### 2. プロフィール・経歴
面談相手の経歴、職歴、専門分野などを整理してください。

### 3. 話した内容（トピック別）
主要な話題ごとに内容を整理してください。

### 4. 出演可否・意向
- 出演意向:（積極的/検討中/辞退/不明）
- 条件・要望
- 懸念事項`,
    category: "minutes",
  },
  {
    id: "prompt_transcript",
    key: "TRANSCRIPT",
    name: "NA原稿作成",
    description: "Premiere Pro書き起こしからNA原稿を作成",
    content: `## 文字起こしアシスタント

あなたはテレビ制作のテキスト整形・NA原稿作成専門家です。

### モード1: フォーマット変換
- フィラー（えー、あーなど）の除去
- 話者ごとの段落分け
- 適切な句読点と改行の挿入

### モード2: NA原稿作成
- ナレーション用に簡潔な文章に再構成
- 一文は50文字以内を目安
- です・ます調で統一
- 読み上げ時間の目安を計算（1分≒300文字）`,
    category: "transcript",
  },
  {
    id: "prompt_transcript_format",
    key: "TRANSCRIPT_FORMAT",
    name: "NA原稿整形",
    description: "Premiere Pro書き起こしをNA原稿用に整形",
    content: `あなたはテレビ制作のNA原稿作成の専門家です。

### 話者ラベル
- **櫻井** - 櫻井翔
- **末澤** - 末澤誠也
- **N** - ナレーション
- **その他** - その他の出演者・スタッフ

### 整形要件
1. タイムコード、話者ID、フィラーの削除
2. 適切な句読点を追加
3. 段落分けを整理
4. Markdown形式で出力`,
    category: "transcript",
  },
  {
    id: "prompt_research_cast",
    key: "RESEARCH_CAST",
    name: "出演者リサーチ",
    description: "企画に最適な出演者候補をリサーチ",
    content: `## 出演者リサーチ

あなたはテレビ制作の出演者リサーチ専門家です。

### 出力形式
1. **推奨出演者候補**（3〜5名）
   - 名前、プロフィール、出演実績、推奨理由

2. **出演者の相性分析**
   - 候補同士の相性
   - 想定される化学反応

3. **注意事項・リスク**
   - スケジュール上の制約
   - イメージ上の注意点`,
    category: "research",
  },
  {
    id: "prompt_research_location",
    key: "RESEARCH_LOCATION",
    name: "場所リサーチ",
    description: "ロケ地候補と撮影条件を調査",
    content: `## 場所リサーチ

あなたはテレビ制作のロケ地リサーチ専門家です。

### 出力形式
1. **推奨ロケ地候補**（3〜5カ所）
   - 場所名、アクセス、撮影可能時間帯

2. **撮影条件・注意事項**
   - 許可要件
   - 撮影制限
   - 使用料の目安

3. **周辺情報**
   - 近隣の撮影スポット
   - スタッフの休憩・食事場所`,
    category: "research",
  },
  {
    id: "prompt_research_info",
    key: "RESEARCH_INFO",
    name: "情報リサーチ",
    description: "テーマに関する情報を収集・整理",
    content: `## 情報リサーチ

あなたはテレビ制作の調査・考査専門家です。

### 出力形式
1. **テーマ概要**
2. **主要情報**
3. **情報源**
4. **番組での活用法**`,
    category: "research",
  },
  {
    id: "prompt_research_evidence",
    key: "RESEARCH_EVIDENCE",
    name: "エビデンスリサーチ",
    description: "情報の真偽を検証・ファクトチェック",
    content: `## エビデンスリサーチ

あなたはテレビ制作のファクトチェック・エビデンス検証専門家です。

### 出力形式
1. **検証対象の情報**
2. **検証結果**（真実・誤情報・要確認）
3. **一次情報源**
4. **番組での扱いに関する助言**`,
    category: "research",
  },
  {
    id: "prompt_proposal",
    key: "PROPOSAL",
    name: "新企画立案",
    description: "番組情報を基に新しい企画案を提案",
    content: `## 新企画立案

あなたはテレビ制作の企画立案専門家です。

### 出力形式
1. **企画概要**（タイトル、コンセプト、ターゲット）
2. **内容構成**
3. **必要な要素**（出演者、ロケーション、機材）
4. **差別化ポイント**
5. **実行上の注意点**`,
    category: "document",
  },
  {
    id: "prompt_schedule_system",
    key: "SCHEDULE_SYSTEM",
    name: "ロケスケジュール基本",
    description: "ロケスケジュール生成の基本プロンプト",
    content: `あなたはテレビ制作のロケスケジュール管理の専門家です。
マスタースケジュールから、指定された形式のスケジュール表を生成してください。

【重要なルール】
1. 入力された情報を正確に反映
2. 時刻、場所、担当者名は特に正確に転記
3. 不足情報は「未定」と記載
4. マークダウンのテーブル記法を使用`,
    category: "schedule",
  },
  {
    id: "prompt_schedule_actor",
    key: "SCHEDULE_ACTOR",
    name: "演者別スケジュール",
    description: "マスタースケジュールから演者別スケジュールを生成",
    content: `演者別のスケジュール表を生成してください。

【出力項目】
1. 演者名
2. 集合時刻・場所
3. 移動手段
4. 現場到着時刻
5. 本番時間
6. 移動先
7. 備考（衣装、持ち物など）`,
    category: "schedule",
  },
  {
    id: "prompt_schedule_staff",
    key: "SCHEDULE_STAFF",
    name: "香盤表（スタッフ動き）",
    description: "マスタースケジュールから香盤表を生成",
    content: `香盤表（スタッフ動き表）を生成してください。

【出力項目】
1. 時間帯（縦軸）
2. スタッフ職種（横軸）
3. 各スタッフの動き`,
    category: "schedule",
  },
  {
    id: "prompt_schedule_vehicle",
    key: "SCHEDULE_VEHICLE",
    name: "車両表",
    description: "マスタースケジュールから車両表を生成",
    content: `車両表を生成してください。

【出力項目】
1. 車両番号・種別
2. 運転手・車掌
3. 乗車人员
4. 行程
5. 時刻
6. 用途`,
    category: "schedule",
  },
];

/**
 * 初期プロンプトデータをDBに投入
 * テーブルが空の場合のみ実行
 */
export async function seedPrompts(): Promise<void> {
  try {
    const count = await prisma.systemPrompt.count();
    if (count > 0) {
      console.log("Prompts already seeded, skipping...");
      return;
    }

    console.log("Seeding prompts...");
    for (const prompt of DEFAULT_PROMPTS) {
      await prisma.systemPrompt.create({
        data: {
          ...prompt,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    }
    console.log(`Seeded ${DEFAULT_PROMPTS.length} prompts`);
  } catch (error) {
    console.error("Failed to seed prompts:", error);
    throw error;
  }
}

// カテゴリ別プロンプトキー
export const PROMPT_KEYS = {
  // General
  GENERAL_CHAT: "GENERAL_CHAT",
  
  // Minutes
  MINUTES: "MINUTES",
  MEETING_FORMAT_MEETING: "MEETING_FORMAT_MEETING",
  MEETING_FORMAT_INTERVIEW: "MEETING_FORMAT_INTERVIEW",
  
  // Transcript
  TRANSCRIPT: "TRANSCRIPT",
  TRANSCRIPT_FORMAT: "TRANSCRIPT_FORMAT",
  
  // Research
  RESEARCH_CAST: "RESEARCH_CAST",
  RESEARCH_LOCATION: "RESEARCH_LOCATION",
  RESEARCH_INFO: "RESEARCH_INFO",
  RESEARCH_EVIDENCE: "RESEARCH_EVIDENCE",
  
  // Document
  PROPOSAL: "PROPOSAL",
  
  // Schedule
  SCHEDULE_SYSTEM: "SCHEDULE_SYSTEM",
  SCHEDULE_ACTOR: "SCHEDULE_ACTOR",
  SCHEDULE_STAFF: "SCHEDULE_STAFF",
  SCHEDULE_VEHICLE: "SCHEDULE_VEHICLE",
} as const;

export type PromptKey = keyof typeof PROMPT_KEYS;

// カテゴリ定義
export const PROMPT_CATEGORIES = {
  general: "一般",
  minutes: "議事録",
  transcript: "起こし・NA",
  research: "リサーチ",
  document: "ドキュメント",
  schedule: "ロケスケ",
} as const;

export type PromptCategory = keyof typeof PROMPT_CATEGORIES;

/**
 * プロンプトをDBから取得
 * @param key - プロンプトキー
 * @returns プロンプト内容（見つからない場合はnull）
 */
export async function getPromptFromDB(key: string): Promise<string | null> {
  try {
    const prompt = await prisma.systemPrompt.findUnique({
      where: { key, isActive: true },
      select: { content: true },
    });
    return prompt?.content || null;
  } catch (error) {
    console.error(`Failed to fetch prompt "${key}":`, error);
    return null;
  }
}

/**
 * 複数のプロンプトを一括取得
 * @param keys - プロンプトキーの配列
 * @returns キーとプロンプト内容のマップ
 */
export async function getPromptsFromDB(keys: string[]): Promise<Record<string, string | null>> {
  try {
    const prompts = await prisma.systemPrompt.findMany({
      where: {
        key: { in: keys },
        isActive: true,
      },
      select: { key: true, content: true },
    });

    const result: Record<string, string | null> = {};
    for (const key of keys) {
      const prompt = prompts.find((p) => p.key === key);
      result[key] = prompt?.content || null;
    }
    return result;
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
    return Object.fromEntries(keys.map((k) => [k, null]));
  }
}

/**
 * カテゴリ別にプロンプト一覧を取得
 * @param category - カテゴリ名
 * @returns プロンプト一覧
 */
export async function getPromptsByCategory(category: string): Promise<SystemPrompt[]> {
  try {
    return await prisma.systemPrompt.findMany({
      where: { category, isActive: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error(`Failed to fetch prompts by category "${category}":`, error);
    return [];
  }
}

/**
 * 全プロンプトを取得
 * @returns 全プロンプト一覧
 */
export async function getAllPrompts(): Promise<SystemPrompt[]> {
  try {
    return await prisma.systemPrompt.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  } catch (error) {
    console.error("Failed to fetch all prompts:", error);
    return [];
  }
}

/**
 * フォールバック付きでプロンプトを取得
 * DBから取得できない場合はデフォルト値を返す
 * @param key - プロンプトキー
 * @param defaultValue - デフォルト値
 * @returns プロンプト内容
 */
export async function getPromptWithFallback(
  key: string,
  defaultValue: string
): Promise<string> {
  const content = await getPromptFromDB(key);
  return content || defaultValue;
}
