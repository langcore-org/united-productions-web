import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILES_DIR = path.join(process.cwd(), 'data', 'files');
const MAX_SELECTABLE_FILES = 100;

interface FileEntry {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
}

// Get all files in directory recursively
function getFilesInDirectory(dir: string, basePath: string = ''): FileEntry[] {
  const files: FileEntry[] = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = path.join(basePath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...getFilesInDirectory(fullPath, relativePath));
      } else {
        files.push({
          path: relativePath,
          name: item,
          size: stat.size,
          isDirectory: false,
        });
      }
    }
  } catch {
    // Ignore errors
  }
  return files;
}

// GET /api/files/directory/path/to/dir - Get directory details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const dirPath = path.join(FILES_DIR, ...pathSegments);

    // Security check
    const resolvedPath = path.resolve(dirPath);
    if (!resolvedPath.startsWith(path.resolve(FILES_DIR))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }

    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
    }

    const files = getFilesInDirectory(dirPath);
    const fileCount = files.length;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const isSelectable = fileCount <= MAX_SELECTABLE_FILES;

    if (!isSelectable) {
      return NextResponse.json({
        path: pathSegments.join('/'),
        absolutePath: resolvedPath,
        fileCount,
        totalSize,
        isSelectable: false,
        error: `Directory contains too many files (${fileCount}). Maximum allowed: ${MAX_SELECTABLE_FILES}`,
        maxAllowed: MAX_SELECTABLE_FILES,
      });
    }

    return NextResponse.json({
      path: pathSegments.join('/'),
      absolutePath: resolvedPath,
      fileCount,
      totalSize,
      isSelectable: true,
      files: files.map(f => ({
        path: path.join(pathSegments.join('/'), f.path),
        name: f.name,
        size: f.size,
      })),
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}
