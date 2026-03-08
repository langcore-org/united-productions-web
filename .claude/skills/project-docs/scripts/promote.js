#!/usr/bin/env node
/**
 * Promote backlog item to plans/
 * Usage: node promote.js <filepath>
 */

const fs = require('fs');
const path = require('path');

const PLANS_DIR = 'docs/plans';

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node promote.js <backlog-filepath>');
    console.error('Example: node promote.js docs/backlog/todo-xxx.md');
    process.exit(1);
  }
  
  const sourcePath = args[0];
  
  // Check source exists
  if (!fs.existsSync(sourcePath)) {
    console.error(`File not found: ${sourcePath}`);
    process.exit(1);
  }
  
  // Ensure plans directory exists
  if (!fs.existsSync(PLANS_DIR)) {
    fs.mkdirSync(PLANS_DIR, { recursive: true });
  }
  
  // Generate destination filename
  const basename = path.basename(sourcePath, '.md');
  // Remove timestamp prefix and type prefix
  const cleanName = basename.replace(/^(todo|issue|idea|research)-\d+-/, '');
  const destPath = path.join(PLANS_DIR, `${cleanName}.md`);
  
  // Read and update content
  let content = fs.readFileSync(sourcePath, 'utf-8');
  
  // Add promoted header
  const today = new Date().toISOString().split('T')[0];
  const promotedHeader = `> **ステータス**: 🚀 実装決定（${today}）\n> **元ファイル**: ${sourcePath}\n\n`;
  
  // Insert after frontmatter
  const lines = content.split('\n');
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('> **')) {
      insertIndex = i + 1;
    } else if (lines[i].startsWith('# ')) {
      break;
    }
  }
  
  lines.splice(insertIndex, 0, '', `> **ステータス**: 🚀 実装決定（${today}）`, `> **元ファイル**: ${sourcePath}`);
  content = lines.join('\n');
  
  // Write to plans/
  fs.writeFileSync(destPath, content, 'utf-8');
  
  // Delete original
  fs.unlinkSync(sourcePath);
  
  console.log(`✅ Promoted to: ${destPath}`);
  console.log(`🗑️  Deleted: ${sourcePath}`);
  console.log('\nNext steps:');
  console.log('1. Update the plan with implementation details');
  console.log('2. Add tasks and timeline');
  console.log('3. Start implementation');
}

main();
