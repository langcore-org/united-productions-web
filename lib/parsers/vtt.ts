/**
 * VTT (WebVTT) パーサー
 * 
 * Zoomの文字起こしVTTファイルをパースします。
 */

export interface VttCue {
  id?: string;
  startTime: number; // ミリ秒
  endTime: number;   // ミリ秒
  text: string;
  speaker?: string;
}

export interface VttParseResult {
  cues: VttCue[];
  speakers: string[];
  duration: number;
}

/**
 * VTT時間文字列をミリ秒に変換
 * @param timeStr - "00:00:00.000" または "00:00.000" 形式
 * @returns ミリ秒
 */
function parseVttTime(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  
  if (parts.length === 3) {
    // HH:MM:SS.mmm
    const [hours, minutes, seconds] = parts;
    return hours * 3600000 + minutes * 60000 + seconds * 1000;
  } else if (parts.length === 2) {
    // MM:SS.mmm
    const [minutes, seconds] = parts;
    return minutes * 60000 + seconds * 1000;
  }
  
  return 0;
}

/**
 * 話者名を抽出
 * @param text - 発言テキスト
 * @returns [発言テキスト（話者名除去後）, 話者名]
 */
function extractSpeaker(text: string): [string, string | undefined] {
  // Zoom VTT形式: "話者名: 発言内容" または "話者名：発言内容"
  const match = text.match(/^([^:：]+)[:：]\s*(.+)$/s);
  if (match) {
    const speaker = match[1].trim();
    const content = match[2].trim();
    return [content, speaker];
  }
  return [text, undefined];
}

/**
 * VTTファイルをパース
 * @param vttContent - VTTファイルの内容
 * @returns パース結果
 */
export function parseVtt(vttContent: string): VttParseResult {
  const lines = vttContent.split("\n");
  const cues: VttCue[] = [];
  const speakers = new Set<string>();
  
  let i = 0;
  
  // WEBVTTヘッダーをスキップ
  while (i < lines.length && !lines[i].includes("-->")) {
    i++;
  }
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // タイムスタンプ行を検索
    if (line.includes("-->")) {
      const timeMatch = line.match(/(.+?)\s*-->\s*(.+?)(?:\s+|$)/);
      if (timeMatch) {
        const startTimeStr = timeMatch[1].trim();
        const endTimeStr = timeMatch[2].trim();
        
        const startTime = parseVttTime(startTimeStr);
        const endTime = parseVttTime(endTimeStr);
        
        // テキスト行を収集
        const textLines: string[] = [];
        i++;
        
        while (i < lines.length && lines[i].trim() !== "" && !lines[i].includes("-->")) {
          textLines.push(lines[i].trim());
          i++;
        }
        
        const text = textLines.join(" ");
        const [content, speaker] = extractSpeaker(text);
        
        if (speaker) {
          speakers.add(speaker);
        }
        
        cues.push({
          startTime,
          endTime,
          text: content,
          speaker,
        });
        
        continue;
      }
    }
    
    i++;
  }
  
  const duration = cues.length > 0 ? cues[cues.length - 1].endTime : 0;
  
  return {
    cues,
    speakers: Array.from(speakers),
    duration,
  };
}

/**
 * ミリ秒を時間形式に変換
 * @param ms - ミリ秒
 * @returns "HH:MM:SS" 形式
 */
export function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * VTTキューを会話形式に変換
 * @param cues - VTTキュー配列
 * @returns 会話形式のテキスト
 */
export function cuesToConversation(cues: VttCue[]): string {
  return cues
    .map((cue) => {
      const time = formatTime(cue.startTime);
      const speaker = cue.speaker || "不明";
      return `[${time}] ${speaker}: ${cue.text}`;
    })
    .join("\n");
}

/**
 * 話者別にグループ化
 * @param cues - VTTキュー配列
 * @returns 話者別の発言配列
 */
export function groupBySpeaker(cues: VttCue[]): Record<string, VttCue[]> {
  return cues.reduce((acc, cue) => {
    const speaker = cue.speaker || "不明";
    if (!acc[speaker]) {
      acc[speaker] = [];
    }
    acc[speaker].push(cue);
    return acc;
  }, {} as Record<string, VttCue[]>);
}
