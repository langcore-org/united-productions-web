#!/usr/bin/env node
/**
 * Backlog item creator
 * Usage: node create.js <type> <title> [--priority=<p>] [--file=<path>]
 */

const fs = require('fs');
const path = require('path');

const BACKLOG_DIR = 'docs/backlog';

const PRIORITY_MAP = {
  high: '🔴 高',
  medium: '🟡 中',
  low: '🟢 低',
  pending: '⏸️ 保留'
};

const TYPE_TEMPLATES = {
  todo: {
    status: '保留',
    sections: ['内容', '対応時期', '関連コード']
  },
  issue: {
    status: '問題',
    sections: ['問題の詳細', '影響範囲', '再現手順', '期待される動作', '修正案']
  },
  idea: {
    status: '検討中',
    sections: ['概要', '背景・課題', '提案内容', '検討事項', '参考情報']
  },
  research: {
    status: '調査中',
    sections: ['調査目的', '調査項目', '現在の知見', '次のステップ']
  }
};

function sanitizeFilename(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

function getTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function generateContent(type, title, priority, file) {
  const template = TYPE_TEMPLATES[type] || TYPE_TEMPLATES.todo;
  const priorityLabel = PRIORITY_MAP[priority] || PRIORITY_MAP.pending;
  
  let content = `> **優先度**: ${priorityLabel}\n`;
  content += `> **発見日**: ${getToday()}\n`;
  content += `> **状態**: ${template.status}\n`;
  
  if (file) {
    content += `> **関連ファイル**: ${file}\n`;
  }
  
  content += `\n# ${title}\n`;
  
  for (const section of template.sections) {
    content += `\n## ${section}\n\n`;
    
    if (section === '対応時期') {
      content += '- [ ] 次のスプリント\n';
      content += '- [ ] リリース後\n';
      content += '- [ ] 随時\n';
    } else if (section === '関連コード' && file) {
      content += '```typescript\n';
      content += `// TODO: [${priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}] ${title}\n`;
      content += `// ${BACKLOG_DIR}/todo-${sanitizeFilename(title)}.md を参照\n`;
      content += '// 現在は簡易的な実装\n';
      content += '```\n';
    } else {
      content += '(記入してください)\n';
    }
  }
  
  return content;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node create.js <type> <title> [--priority=<p>] [--file=<path>]');
    console.error('Types: todo, issue, idea, research');
    console.error('Priorities: high, medium, low, pending');
    process.exit(1);
  }
  
  const type = args[0];
  const title = args[1];
  
  // Parse options
  let priority = 'pending';
  let file = null;
  
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--priority=')) {
      priority = arg.substring(11);
    } else if (arg.startsWith('--file=')) {
      file = arg.substring(7);
    }
  }
  
  // Validate type
  if (!TYPE_TEMPLATES[type]) {
    console.error(`Unknown type: ${type}. Use: todo, issue, idea, research`);
    process.exit(1);
  }
  
  // Ensure backlog directory exists
  if (!fs.existsSync(BACKLOG_DIR)) {
    fs.mkdirSync(BACKLOG_DIR, { recursive: true });
  }
  
  // Generate filename
  const sanitized = sanitizeFilename(title);
  const filename = `${type}-${getTimestamp()}-${sanitized}.md`;
  const filepath = path.join(BACKLOG_DIR, filename);
  
  // Generate and write content
  const content = generateContent(type, title, priority, file);
  fs.writeFileSync(filepath, content, 'utf-8');
  
  console.log(`Created: ${filepath}`);
  console.log(`Title: ${title}`);
  console.log(`Priority: ${PRIORITY_MAP[priority]}`);
  if (file) {
    console.log(`Related file: ${file}`);
  }
}

main();
