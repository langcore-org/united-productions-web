import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILES_DIR = path.join(process.cwd(), 'data', 'files');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// GET /api/files/path/to/file - Read file content
// Add ?raw=true to get raw file content (for images, etc.)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filePath = path.join(FILES_DIR, ...pathSegments);

    // Check for raw query parameter
    const url = new URL(req.url);
    const rawMode = url.searchParams.get('raw') === 'true';

    // Security check: ensure path is within FILES_DIR
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(FILES_DIR))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: 'Path is a directory' }, { status: 400 });
    }

    // Check file size limit (100MB)
    if (stat.size > MAX_FILE_SIZE) {
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json({
        error: `File too large: ${sizeMB}MB exceeds 100MB limit`,
        fileTooLarge: true,
        size: stat.size,
        maxSize: MAX_FILE_SIZE
      }, { status: 413 });
    }

    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();

    // If raw mode requested, return the actual file content
    if (rawMode) {
      const fileBuffer = fs.readFileSync(filePath);

      // Determine content type
      const contentTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.bmp': 'image/bmp',
        '.ico': 'image/x-icon',
        '.pdf': 'application/pdf',
        '.md': 'text/markdown',
        '.txt': 'text/plain',
        '.json': 'application/json',
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': stat.size.toString(),
        },
      });
    }

    // PDF files - return path for Claude Code's native PDF parser
    if (ext === '.pdf') {
      return NextResponse.json({
        name: fileName,
        path: pathSegments.join('/'),
        absolutePath: resolvedPath,
        content: null,
        isBinary: true,
        isPdf: true,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    }

    // Image files - return path only (Claude can read images via Read tool)
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg'];
    if (imageExtensions.includes(ext)) {
      return NextResponse.json({
        name: fileName,
        path: pathSegments.join('/'),
        absolutePath: resolvedPath,
        content: null,
        isBinary: true,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json({
      name: fileName,
      path: pathSegments.join('/'),
      absolutePath: resolvedPath,
      content,
      isBinary: false,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}

// DELETE /api/files/path/to/file - Delete file
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filePath = path.join(FILES_DIR, ...pathSegments);

    // Security check
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(FILES_DIR))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
