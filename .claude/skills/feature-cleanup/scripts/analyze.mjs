#!/usr/bin/env node
/**
 * Feature Cleanup - Analyze Script
 * 
 * 削除対象を自動検出するスクリプト
 * 
 * Usage:
 *   node analyze.mjs [KEYWORD]
 * 
 * Example:
 *   node analyze.mjs "na-script"
 *   node analyze.mjs "langchain"
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const keyword = process.argv[2];

if (!keyword) {
  console.error('Usage: node analyze.mjs [KEYWORD]');
  console.error('Example: node analyze.mjs "na-script"');
  process.exit(1);
}

function runCommand(cmd, ignoreError = true) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (e) {
    if (!ignoreError) console.error(`Command failed: ${cmd}`);
    return '';
  }
}

function exists(path) {
  return existsSync(path);
}

console.log(`=== 削除対象分析: "${keyword}" ===\n`);

// 1. ファイル検索
console.log('【ファイル】');
const filePatterns = [
  `app/**/${keyword}/page.tsx`,
  `app/**/${keyword}/layout.tsx`,
  `app/api/**/${keyword}/route.ts`,
  `app/api/**/${keyword}*/route.ts`,
  `components/**/${keyword}*`,
  `lib/**/${keyword}/**`,
  `lib/**/${keyword}*`,
  `hooks/use${keyword}*`,
  `prompts/${keyword}*`,
  `types/${keyword}*`,
];

let foundFiles = [];
for (const pattern of filePatterns) {
  const result = runCommand(`find . -path "./node_modules" -prune -o -path "./.next" -prune -o -path "./.git" -prune -o -type f -name "${pattern.split('/').pop()}" -print 2>/dev/null | head -10`);
  if (result.trim()) {
    const files = result.trim().split('\n').filter(f => f.includes(keyword) || f.includes(keyword.replace('-', '')));
    foundFiles.push(...files);
  }
}

// 直接的なパスチェック
const directPaths = [
  `app/(authenticated)/${keyword}/page.tsx`,
  `app/api/${keyword}/route.ts`,
  `lib/${keyword}`,
  `prompts/${keyword}`,
];

for (const path of directPaths) {
  if (exists(path)) {
    foundFiles.push(path);
  }
}

foundFiles = [...new Set(foundFiles)];
if (foundFiles.length > 0) {
  foundFiles.forEach(f => console.log(`  📄 ${f}`));
} else {
  console.log('  なし');
}

// 2. コード参照検索
console.log('\n【コード参照】');
const codeRefs = runCommand(`grep -r "${keyword}" app/ lib/ components/ hooks/ prompts/ --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | grep -v node_modules | head -20`);
if (codeRefs.trim()) {
  const lines = codeRefs.trim().split('\n');
  lines.forEach(line => {
    const [file, ...rest] = line.split(':');
    const content = rest.join(':');
    console.log(`  📍 ${file}`);
    console.log(`     ${content.trim().substring(0, 80)}`);
  });
} else {
  console.log('  なし');
}

// 3. DB検索（skillがあれば）
console.log('\n【DBデータ】');
if (exists('.claude/skills/db-query/scripts/query.mjs')) {
  // SystemPrompt検索
  const sysPrompt = runCommand(`node .claude/skills/db-query/scripts/query.mjs find SystemPrompt "key~${keyword.toUpperCase()}" --fields key,name 2>/dev/null`);
  if (sysPrompt.includes('key:')) {
    console.log('  SystemPrompt:');
    const matches = sysPrompt.match(/key: (\w+)/g);
    if (matches) {
      matches.forEach(m => console.log(`    - ${m.replace('key: ', '')}`));
    }
  }
  
  // FeaturePrompt検索
  const featPrompt = runCommand(`node .claude/skills/db-query/scripts/query.mjs find FeaturePrompt "featureId=${keyword}" --fields featureId,promptKey 2>/dev/null`);
  if (featPrompt.includes('featureId:')) {
    console.log('  FeaturePrompt:');
    const matches = featPrompt.match(/featureId: ([\w-]+)/g);
    if (matches) {
      matches.forEach(m => console.log(`    - ${m.replace('featureId: ', '')}`));
    }
  }
} else {
  console.log('  db-queryスキルが見つかりません');
}

// 4. パッケージ検索
console.log('\n【パッケージ】');
const packageJson = runCommand('cat package.json 2>/dev/null');
if (packageJson.includes(keyword.toLowerCase())) {
  console.log(`  package.jsonに "${keyword}" を含むパッケージあり`);
  const lines = packageJson.split('\n');
  lines.forEach((line, i) => {
    if (line.toLowerCase().includes(keyword.toLowerCase())) {
      console.log(`    ${line.trim()}`);
    }
  });
} else {
  console.log('  なし');
}

// 5. ドキュメント検索
console.log('\n【ドキュメント】');
const docRefs = runCommand(`grep -r "${keyword}" docs/ README.md --include="*.md" 2>/dev/null`);
if (docRefs.trim()) {
  // 重複除去
  const files = [...new Set(docRefs.trim().split('\n').map(line => line.split(':')[0]))];
  files.slice(0, 10).forEach(file => {
    console.log(`  📄 ${file}`);
  });
  if (files.length > 10) {
    console.log(`  ... 他 ${files.length - 10} ファイル`);
  }
} else {
  console.log('  なし');
}

// 6. 依存関係の重要度分析
console.log('\n【依存関係の重要度】');
const criticalPatterns = [
  { pattern: 'agents.ts', desc: 'Agent定義（修正必須）' },
  { pattern: 'chat-config.ts', desc: 'チャット設定（修正必須）' },
  { pattern: 'constants.ts', desc: '定数定義（修正必須）' },
  { pattern: 'types.ts', desc: '型定義（修正必須）' },
  { pattern: 'db.ts', desc: 'DB設定（修正必須）' },
  { pattern: 'middleware.ts', desc: 'ミドルウェア（確認必要）' },
  { pattern: 'layout.tsx', desc: 'レイアウト（確認必要）' },
  { pattern: 'page.tsx', desc: 'ページ（削除対象）' },
];

let criticalFound = false;
for (const { pattern, desc } of criticalPatterns) {
  const hasMatch = codeRefs.includes(pattern);
  if (hasMatch) {
    console.log(`  ⚠️  ${pattern}: ${desc}`);
    criticalFound = true;
  }
}
if (!criticalFound) {
  console.log('  ✅ 重要な依存関係は検出されませんでした');
}

// 7. サマリー
console.log('\n=== サマリー ===');
console.log(`📁 ファイル: ${foundFiles.length}件`);
console.log(`📍 コード参照: ${codeRefs.trim() ? [...new Set(codeRefs.trim().split('\n'))].length : 0}件`);
console.log(`📄 ドキュメント: ${docRefs.trim() ? [...new Set(docRefs.trim().split('\n').map(l => l.split(':')[0]))].length : 0}件`);

console.log('\n=== 次のステップ ===');
console.log('1️⃣  削除前確認:');
console.log('   node pre-check.mjs "' + keyword + '"');
console.log('');
console.log('2️⃣  削除実行:');
console.log('   - 上記ファイルを削除');
console.log('   - コード参照を修正（型定義・定数・設定から削除）');
console.log('   - DBデータ削除（必要な場合）');
console.log('   - ドキュメントはアーカイブまたは削除');
console.log('');
console.log('3️⃣  削除確認:');
console.log('   node verify.mjs "' + keyword + '"');
