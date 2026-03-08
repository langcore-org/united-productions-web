#!/usr/bin/env node
/**
 * Project Docs Manager - Unified CLI
 * Usage: node docs.js <category> <command> [options]
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = 'docs';
const BACKLOG_DIR = 'docs/backlog';
const PLANS_DIR = 'docs/plans';
const LESSONS_DIR = 'docs/lessons';
const ARCHIVE_DIR = 'docs/archive';

// ================ Utils ================

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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseFrontmatter(content) {
  const lines = content.split('\n');
  const meta = {};
  
  for (const line of lines) {
    if (line.startsWith('> **')) {
      const match = line.match(/> \*\*(.+?)\*\*:\s*(.+)/);
      if (match) {
        const key = match[1].toLowerCase().replace(/\s+/g, '_');
        meta[key] = match[2].trim();
      }
    } else if (line.startsWith('# ')) {
      meta.title = line.substring(2).trim();
      break;
    }
  }
  
  return meta;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getDaysOld(dateStr) {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  if (isNaN(date)) return 0;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// ================ Backlog Commands ================

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

function generateBacklogContent(type, title, priority, file) {
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
      const priorityShort = priority === 'high' ? '高' : priority === 'medium' ? '中' : '低';
      content += '```typescript\n';
      content += `// TODO: [${priorityShort}] ${title}\n`;
      content += `// ${BACKLOG_DIR}/${type}-${sanitizeFilename(title)}.md を参照\n`;
      content += '// 現在は簡易的な実装\n';
      content += '```\n';
    } else {
      content += '(記入してください)\n';
    }
  }
  
  return content;
}

function backlogCreate(type, title, args) {
  let priority = 'pending';
  let file = null;
  
  for (const arg of args) {
    if (arg.startsWith('--priority=')) priority = arg.substring(11);
    else if (arg.startsWith('--file=')) file = arg.substring(7);
  }
  
  ensureDir(BACKLOG_DIR);
  
  const sanitized = sanitizeFilename(title);
  const filename = `${type}-${getTimestamp()}-${sanitized}.md`;
  const filepath = path.join(BACKLOG_DIR, filename);
  
  const content = generateBacklogContent(type, title, priority, file);
  fs.writeFileSync(filepath, content, 'utf-8');
  
  console.log(`✅ Created: ${filepath}`);
  console.log(`Priority: ${PRIORITY_MAP[priority]}`);
  if (file) console.log(`Related file: ${file}`);
}

function backlogList(args) {
  const PRIORITY_ORDER = { '🔴 高': 1, '🟡 中': 2, '🟢 低': 3, '⏸️ 保留': 4 };
  
  let priorityFilter = null;
  let typeFilter = null;
  
  for (const arg of args) {
    if (arg.startsWith('--priority=')) {
      const p = arg.substring(11);
      priorityFilter = p === 'high' ? '🔴 高' : p === 'medium' ? '🟡 中' : p === 'low' ? '🟢 低' : p === 'pending' ? '⏸️ 保留' : p;
    } else if (arg.startsWith('--type=')) {
      typeFilter = arg.substring(7);
    }
  }
  
  if (!fs.existsSync(BACKLOG_DIR)) {
    console.log('No backlog directory found.');
    return;
  }
  
  const files = fs.readdirSync(BACKLOG_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => {
      const content = fs.readFileSync(path.join(BACKLOG_DIR, f), 'utf-8');
      const meta = parseFrontmatter(content);
      return { filename: f, type: f.split('-')[0], ...meta };
    });
  
  let filtered = files;
  if (priorityFilter) filtered = filtered.filter(f => f.priority === priorityFilter);
  if (typeFilter) filtered = filtered.filter(f => f.type === typeFilter);
  
  filtered.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] || 999;
    const pb = PRIORITY_ORDER[b.priority] || 999;
    if (pa !== pb) return pa - pb;
    return new Date(b.発見日 || 0) - new Date(a.発見日 || 0);
  });
  
  if (filtered.length === 0) {
    console.log('No backlog items found.');
    return;
  }
  
  console.log(`\n📋 Backlog Items (${filtered.length}件)\n`);
  console.log('Priority | Type   | Date  | Age | Title');
  console.log('---------|--------|-------|-----|----------------------------------------');
  
  for (const item of filtered) {
    console.log(`${(item.priority || '⏸️ 保留').padEnd(6)} | ${(item.type || '?').padEnd(6)} | ${formatDate(item.発見日).padEnd(5)} | ${(getDaysOld(item.発見日) + 'd').padEnd(3)} | ${item.title || '(no title)'}`);
  }
  
  const summary = {};
  for (const f of files) {
    const p = f.priority || '⏸️ 保留';
    summary[p] = (summary[p] || 0) + 1;
  }
  
  console.log('\nSummary:');
  for (const [p, count] of Object.entries(summary).sort((a, b) => (PRIORITY_ORDER[a[0]] || 999) - (PRIORITY_ORDER[b[0]] || 999))) {
    console.log(`  ${p}: ${count}件`);
  }
  console.log('');
}

function backlogPromote(sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    console.error(`File not found: ${sourcePath}`);
    process.exit(1);
  }
  
  ensureDir(PLANS_DIR);
  
  const basename = path.basename(sourcePath, '.md');
  const cleanName = basename.replace(/^(todo|issue|idea|research)-\d+-/, '');
  const destPath = path.join(PLANS_DIR, `${cleanName}.md`);
  
  let content = fs.readFileSync(sourcePath, 'utf-8');
  const lines = content.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('> **')) insertIndex = i + 1;
    else if (lines[i].startsWith('# ')) break;
  }
  
  lines.splice(insertIndex, 0, '', `> **ステータス**: 🚀 実装決定（${getToday()}）`, `> **元ファイル**: ${sourcePath}`);
  content = lines.join('\n');
  
  fs.writeFileSync(destPath, content, 'utf-8');
  fs.unlinkSync(sourcePath);
  
  console.log(`✅ Promoted to: ${destPath}`);
  console.log(`🗑️  Deleted: ${sourcePath}`);
}

function backlogArchive(sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    console.error(`File not found: ${sourcePath}`);
    process.exit(1);
  }
  
  ensureDir(ARCHIVE_DIR);
  
  const basename = path.basename(sourcePath);
  const destPath = path.join(ARCHIVE_DIR, `${getToday()}-${basename}`);
  
  let content = fs.readFileSync(sourcePath, 'utf-8');
  const lines = content.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('> **')) insertIndex = i + 1;
    else if (lines[i].startsWith('# ')) break;
  }
  
  lines.splice(insertIndex, 0, '', `> **ステータス**: 📦 アーカイブ済み（${getToday()}）`, `> **元ファイル**: ${sourcePath}`);
  content = lines.join('\n');
  
  fs.writeFileSync(destPath, content, 'utf-8');
  fs.unlinkSync(sourcePath);
  
  console.log(`✅ Archived to: ${destPath}`);
  console.log(`🗑️  Deleted: ${sourcePath}`);
}

// ================ Plan Commands ================

const PLAN_TEMPLATE = `> **ステータス**: 📝 計画中
> **作成日**: {{date}}
> **更新日**: {{date}}

# {{title}}

## 概要

（1-2文で簡潔に記載）

## 目的・背景

- なぜこの機能が必要か
- 解決する課題は何か

## タスク分解

- [ ] タスク1
- [ ] タスク2
- [ ] タスク3

## 見積もり

| 項目 | 見積もり |
|------|---------|
| 開発工数 | X時間 |
| テスト工数 | Y時間 |
| 合計 | Z時間 |

## 依存関係

- 依存するタスク/機能
- ブロッカーになる可能性のあるもの

## 期限・マイルストーン

| フェーズ | 期限 | 成果物 |
|---------|------|-------|
| 設計完了 | YYYY-MM-DD | 設計ドキュメント |
| 実装完了 | YYYY-MM-DD | PR作成 |
| リリース | YYYY-MM-DD | 本番デプロイ |

## 関連資料

- 関連するbacklog/lesson/docs
`;

function planCreate(title) {
  ensureDir(PLANS_DIR);
  
  const filename = `${sanitizeFilename(title)}.md`;
  const filepath = path.join(PLANS_DIR, filename);
  
  if (fs.existsSync(filepath)) {
    console.error(`Plan already exists: ${filepath}`);
    process.exit(1);
  }
  
  const content = PLAN_TEMPLATE
    .replace(/{{date}}/g, getToday())
    .replace(/{{title}}/g, title);
  
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log(`✅ Created plan: ${filepath}`);
}

function planList() {
  if (!fs.existsSync(PLANS_DIR)) {
    console.log('No plans directory found.');
    return;
  }
  
  const files = fs.readdirSync(PLANS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(PLANS_DIR, f), 'utf-8');
      const meta = parseFrontmatter(content);
      return { filename: f, ...meta };
    });
  
  if (files.length === 0) {
    console.log('No plans found.');
    return;
  }
  
  console.log(`\n📋 Plans (${files.length}件)\n`);
  console.log('Status | Title');
  console.log('-------|----------------------------------------');
  
  for (const item of files) {
    const status = item.ステータス || '📝 計画中';
    console.log(`${status.padEnd(6)} | ${item.title || item.filename}`);
  }
  console.log('');
}

function planConvert(sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    console.error(`File not found: ${sourcePath}`);
    process.exit(1);
  }
  
  ensureDir(LESSONS_DIR);
  ensureDir(ARCHIVE_DIR);
  
  const basename = path.basename(sourcePath, '.md');
  const destPath = path.join(LESSONS_DIR, `${getToday()}-${basename}.md`);
  
  const content = fs.readFileSync(sourcePath, 'utf-8');
  
  // Convert plan to lesson format
  let lessonContent = `> **優先度**: 📚 学び\n`;
  lessonContent += `> **完了日**: ${getToday()}\n`;
  lessonContent += `> **元計画書**: ${sourcePath}\n\n`;
  
  // Extract title
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : basename;
  lessonContent += `# ${title}の知見\n\n`;
  
  lessonContent += `## 概要\n\n（1-2文で簡潔に）\n\n`;
  lessonContent += `## 背景\n\n- なぜこの問題・技術に取り組んだか\n- 前提条件・制約\n\n`;
  lessonContent += `## 結果\n\n- 最終的に何を選んだ・どう解決したか\n- コード例（該当する場合）\n\n`;
  lessonContent += `## 教訓\n\n- 「もっと早く気づけばよかった」こと\n- 試行錯誤した無駄なアプローチ\n\n`;
  lessonContent += `## 推奨事項\n\n- 次に同じ状況になったときの推奨アクション\n- 避けるべきアンチパターン\n\n`;
  
  // Add original content as reference
  lessonContent += `---\n\n## 元の計画書\n\n<details>\n<summary>展開</summary>\n\n${content}\n\n</details>\n`;
  
  fs.writeFileSync(destPath, lessonContent, 'utf-8');
  
  // Archive original plan
  const archivePath = path.join(ARCHIVE_DIR, `${getToday()}-${basename}.md`);
  fs.writeFileSync(archivePath, content, 'utf-8');
  fs.unlinkSync(sourcePath);
  
  console.log(`✅ Converted to lesson: ${destPath}`);
  console.log(`📦 Archived plan: ${archivePath}`);
  console.log('\nNext: Fill in the lesson sections with what you learned.');
}

// ================ Lesson Commands ================

function lessonList(args) {
  let categoryFilter = null;
  
  for (const arg of args) {
    if (arg.startsWith('--category=')) {
      categoryFilter = arg.substring(11);
    }
  }
  
  if (!fs.existsSync(LESSONS_DIR)) {
    console.log('No lessons directory found.');
    return;
  }
  
  const files = fs.readdirSync(LESSONS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md' && f !== 'template.md')
    .map(f => {
      const content = fs.readFileSync(path.join(LESSONS_DIR, f), 'utf-8');
      const meta = parseFrontmatter(content);
      const dateMatch = f.match(/^(\d{4}-\d{2}-\d{2})-/);
      return { 
        filename: f, 
        date: dateMatch ? dateMatch[1] : 'N/A',
        ...meta 
      };
    });
  
  if (files.length === 0) {
    console.log('No lessons found.');
    return;
  }
  
  files.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  console.log(`\n📚 Lessons (${files.length}件)\n`);
  console.log('Date       | Title');
  console.log('-----------|----------------------------------------');
  
  for (const item of files) {
    console.log(`${item.date} | ${item.title || '(no title)'}`);
  }
  console.log('');
}

function lessonSearch(keyword) {
  if (!fs.existsSync(LESSONS_DIR)) {
    console.log('No lessons directory found.');
    return;
  }
  
  const files = fs.readdirSync(LESSONS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md');
  
  const results = [];
  
  for (const f of files) {
    const content = fs.readFileSync(path.join(LESSONS_DIR, f), 'utf-8');
    if (content.toLowerCase().includes(keyword.toLowerCase())) {
      const meta = parseFrontmatter(content);
      results.push({ filename: f, title: meta.title || '(no title)' });
    }
  }
  
  if (results.length === 0) {
    console.log(`No lessons found for: "${keyword}"`);
    return;
  }
  
  console.log(`\n🔍 Search results for "${keyword}" (${results.length}件)\n`);
  for (const r of results) {
    console.log(`- ${r.title} (${r.filename})`);
  }
  console.log('');
}

function lessonTemplate() {
  console.log(`
# Lesson Template

## 必須セクション

\`\`\`markdown
> **優先度**: 📚 学び
> **完了日**: YYYY-MM-DD
> **関連**: plans/xxx.md（あれば）

# タイトル

## 概要

1-2文で簡潔に

## 背景

- なぜこの問題・技術に取り組んだか
- 前提条件・制約

## 結果

- 最終的に何を選んだ・どう解決したか
- コード例（該当する場合）

## 教訓

- 「もっと早く気づけばよかった」こと
- 試行錯誤した無駄なアプローチ

## 推奨事項

- 次に同じ状況になったときの推奨アクション
- 避けるべきアンチパターン
\`\`\`

## 記入タイミング

実装完了直後、記憶が新鮮なうちに（推奨：当日〜3日以内）
`);
}

// ================ Maintenance Commands ================

function checkLinks() {
  console.log('Checking documentation links...');
  console.log('(Implementation: scan all docs for broken internal links)');
}

function checkDupes() {
  console.log('Checking for duplicate content...');
  console.log('(Implementation: compare content similarity across docs)');
}

function stats() {
  const stats = {
    backlog: fs.existsSync(BACKLOG_DIR) ? fs.readdirSync(BACKLOG_DIR).filter(f => f.endsWith('.md')).length : 0,
    plans: fs.existsSync(PLANS_DIR) ? fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.md')).length : 0,
    lessons: fs.existsSync(LESSONS_DIR) ? fs.readdirSync(LESSONS_DIR).filter(f => f.endsWith('.md')).length : 0,
    archive: fs.existsSync(ARCHIVE_DIR) ? fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.md')).length : 0
  };
  
  console.log('\n📊 Documentation Stats\n');
  console.log(`docs/backlog/: ${stats.backlog} files`);
  console.log(`docs/plans/:   ${stats.plans} files`);
  console.log(`docs/lessons/: ${stats.lessons} files`);
  console.log(`docs/archive/: ${stats.archive} files`);
  console.log(`Total:        ${stats.backlog + stats.plans + stats.lessons + stats.archive} files\n`);
}

// ================ Main ================

function showHelp() {
  console.log(`
Project Docs Manager

Usage: node docs.js <category> <command> [options]

Categories:
  backlog    Manage backlog items (todo/issue/idea/research)
  plan       Manage implementation plans
  lesson     Manage lessons learned
  (none)     Show stats

Backlog Commands:
  create-todo <title>     Create a todo item
  create-issue <title>    Create an issue item
  create-idea <title>     Create an idea item
  list                    List backlog items
  promote <filepath>      Move to plans/
  archive <filepath>      Move to archive/

Plan Commands:
  create <title>          Create a new plan
  list                    List plans
  convert <filepath>      Convert to lesson and archive
  archive <filepath>      Move to archive/

Lesson Commands:
  list                    List lessons
  search <keyword>        Search lessons
  template                Show lesson template

Options:
  --priority=<p>          high, medium, low, pending
  --type=<t>              Filter by type
  --file=<path>           Related file path

Examples:
  node docs.js backlog create-todo "Error handling" --priority=high --file=app/api.ts
  node docs.js backlog list --priority=pending
  node docs.js plan create "New feature"
  node docs.js lesson search "LangChain"
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    stats();
    return;
  }
  
  const category = args[0];
  const command = args[1];
  const restArgs = args.slice(2);
  
  switch (category) {
    case 'backlog':
      switch (command) {
        case 'create-todo':
          if (!restArgs[0]) { console.error('Title required'); process.exit(1); }
          backlogCreate('todo', restArgs[0], restArgs.slice(1));
          break;
        case 'create-issue':
          if (!restArgs[0]) { console.error('Title required'); process.exit(1); }
          backlogCreate('issue', restArgs[0], restArgs.slice(1));
          break;
        case 'create-idea':
          if (!restArgs[0]) { console.error('Title required'); process.exit(1); }
          backlogCreate('idea', restArgs[0], restArgs.slice(1));
          break;
        case 'list':
          backlogList(restArgs);
          break;
        case 'promote':
          if (!restArgs[0]) { console.error('Filepath required'); process.exit(1); }
          backlogPromote(restArgs[0]);
          break;
        case 'archive':
          if (!restArgs[0]) { console.error('Filepath required'); process.exit(1); }
          backlogArchive(restArgs[0]);
          break;
        default:
          console.error('Unknown backlog command:', command);
          showHelp();
          process.exit(1);
      }
      break;
      
    case 'plan':
      switch (command) {
        case 'create':
          if (!restArgs[0]) { console.error('Title required'); process.exit(1); }
          planCreate(restArgs[0]);
          break;
        case 'list':
          planList();
          break;
        case 'convert':
          if (!restArgs[0]) { console.error('Filepath required'); process.exit(1); }
          planConvert(restArgs[0]);
          break;
        case 'archive':
          if (!restArgs[0]) { console.error('Filepath required'); process.exit(1); }
          backlogArchive(restArgs[0]);
          break;
        default:
          console.error('Unknown plan command:', command);
          showHelp();
          process.exit(1);
      }
      break;
      
    case 'lesson':
      switch (command) {
        case 'list':
          lessonList(restArgs);
          break;
        case 'search':
          if (!restArgs[0]) { console.error('Keyword required'); process.exit(1); }
          lessonSearch(restArgs[0]);
          break;
        case 'template':
          lessonTemplate();
          break;
        default:
          console.error('Unknown lesson command:', command);
          showHelp();
          process.exit(1);
      }
      break;
      
    case 'check-links':
      checkLinks();
      break;
    case 'check-dupes':
      checkDupes();
      break;
    case 'stats':
      stats();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.error('Unknown category:', category);
      showHelp();
      process.exit(1);
  }
}

main();
