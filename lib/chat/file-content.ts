export interface FileLike {
  name: string;
  type: string;
  size: number;
  content?: string | null;
}

const DISPLAY_PREVIEW_MAX_LINES = 5;
const DISPLAY_PREVIEW_MAX_CHARS = 2000;
const LLM_CONTENT_MAX_CHARS = 50000;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function isTextFile(type: string): boolean {
  const lower = type.toLowerCase();
  return (
    lower.startsWith("text/") ||
    lower.includes("json") ||
    lower.includes("javascript") ||
    lower.includes("xml")
  );
}

export function buildDisplayContent(input: string, files: FileLike[]): string {
  const base = input.trim();

  if (files.length === 0) {
    return base;
  }

  const lines: string[] = [];
  if (base) {
    lines.push(base, "");
  }

  for (const file of files) {
    const header = `📎 ${file.name} (${formatFileSize(file.size)})`;
    lines.push(header);

    if (file.content && isTextFile(file.type)) {
      const trimmed = file.content.toString().trim().slice(0, DISPLAY_PREVIEW_MAX_CHARS);
      if (trimmed) {
        const previewLines = trimmed.split(/\r?\n/).slice(0, DISPLAY_PREVIEW_MAX_LINES);
        for (const l of previewLines) {
          lines.push(`> ${l}`);
        }
        if (trimmed.length > DISPLAY_PREVIEW_MAX_CHARS) {
          lines.push("> ...（この先は省略されています）");
        } else if (previewLines.length >= DISPLAY_PREVIEW_MAX_LINES) {
          lines.push("> ...");
        }
      }
    }

    lines.push("");
  }

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}

export function buildLlmContent(input: string, files: FileLike[]): string {
  const base = input.trim();

  if (files.length === 0) {
    return base;
  }

  const parts: string[] = [];
  if (base) {
    parts.push(base.trim());
  }

  for (const file of files) {
    if (file.content && isTextFile(file.type)) {
      const body = file.content.toString().slice(0, LLM_CONTENT_MAX_CHARS);
      parts.push(
        `<file name="${file.name}" type="${file.type}" size="${file.size}">`,
        body,
        "</file>",
      );
    } else {
      parts.push(
        `[添付ファイル: ${file.name} (${file.type || "unknown"}, ${formatFileSize(
          file.size,
        )}) ※バイナリファイルのため内容はクライアント側では読み取っていません]`,
      );
    }
  }

  return parts.join("\n\n");
}
