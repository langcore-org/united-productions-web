#!/usr/bin/env node
/**
 * Archive backlog item
 * Usage: node archive.js <filepath>
 */

const fs = require('fs');
const path = require('path');

const ARCHIVE_DIR = 'docs/archive';

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node archive.js <backlog-filepath>');
    console.error('Example: node archive.js docs/backlog/idea-xxx.md');
    process.exit(1);
  }
  
  const sourcePath = args[0];
  
  // Check source exists
  if (!fs.existsSync(sourcePath)) {
    console.error(`File not found: ${sourcePath}`);
    process.exit(1);
  }
  
  // Ensure archive directory exists
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
  
  // Generate destination filename with date prefix
  const basename = path.basename(sourcePath);
  const today = new Date().toISOString().split('T')[0];
  const destPath = path.join(ARCHIVE_DIR, `${today}-${basename}`);
  
  // Read and update content
  let content = fs.readFileSync(sourcePath, 'utf-8');
  
  // Add archived header
  const lines = content.split('\n');
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('> **')) {
      insertIndex = i + 1;
    } else if (lines[i].startsWith('# ')) {
      break;
    }
  }
  
  lines.splice(insertIndex, 0, '', `> **ステータス**: 📦 アーカイブ済み（${today}）`, `> **元ファイル**: ${sourcePath}`);
  content = lines.join('\n');
  
  // Write to archive/
  fs.writeFileSync(destPath, content, 'utf-8');
  
  // Delete original
  fs.unlinkSync(sourcePath);
  
  console.log(`✅ Archived to: ${destPath}`);
  console.log(`🗑️  Deleted: ${sourcePath}`);
  console.log('\nNote: Archived items are for reference only.');
}

main();
