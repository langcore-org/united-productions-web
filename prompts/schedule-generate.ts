/**
 * ロケスケジュール自動生成プロンプト
 * 
 * マスタースケジュールから以下を自動生成:
 * - 演者別スケジュール
 * - 香盤表（スタッフ動き）
 * - 車両表
 */

import { LLMMessage } from "@/lib/llm/types";

/**
 * スケジュール生成タイプ
 */
export type ScheduleGenerateType = "actor" | "staff" | "vehicle";

/**
 * スケジュール生成リクエスト
 */
export interface ScheduleGenerateRequest {
  /** マスタースケジュール（テキスト形式） */
  masterSchedule: string;
  /** 生成タイプ */
  type: ScheduleGenerateType;
  /** 追加指示（オプション） */
  additionalInstructions?: string;
}

/**
 * システムプロンプト
 */
const SYSTEM_PROMPT = `あなたはテレビ制作のロケスケジュール管理の専門家です。
マスタースケジュールから、指定された形式のスケジュール表を生成してください。

【重要なルール】
1. 入力されたマスタースケジュールの情報を正確に反映すること
2. 時刻、場所、担当者名は特に正確に転記すること
3. 不足している情報は推測せず、「未定」または「確認中」と記載すること
4. 出力は日本語で、テレビ制作業界の標準的な表記を使用すること
5. 表形式で出力する場合は、マークダウンのテーブル記法を使用すること

【出力形式】
- マークダウン形式
- テーブルは | で区切る
- 時刻は HH:MM 形式（例: 09:00）
- 日付は MM/DD(曜日) 形式（例: 12/15(月)）`;

/**
 * 演者別スケジュール生成プロンプト
 */
const ACTOR_SCHEDULE_PROMPT = `以下のマスタースケジュールから、演者別のスケジュール表を生成してください。

【出力項目】
1. 演者名
2. 集合時刻・場所
3. 移動手段（車両名または移動方法）
4. 現場到着時刻
5. 本番時間（収録/ standby/ 解放時間）
6. 移動先（次の現場または帰宅）
7. 備考（衣装、持ち物、特記事項など）

【出力形式】
# 【演者名】スケジュール

## 基本情報
- 日付: YYYY/MM/DD
- 演者名: [名前]
- 担当AP: [名前]

## スケジュール詳細

| 時間 | 内容 | 場所 | 移動 | 備考 |
|------|------|------|------|------|
| 09:00 | 集合 | [場所] | - | [備考] |
| ... | ... | ... | ... | ... |

## 持ち物・衣装
- [項目]

## 注意事項
- [項目]

---

上記形式で、マスタースケジュールに記載されている全演者分を生成してください。`;

/**
 * 香盤表（スタッフ動き）生成プロンプト
 */
const STAFF_SCHEDULE_PROMPT = `以下のマスタースケジュールから、香盤表（スタッフ動き表）を生成してください。

【出力項目】
1. 時間帯（縦軸）
2. スタッフ職種（横軸）: 監督、AD、カメラ、音声、照明、美術、車掌、メイク、衣装など
3. 各スタッフの動き（集合、移動、現場作業、次現場、帰着など）

【出力形式】
# 香盤表（スタッフ動き）

## 基本情報
- 日付: YYYY/MM/DD
- 現場名: [名前]
- 収録内容: [内容]

## スタッフ一覧
- 監督: [名前]
- AD: [名前]
- カメラ: [名前]
- 音声: [名前]
- 照明: [名前]
- 美術: [名前]
- 車掌: [名前]
- メイク: [名前]
- 衣装: [名前]
- その他: [名前]

## 香盤表

| 時間 | 監督 | AD | カメラ | 音声 | 照明 | 美術 | 車掌 | メイク | 衣装 | 備考 |
|------|------|-----|--------|------|------|------|------|--------|------|------|
| 08:00 | 事務所集合 | 事務所集合 | 倉庫出発 | 倉庫出発 | 倉庫出発 | 事務所集合 | 車庫出発 | 事務所集合 | 事務所集合 | - |
| 09:00 | 現場到着 | 現場到着 | 現場到着 | 現場到着 | 現場到着 | 現場到着 | 演者送迎 | 現場到着 | 現場到着 | - |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

## 車両割り当て
- 1号車: [担当スタッフ/用途]
- 2号車: [担当スタッフ/用途]

## 連絡事項
- [項目]`;

/**
 * 車両表生成プロンプト
 */
const VEHICLE_SCHEDULE_PROMPT = `以下のマスタースケジュールから、車両表を生成してください。

【出力項目】
1. 車両番号・種別（1号車/2号車、ワゴン/バス/トラックなど）
2. 運転手・車掌
3. 乗車人员
4. 行程（出発地点→経由地→到着地点）
5. 時刻（出発/到着）
6. 用途（機材運搬、演者送迎、スタッフ移動など）

【出力形式】
# 車両表

## 基本情報
- 日付: YYYY/MM/DD
- 現場名: [名前]
- 収録内容: [内容]

## 車両一覧

### 1号車（ワゴン/バス/トラック）
- 用途: [用途]
- 運転手: [名前]
- 車掌: [名前]
- 乗車人员: [名前1]、[名前2]、...

#### 行程
| 時間 | 行動 | 場所 | 備考 |
|------|------|------|------|
| 08:00 | 出発 | [場所] | [備考] |
| 08:30 | 到着 | [場所] | [備考] |
| ... | ... | ... | ... |

### 2号車（ワゴン/バス/トラック）
...

## 総車両数
- 合計: [N]台

## 駐車場情報
- 場所: [場所]
- 台数: [N]台分
- 注意事項: [項目]`;

/**
 * プロンプトマッピング
 */
const PROMPT_MAP: Record<ScheduleGenerateType, string> = {
  actor: ACTOR_SCHEDULE_PROMPT,
  staff: STAFF_SCHEDULE_PROMPT,
  vehicle: VEHICLE_SCHEDULE_PROMPT,
};

/**
 * スケジュール生成用のメッセージを作成
 * @param request - 生成リクエスト
 * @returns LLMメッセージ配列
 */
export function createScheduleGenerateMessages(
  request: ScheduleGenerateRequest
): LLMMessage[] {
  const typePrompt = PROMPT_MAP[request.type];
  const additionalInstructions = request.additionalInstructions
    ? `\n\n【追加指示】\n${request.additionalInstructions}`
    : "";

  return [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `${typePrompt}${additionalInstructions}\n\n---\n\n【マスタースケジュール】\n\n${request.masterSchedule}`,
    },
  ];
}

/**
 * 生成タイプのラベル取得
 * @param type - 生成タイプ
 * @returns 表示ラベル
 */
export function getGenerateTypeLabel(type: ScheduleGenerateType): string {
  const labels: Record<ScheduleGenerateType, string> = {
    actor: "演者別スケジュール",
    staff: "香盤表（スタッフ動き）",
    vehicle: "車両表",
  };
  return labels[type];
}

/**
 * 生成タイプの説明取得
 * @param type - 生成タイプ
 * @returns 説明文
 */
export function getGenerateTypeDescription(type: ScheduleGenerateType): string {
  const descriptions: Record<ScheduleGenerateType, string> = {
    actor: "演者ごとの集合時間、移動、本番時間、持ち物などを一覧化",
    staff: "時間帯ごとのスタッフ配置と動きを表形式で整理",
    vehicle: "車両ごとの運行計画、乗車人员、行程を一覧化",
  };
  return descriptions[type];
}
