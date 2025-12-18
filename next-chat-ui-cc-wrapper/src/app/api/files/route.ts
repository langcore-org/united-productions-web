import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILES_DIR = path.join(process.cwd(), 'data', 'files');

// Ensure files directory exists
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: string;
  fileCount?: number;      // ディレクトリの場合のファイル数
  isSelectable?: boolean;  // 選択可能か (100ファイル以下)
}

const MAX_SELECTABLE_FILES = 100;

// Count files in a directory recursively
function countFilesInDirectory(dir: string): number {
  let count = 0;
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        count += countFilesInDirectory(fullPath);
      } else {
        count++;
      }
    }
  } catch {
    // Ignore errors (e.g., permission denied)
  }
  return count;
}

function getFilesRecursive(dir: string, basePath: string = ''): FileInfo[] {
  const files: FileInfo[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(basePath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const fileCount = countFilesInDirectory(fullPath);
      files.push({
        name: item,
        path: relativePath,
        size: 0,
        isDirectory: true,
        modifiedAt: stat.mtime.toISOString(),
        fileCount,
        isSelectable: fileCount <= MAX_SELECTABLE_FILES,
      });
      // Recursively get files in subdirectory
      files.push(...getFilesRecursive(fullPath, relativePath));
    } else {
      files.push({
        name: item,
        path: relativePath,
        size: stat.size,
        isDirectory: false,
        modifiedAt: stat.mtime.toISOString(),
        isSelectable: true,
      });
    }
  }

  return files;
}

// GET /api/files - List all files
// GET /api/files?search=query - Search files by name
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase();

    let files = getFilesRecursive(FILES_DIR);

    // Filter by search query if provided
    if (search) {
      files = files.filter(
        (f) =>
          f.name.toLowerCase().includes(search) ||
          f.path.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}

// POST /api/files - Save a new file
export async function POST(req: Request) {
  try {
    const { filename, content } = await req.json();

    if (!filename || content === undefined) {
      return NextResponse.json(
        { error: 'filename and content are required' },
        { status: 400 }
      );
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/\.\./g, '').replace(/^\//, '');
    const filePath = path.join(FILES_DIR, sanitizedFilename);

    // Ensure parent directory exists
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');

    const stat = fs.statSync(filePath);
    return NextResponse.json({
      success: true,
      file: {
        name: path.basename(filePath),
        path: sanitizedFilename,
        size: stat.size,
        isDirectory: false,
        modifiedAt: stat.mtime.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }
}
