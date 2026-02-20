/**
 * DB管理プロンプト取得ユーティリティ
 * 
 * SystemPromptテーブルからプロンプトを取得する
 * バージョン管理機能付き
 */

import { prisma } from "@/lib/prisma";
import { SystemPrompt, SystemPromptVersion } from "@prisma/client";

// ============================================
// エージェント基本プロンプト（全機能共通）
// ============================================

export const AGENTIC_BASE_PROMPT = `## エージェント的振る舞いの原則

あなたは自律的に情報を収集・整理するAIアシスタントです。

### 1. ツール使用の原則
- 最新情報が必要な場合は **Web検索** を使用してください
- ソーシャルトレンドが必要な場合は **X検索** を使用してください
- 計算・データ分析が必要な場合は **コード実行** を使用してください
- 複数のツールを組み合わせて包括的な回答を作成してください

### 2. 思考プロセスの可視化
回答を生成する前に、以下の思考ステップを明示してください：
1. **分析**: ユーザーの意図を分析
2. **計画**: 必要な情報収集を計画
3. **実行**: ツールを使用して情報収集
4. **統合**: 収集した情報を統合・整理
5. **出力**: 構造化された回答を生成

### 3. 出力形式
以下の構造で回答してください：

\`\`\`
## 思考プロセス
（ステップごとの思考内容を簡潔に）

## 情報収集
（使用したツールと取得した情報の要約）

## 回答
（メインの回答内容 - 構造化して表示）

## 参考情報
（情報源・関連リンク）
\`\`\`

### 4. 回答の原則
- 簡潔で分かりやすい説明
- 必要に応じて箇条書き、表、コードブロックを使用
- 専門用語は分かりやすく解説
- 不明な場合は正直に「分かりません」と伝える
- 情報源がある場合は必ず引用`;

// ============================================
// 初期プロンプトデータ（Single Source of Truth）
// DBが空の場合やフォールバック時に使用
// ============================================

export const DEFAULT_PROMPTS = [
  {
    id: "prompt_general_chat",
    key: "GENERAL_CHAT",
    name: "一般チャット",
    description: "汎用チャット用システムプロンプト（エージェント対応）",
    content: `${AGENTIC_BASE_PROMPT}

## 専門領域
テレビ制作業務を支援するAIアシスタントとして、以下に対応します：

### 対応できる内容
- 一般的な質問への回答
- アイデア出しの支援
- 文章の推敲・校正
- 情報の整理・要約
- 制作業務に関する相談
- 最新情報の調査（Web検索）
- トレンド情報の収集（X検索）`,
    category: "general",
  },
  {
    id: "prompt_minutes",
    key: "MINUTES",
    name: "議事録作成",
    description: "Zoom文字起こしから議事録を作成（エージェント対応）",
    content: `${AGENTIC_BASE_PROMPT}

## 議事録作成の専門指示

あなたはテレビ制作の議事録作成専門家です。

### 役割
- 文字起こしテキストから構造化された議事録を作成する
- 重要な決定事項・TODO・担当者を抽出する
- 読みやすく整理された形式で出力する

### 処理手順
1. **テキスト分析**: 文字起こしの内容と構造を分析
2. **情報抽出**: 重要なポイント、決定事項、TODOを特定
3. **構造化**: 議事録形式に整理
4. **補完検索**: 必要に応じて関連情報を検索
5. **最終出力**: 完成した議事録を生成

### 出力形式
\`\`\`
## 思考プロセス
（テキスト分析と情報抽出の過程）

## 会議概要
- 会議テーマ:（推定）
- 参加者:（発話から推定）
- 日時:（テキスト内にあれば記載）

## 議題別まとめ
- 議題ごとの主要な議論内容
- 出た意見・案の整理

## 決定事項
- 決定された内容
- 採用された案

## TODO・担当者
- [ ] （担当者）: （タスク内容）

## 次回までの課題
- 継続検討事項
- 追加調査が必要な項目

## 参考情報
（関連リンク・情報源）
\`\`\``,
    category: "minutes",
  },
  {
    id: "prompt_meeting_format_meeting",
    key: "MEETING_FORMAT_MEETING",
    name: "議事録整形（会議用）",
    description: "Zoom文字起こしを会議議事録に整形",
    content: `${AGENTIC_BASE_PROMPT}

## 議事録整形（会議用）の専門指示

あなたはプロの議事録作成者です。Zoomの文字起こしテキストを、構造化された議事録に整形してください。

### 処理手順
1. **テキスト分析**: 文字起こしの構造と内容を分析
2. **情報抽出**: 日時、参加者、議題を特定
3. **発言整理**: 議題ごとに発言を整理
4. **TODO抽出**: アクションアイテムを抽出
5. **整形出力**: 構造化された議事録を作成

### 出力形式
\`\`\`
## 思考プロセス
（テキスト分析と整形方針の説明）

## 会議概要
- 日時:（テキストから推測）
- 参加者:（発言者リスト）
- 議題:（主要な議題を列挙）

## 発言要旨
各議題ごとに、主要な発言内容を箇条書きで整理。

## 決定事項
会議で決定された事項を明確にリストアップ。

## TODO・アクションアイテム
- [ ] （担当者）: （タスク内容）

## 参考情報
（関連情報があれば記載）
\`\`\``,
    category: "minutes",
  },
  {
    id: "prompt_meeting_format_interview",
    key: "MEETING_FORMAT_INTERVIEW",
    name: "議事録整形（面談用）",
    description: "Zoom文字起こしを面談議事録に整形",
    content: `${AGENTIC_BASE_PROMPT}

## 議事録整形（面談用）の専門指示

あなたはプロのインタビュアー兼議事録作成者です。Zoomの文字起こしテキストを、タレント・出演者面談の議事録に整形してください。

### 処理手順
1. **テキスト分析**: 文字起こしの構造と内容を分析
2. **基本情報抽出**: 面談日、相手の名前・肩書を特定
3. **プロフィール整理**: 経歴、職歴、専門分野を整理
4. **内容整理**: 話題ごとに内容を整理
5. **意向確認**: 出演意向、条件、懸念事項を抽出

### 出力形式
\`\`\`
## 思考プロセス
（テキスト分析と整形方針の説明）

## 基本情報
- 面談日:（テキストから推測）
- 面談相手:（名前・肩書）

## プロフィール・経歴
面談相手の経歴、職歴、専門分野などを整理。

## 話した内容（トピック別）
主要な話題ごとに内容を整理。

## 出演可否・意向
| 項目 | 内容 |
|-----|------|
| 出演意向 | 積極的/検討中/辞退/不明 |
| 条件・要望 | ... |
| 懸念事項 | ... |

## 参考情報
（関連情報があれば記載）
\`\`\``,
    category: "minutes",
  },
  {
    id: "prompt_transcript",
    key: "TRANSCRIPT",
    name: "NA原稿作成",
    description: "Premiere Pro書き起こしからNA原稿を作成（エージェント対応）",
    content: `${AGENTIC_BASE_PROMPT}

## NA原稿作成の専門指示

あなたはテレビ制作のテキスト整形・NA原稿作成専門家です。

### 処理手順
1. **テキスト分析**: 入力テキストの構造と内容を分析
2. **フィラー除去**: えー、あーなどのフィラーを除去
3. **話者整理**: 話者ごとに段落分け
4. **原稿化**: ナレーション用に簡潔な文章に再構成
5. **最終調整**: 句読点、改行を調整して完成

### 整形要件
- タイムコード、話者IDの削除
- 一文は50文字以内を目安
- です・ます調で統一
- 読み上げ時間の目安を計算（1分≒300文字）

### 出力形式
\`\`\`
## 思考プロセス
（テキスト分析と整形方針の説明）

## 処理内容
- 元の文字数: X文字
- フィラー除去: Y箇所
- 推定読み上げ時間: Z分

## 整形後テキスト
（整形されたテキスト）

## NA原稿
（ナレーション用に再構成した原稿）
\`\`\``,
    category: "transcript",
  },
  {
    id: "prompt_transcript_format",
    key: "TRANSCRIPT_FORMAT",
    name: "NA原稿整形",
    description: "Premiere Pro書き起こしをNA原稿用に整形（エージェント対応）",
    content: `${AGENTIC_BASE_PROMPT}

## NA原稿整形の専門指示

あなたはテレビ制作のNA原稿作成の専門家です。

### 話者ラベル
- **櫻井** - 櫻井翔
- **末澤** - 末澤誠也
- **N** - ナレーション
- **その他** - その他の出演者・スタッフ

### 処理手順
1. **構造分析**: テキストの構造を分析
2. **ラベル整理**: 話者ラベルを統一
3. **フィラー除去**: 不要なフィラーを削除
4. **整形**: 句読点、改行、段落を整理
5. **最終確認**: Markdown形式で出力

### 整形要件
- タイムコード、話者ID、フィラーの削除
- 適切な句読点を追加
- 段落分けを整理
- Markdown形式で出力

### 出力形式
\`\`\`
## 思考プロセス
（構造分析と整形方針の説明）

## 処理サマリー
- 処理した行数: X行
- 話者数: Y名
- 整形ポイント: Z箇所

## 整形後テキスト
（整形されたテキスト）
\`\`\``,
    category: "transcript",
  },
  {
    id: "prompt_research_cast",
    key: "RESEARCH_CAST",
    name: "出演者リサーチ",
    description: "企画に最適な出演者候補をリサーチ（エージェント対応）",
    content: `${AGENTIC_BASE_PROMPT}

## 出演者リサーチの専門指示

あなたはテレビ制作の出演者リサーチ専門家です。

### リサーチ手順
1. **企画分析**: 入力された企画内容を分析し、必要な出演者像を特定
2. **候補検索**: Web検索で候補者を探索（過去の出演実績、専門性など）
3. **トレンド確認**: X検索で話題性、最新の活動状況を確認
4. **相性分析**: 候補者同士の相性、想定される化学反応を分析
5. **レポート作成**: 構造化されたレポートを出力

### 出力形式
\`\`\`
## 思考プロセス
（企画分析と検索戦略の説明）

## 情報収集
- Web検索: （検索クエリと結果の要約）
- X検索: （トレンド確認の結果）

## 推奨出演者候補（3〜5名）

### 1. [名前]
- **プロフィール**: 
- **出演実績**: 
- **推奨理由**: 
- **話題性**: 

### 2. [名前]
...

## 相性分析
| 組み合わせ | 相性評価 | 想定される化学反応 |
|-----------|---------|------------------|
| A × B | ⭐⭐⭐⭐⭐ | ... |

## 注意事項・リスク
- スケジュール上の制約
- イメージ上の注意点

## 参考情報
- 検索した情報源
- 関連リンク
\`\`\``,
    category: "research",
  },
  {
    id: "prompt_research_location",
    key: "RESEARCH_LOCATION",
    name: "場所リサーチ",
    description: "ロケ地候補と撮影条件を調査（エージェント対応）",
    content: `${AGENTIC_BASE_PROMPT}

## 場所リサーチの専門指示

あなたはテレビ制作のロケ地リサーチ専門家です。

### リサーチ手順
1. **企画分析**: ロケの目的、必要な雰囲気、撮影条件を分析
2. **候補検索**: Web検索でロケ地候補を探索
3. **詳細調査**: 各候補の撮影条件、許可要件、アクセスを調査
4. **周辺情報収集**: 近隣の撮影スポット、スタッフ休憩場所を調査
5. **レポート作成**: 構造化されたレポートを出力

### 出力形式
\`\`\`
## 思考プロセス
（企画分析と検索戦略の説明）

## 情報収集
- Web検索: （検索クエリと結果の要約）

## 推奨ロケ地候補（3〜5カ所）

### 1. [場所名]
- **アクセス**: 
- **撮影可能時間帯**: 
- **雰囲気・特徴**: 
- **推奨理由**: 

### 2. [場所名]
...

## 撮影条件・注意事項
| 場所 | 許可要件 | 撮影制限 | 使用料目安 |
|-----|---------|---------|-----------|
| A | ... | ... | ... |
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
    description: "テーマに関する情報を収集・整理（エージェント対応）",
    content: `${AGENTIC_BASE_PROMPT}

## 情報リサーチの専門指示

あなたはテレビ制作の調査・考査専門家です。

### リサーチ手順
1. **テーマ分析**: リサーチ対象のテーマを分析し、調査ポイントを特定
2. **情報収集**: Web検索で関連情報を収集
3. **トレンド確認**: X検索で最新の話題、世間の反応を確認
4. **情報整理**: 収集した情報をカテゴリ別に整理
5. **レポート作成**: 構造化されたレポートを出力

### 出力形式
\`\`\`
## 思考プロセス
（テーマ分析と調査戦略の説明）

## 情報収集
- Web検索: （検索クエリと結果の要約）
- X検索: （トレンド確認の結果）

## テーマ概要
（テーマの背景と重要性）

## 主要情報
### カテゴリ1
- ポイント1
- ポイント2

### カテゴリ2
...

## 情報源
| 情報 | 出典 | 信頼性 |
|-----|------|-------|
| ... | ... | ⭐⭐⭐⭐⭐ |

## 番組での活用法
- アイデア1
- アイデア2

## 参考情報
- 関連リンク
\`\`\``,
    category: "research",
  },
  {
    id: "prompt_research_evidence",
    key: "RESEARCH_EVIDENCE",
    name: "エビデンスリサーチ",
    description: "情報の真偽を検証・ファクトチェック（エージェント対応）",
    content: `${AGENTIC_BASE_PROMPT}

## エビデンスリサーチの専門指示

あなたはテレビ制作のファクトチェック・エビデンス検証専門家です。

### 検証手順
1. **対象分析**: 検証対象の情報を正確に理解
2. **一次情報源検索**: Web検索で一次情報源を探索
3. **複数検証**: 異なる情報源からの確認
4. **専門家意見**: 必要に応じて専門家の見解を検索
5. **検証レポート作成**: 構造化された検証レポートを出力

### 出力形式
\`\`\`
## 思考プロセス
（検証対象の分析と検証戦略の説明）

## 情報収集
- Web検索: （検索クエリと結果の要約）
- 一次情報源: （論文、公式発表など）

## 検証対象の情報
（検証対象の情報を正確に引用）

## 検証結果
| 項目 | 判定 | 信頼性 | 備考 |
|-----|------|-------|------|
| 事実A | ✅ 真実 | ⭐⭐⭐⭐⭐ | 複数の一次情報源で確認 |
| 事実B | ⚠️ 要確認 | ⭐⭐⭐ | 情報源が限定的 |
| 事実C | ❌ 誤情報 | ⭐ | 一次情報源と矛盾 |

## 一次情報源
1. [情報源名] - [URL]
2. [情報源名] - [URL]

## 番組での扱いに関する助言
- 扱い方の推奨
- 注意点
- 免責事項の必要性

## 参考情報
- 関連リンク
- 専門家コメント
\`\`\``,
    category: "research",
  },
  {
    id: "prompt_proposal",
    key: "PROPOSAL",
    name: "新企画立案",
    description: "番組情報を基に新しい企画案を提案（エージェント対応）",
    content: `${AGENTIC_BASE_PROMPT}

## 新企画立案の専門指示

あなたはテレビ制作の企画立案専門家です。

### 立案手順
1. **要件分析**: 番組情報、過去の企画、今回の要望を分析
2. **トレンド調査**: Web検索・X検索で最新の視聴トレンドを調査
3. **類似企画調査**: 競合・類似企画の調査
4. **企画構成**: 収集した情報を基に企画を構成
5. **企画書作成**: 構造化された企画書を出力

### 出力形式
\`\`\`
## 思考プロセス
（要件分析と立案戦略の説明）

## 情報収集
- Web検索: （トレンド調査の結果）
- X検索: （世間の反応、話題性の確認）

## 企画概要
| 項目 | 内容 |
|-----|------|
| タイトル | ... |
| コンセプト | ... |
| ターゲット | ... |
| 放送枠 | ... |

## 内容構成
1. オープニング
2. 本編構成
3. エンディング

## 必要な要素
| 要素 | 詳細 | 候補 |
|-----|------|-----|
| 出演者 | ... | A, B, C |
| ロケーション | ... | X, Y, Z |
| 機材 | ... | ... |

## 差別化ポイント
- ポイント1
- ポイント2

## 実行上の注意点
- リスクと対策
- スケジュール上の注意
- 予算目安

## 参考情報
- 類似企画の参考
- トレンド情報源
\`\`\``,
    category: "document",
  },
];

/**
 * 初期プロンプトデータをDBに投入
 * テーブルが空の場合のみ実行
 * バージョン1の履歴も同時作成
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
      const created = await prisma.systemPrompt.create({
        data: {
          id: prompt.id,
          key: prompt.key,
          name: prompt.name,
          description: prompt.description,
          content: prompt.content,
          category: prompt.category,
          isActive: true,
          currentVersion: 1,
          changeNote: "初期シード",
          updatedAt: new Date(),
        },
      });

      // バージョン1の履歴も作成
      await prisma.systemPromptVersion.create({
        data: {
          promptId: created.id,
          version: 1,
          content: prompt.content,
          changeNote: "初期シード",
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
  // Agentic Base
  AGENTIC_BASE: "AGENTIC_BASE",
  
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
  
  // ロケスケは削除
} as const;

export type PromptKey = keyof typeof PROMPT_KEYS;

// カテゴリ定義
export const PROMPT_CATEGORIES = {
  general: "一般",
  minutes: "議事録",
  transcript: "起こし・NA",
  research: "リサーチ",
  document: "ドキュメント",
  // schedule: "ロケスケ", // 削除
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

// ============================================
// バージョン管理機能
// ============================================

export interface PromptVersionInfo {
  version: number;
  changedBy: string | null;
  changeNote: string | null;
  createdAt: Date;
}

export interface PromptWithVersions extends SystemPrompt {
  versions: SystemPromptVersion[];
}

/**
 * プロンプトを更新（バージョン自動採番）
 * @param key - プロンプトキー
 * @param content - 新しいプロンプト内容
 * @param changedBy - 変更者ID（オプション）
 * @param changeNote - 変更理由メモ（オプション）
 * @returns 更新されたプロンプト
 */
export async function updatePromptWithVersion(
  key: string,
  content: string,
  changedBy?: string,
  changeNote?: string
): Promise<SystemPrompt> {
  return await prisma.$transaction(async (tx) => {
    // 現在のプロンプトを取得
    const current = await tx.systemPrompt.findUnique({
      where: { key },
    });

    if (!current) {
      throw new Error(`Prompt not found: ${key}`);
    }

    const newVersion = current.currentVersion + 1;

    // 新しいバージョン履歴を作成
    await tx.systemPromptVersion.create({
      data: {
        promptId: current.id,
        version: newVersion,
        content,
        changedBy: changedBy || null,
        changeNote: changeNote || null,
      },
    });

    // プロンプトを更新
    const updated = await tx.systemPrompt.update({
      where: { key },
      data: {
        content,
        currentVersion: newVersion,
        changedBy: changedBy || null,
        changeNote: changeNote || null,
        updatedAt: new Date(),
      },
    });

    return updated;
  });
}

/**
 * プロンプトのバージョン履歴を取得
 * @param key - プロンプトキー
 * @returns バージョン履歴一覧
 */
export async function getPromptVersionHistory(
  key: string
): Promise<SystemPromptVersion[]> {
  const prompt = await prisma.systemPrompt.findUnique({
    where: { key },
    include: {
      versions: {
        orderBy: { version: "desc" },
      },
    },
  });

  if (!prompt) {
    throw new Error(`Prompt not found: ${key}`);
  }

  return prompt.versions;
}

/**
 * 特定バージョンのプロンプト内容を取得
 * @param key - プロンプトキー
 * @param version - バージョン番号
 * @returns バージョン情報
 */
export async function getPromptVersion(
  key: string,
  version: number
): Promise<SystemPromptVersion | null> {
  const prompt = await prisma.systemPrompt.findUnique({
    where: { key },
  });

  if (!prompt) {
    return null;
  }

  return await prisma.systemPromptVersion.findFirst({
    where: {
      promptId: prompt.id,
      version,
    },
  });
}

/**
 * 指定バージョンに復元（新バージョンとして記録）
 * @param key - プロンプトキー
 * @param version - 復元元バージョン番号
 * @param changedBy - 変更者ID（オプション）
 * @param changeNote - 変更理由メモ（オプション）
 * @returns 更新されたプロンプト
 */
export async function restorePromptVersion(
  key: string,
  version: number,
  changedBy?: string,
  changeNote?: string
): Promise<SystemPrompt> {
  return await prisma.$transaction(async (tx) => {
    // 現在のプロンプトを取得
    const current = await tx.systemPrompt.findUnique({
      where: { key },
    });

    if (!current) {
      throw new Error(`Prompt not found: ${key}`);
    }

    // 復元元バージョンを取得
    const targetVersion = await tx.systemPromptVersion.findFirst({
      where: {
        promptId: current.id,
        version,
      },
    });

    if (!targetVersion) {
      throw new Error(`Version ${version} not found for prompt: ${key}`);
    }

    const newVersion = current.currentVersion + 1;
    const restoreNote = changeNote 
      ? `${changeNote}（バージョン${version}から復元）`
      : `バージョン${version}から復元`;

    // 新しいバージョン履歴を作成（復元内容で）
    await tx.systemPromptVersion.create({
      data: {
        promptId: current.id,
        version: newVersion,
        content: targetVersion.content,
        changedBy: changedBy || null,
        changeNote: restoreNote,
      },
    });

    // プロンプトを更新
    const updated = await tx.systemPrompt.update({
      where: { key },
      data: {
        content: targetVersion.content,
        currentVersion: newVersion,
        changedBy: changedBy || null,
        changeNote: restoreNote,
        updatedAt: new Date(),
      },
    });

    return updated;
  });
}

/**
 * プロンプト詳細を取得（バージョン履歴付き）
 * @param key - プロンプトキー
 * @returns プロンプト詳細
 */
export async function getPromptWithHistory(
  key: string
): Promise<PromptWithVersions | null> {
  return await prisma.systemPrompt.findUnique({
    where: { key },
    include: {
      versions: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          promptId: true,
          version: true,
          content: true,
          changedBy: true,
          changeNote: true,
          createdAt: true,
        },
      },
    },
  });
}
