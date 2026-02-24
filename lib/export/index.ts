/**
 * エクスポート機能
 * MarkdownとCSV形式でのデータエクスポートをサポート
 */

export interface ExportOptions {
  format: 'markdown' | 'csv';
  filename?: string;
  data: string;
}

export interface ExportResult {
  success: boolean;
  error?: string;
}

/**
 * 現在の日時をファイル名用にフォーマット
 */
function formatDateForFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}

/**
 * ファイルをダウンロード
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Markdownとしてエクスポート
 */
function exportToMarkdown(data: string, filename?: string): ExportResult {
  try {
    const defaultFilename = `export_${formatDateForFilename()}.md`;
    const finalFilename = filename || defaultFilename;
    
    // すでにMarkdown形式の場合はそのまま、そうでない場合は整形
    let markdownContent = data;
    
    // データがプレーンテキストの場合、Markdownとして整形
    if (!data.startsWith('#') && !data.startsWith('-') && !data.startsWith('|')) {
      markdownContent = `# エクスポートデータ\n\n${data}`;
    }
    
    downloadFile(markdownContent, finalFilename, 'text/markdown');
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Markdownエクスポートに失敗しました' 
    };
  }
}

/**
 * CSVとしてエクスポート
 */
function exportToCSV(data: string, filename?: string): ExportResult {
  try {
    const defaultFilename = `export_${formatDateForFilename()}.csv`;
    const finalFilename = filename || defaultFilename;
    
    let csvContent = data;
    
    // データがJSON配列の場合、CSVに変換
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const headers = Object.keys(parsed[0]);
        const rows = parsed.map((row: Record<string, unknown>) => 
          headers.map(header => {
            const value = row[header];
            // カンマや改行を含む場合はダブルクォートで囲む
            const stringValue = String(value ?? '');
            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        );
        csvContent = [headers.join(','), ...rows].join('\n');
      }
    } catch {
      // JSONでない場合はそのまま使用
      // タブ区切りやスペース区切りのデータをCSV形式に変換を試みる
      if (data.includes('\t')) {
        csvContent = data.split('\n').map(line => 
          line.split('\t').map(cell => {
            if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          }).join(',')
        ).join('\n');
      }
    }
    
    // BOMを追加してExcelでの文字化けを防ぐ
    const bom = '\uFEFF';
    downloadFile(bom + csvContent, finalFilename, 'text/csv;charset=utf-8');
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'CSVエクスポートに失敗しました' 
    };
  }
}

/**
 * データをエクスポート
 */
export function exportData(options: ExportOptions): ExportResult {
  const { format, filename, data } = options;
  
  if (!data) {
    return { success: false, error: 'エクスポートするデータが空です' };
  }
  
  switch (format) {
    case 'markdown':
      return exportToMarkdown(data, filename);
    case 'csv':
      return exportToCSV(data, filename);
    default:
      return { success: false, error: 'サポートされていないフォーマットです' };
  }
}

/**
 * 会話データをMarkdown形式に変換
 */
export function convertConversationToMarkdown(
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: Date }>,
  title?: string
): string {
  const lines: string[] = [];
  
  if (title) {
    lines.push(`# ${title}`);
    lines.push('');
  }
  
  messages.forEach((message, index) => {
    const role = message.role === 'user' ? '👤 ユーザー' : '🤖 Teddy';
    const timestamp = message.timestamp 
      ? ` (${message.timestamp.toLocaleString('ja-JP')})` 
      : '';
    
    lines.push(`## ${role}${timestamp}`);
    lines.push('');
    lines.push(message.content);
    lines.push('');
    
    if (index < messages.length - 1) {
      lines.push('---');
      lines.push('');
    }
  });
  
  return lines.join('\n');
}

/**
 * 会話データをCSV形式に変換
 */
export function convertConversationToCSV(
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: Date }>
): string {
  const headers = ['role', 'content', 'timestamp'];
  const rows = messages.map(message => {
    const timestamp = message.timestamp 
      ? message.timestamp.toISOString() 
      : new Date().toISOString();
    // 改行をエスケープ
    const content = message.content.replace(/\n/g, '\\n').replace(/"/g, '""');
    return `"${message.role}","${content}","${timestamp}"`;
  });
  
  return [headers.join(','), ...rows].join('\n');
}

export default exportData;
