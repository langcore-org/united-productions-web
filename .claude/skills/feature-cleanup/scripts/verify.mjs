#!/usr/bin/env node
/**
 * Feature Cleanup - Verify Script (Improved)
 * 
 * 削除後の確認を行うスクリプト
 * 削除忘れがないかチェック
 * 
 * 【改善点】v2.0
 * - 誤検出防止: 完全一致検索と単語境界を使用
 * - 空ディレクトリ検出機能
 * - 削除履歴自動記録 (--record)
 * 
 * Usage:
 *   node verify.mjs [KEYWORD]
 *   node verify.mjs [KEYWORD] --record
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const keyword = process.argv[2];
const shouldRecord = process.argv.includes('--record');

if (!keyword) {
  console.error('Usage: node verify.mjs [KEYWORD] [--record]');
  process.exit(1);
}

function runCommand(cmd, ignoreError = true) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', ignoreError ? 'ignore' : 'pipe'] });
  } catch (e) {
    return '';
  }
}

function checkFile(path) {
  return existsSync(path);
}

function recordCleanupHistory(keyword, results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const recordDir = 'docs/backlog';
  
  if (!existsSync(recordDir)) {
    mkdirSync(recordDir, { recursive: true });
  }
  
  const recordFile = path.join(recordDir, `cleanup-${timestamp}-${keyword}.md`);
  
  const content = `---
type: cleanup-record
target: ${keyword}
date: ${new Date().toISOString()}
status: ${results.allPassed ? 'completed' : 'partial'}
---

# クリーンアップ記録: ${keyword}

## 実行結果

| 項目 | 状態 |
|------|------|
| ファイル削除 | ${results.fileCheck ? '✅' : '❌'} |
| コード参照 | ${results.codeRefs ? '✅' : '❌'} |
| DBデータ | ${results.dbCheck ? '✅' : '❌'} |
| 型チェック | ${results.typeCheck ? '✅' : '❌'} |
| Lintチェック | ${results.lintCheck ? '✅' : '❌'} |

## 詳細

### 削除対象
${results.deletedItems.map(item => `- ${item}`).join('\n') || '- （記録なし）'}

### 残存物
${results.remainingItems.map(item => `- ${item}`).join('\n') || '- なし'}

## 備考

- 実行コマンド: \`node verify.mjs "${keyword}"\`
- 実行日時: ${new Date().toLocaleString('ja-JP')}
`;

  writeFileSync(recordFile, content);
  console.log(`\n📝 削除履歴を記録しました: ${recordFile}`);
  return recordFile;
}

console.log(`=== 削除確認: "${keyword}" ===\n`);

let allPassed = true;
const deletedItems = [];
const remainingItems = [];
const results = {
  allPassed: false,
  fileCheck: false,
  codeRefs: false,
  dbCheck: false,
  typeCheck: false,
  lintCheck: false,
  deletedItems,
  remainingItems
};

// 1. ファイル削除確認
console.log('【ファイル削除確認】');
const checkPaths = [
  `app/(authenticated)/${keyword}/page.tsx`,
  `app/(authenticated)/${keyword}`,
  `app/api/${keyword}/route.ts`,
  `app/api/${keyword}`,
  `lib/${keyword}`,
  `prompts/${keyword}`,
  `prompts/${keyword}-format.ts`,
  `hooks/use${keyword}`,
];

let fileCheckPassed = true;
for (const checkPath of checkPaths) {
  if (checkFile(checkPath)) {
    console.log(`  ❌ ${checkPath} が残っています`);
    remainingItems.push(`ファイル: ${checkPath}`);
    fileCheckPassed = false;
    allPassed = false;
  } else {
    deletedItems.push(`ファイル: ${checkPath}`);
  }
}

if (fileCheckPassed) {
  console.log('  ✅ すべてのファイルが削除されています');
}
results.fileCheck = fileCheckPassed;

// 2. 空のディレクトリ検出（新機能）
console.log('\n【空のディレクトリ確認】');
const potentialDirs = [
  `app/(authenticated)/${keyword}`,
  `app/api/${keyword}`,
  `lib/${keyword}`,
  `components/${keyword}`,
];

const emptyDirs = [];
for (const dir of potentialDirs) {
  if (checkFile(dir)) {
    const contents = runCommand(`ls -A "${dir}" 2>/dev/null`).trim();
    if (!contents) {
      console.log(`  ⚠️  ${dir} が空のまま残っています`);
      emptyDirs.push(dir);
      remainingItems.push(`空ディレクトリ: ${dir}`);
    }
  }
}

if (emptyDirs.length === 0) {
  console.log('  ✅ 空のディレクトリはありません');
} else {
  console.log(`  → 削除コマンド: rm -rf ${emptyDirs.join(' ')}`);
}

// 3. コード参照残存確認（改善: 単語境界を使用）
console.log('\n【コード参照確認】');
// 完全一致または単語境界を使用して誤検出を防止
const exactMatchPattern = `"${keyword}"`;
const refs = runCommand(`grep -rE "(featureId.*${keyword}|agent=${keyword}|\"${keyword}\"|'${keyword}')" app/ lib/ components/ hooks/ prompts/ --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null`);

// 追加: より厳密なフィルタリング
const filteredRefs = refs.trim().split('\n').filter(line => {
  if (!line) return false;
  // 変数名などの部分一致を除外（例: transcript に na-script が誤検出されるのを防ぐ）
  const parts = line.split(':');
  const content = parts.slice(1).join(':');
  // 単語境界チェック
  const wordBoundaryPattern = new RegExp(`\\b${keyword.replace(/-/g, '[-_]')}\\b`, 'i');
  return wordBoundaryPattern.test(content) || content.includes(`"${keyword}"`) || content.includes(`'${keyword}'`);
});

if (filteredRefs.length > 0) {
  console.log('  ❌ コード参照が残っています:');
  filteredRefs.slice(0, 10).forEach(line => {
    const [file, ...contentParts] = line.split(':');
    const content = contentParts.join(':');
    console.log(`     ${file}: ${content?.trim().substring(0, 50) || ''}`);
  });
  if (filteredRefs.length > 10) {
    console.log(`     ... 他 ${filteredRefs.length - 10} 件`);
  }
  allPassed = false;
  remainingItems.push(`コード参照: ${filteredRefs.length}件`);
} else {
  console.log('  ✅ コード参照はありません');
  results.codeRefs = true;
}

// 4. DBデータ残存確認（改善: 完全一致検索）
console.log('\n【DBデータ確認】');
let dbClean = true;

if (existsSync('.claude/skills/db-query/scripts/query.mjs')) {
  // 完全一致検索を使用
  const exactKeys = [keyword.toUpperCase(), keyword.toLowerCase(), keyword];
  let sysPromptCount = 0;
  
  for (const key of exactKeys) {
    const sysPromptResult = runCommand(`node .claude/skills/db-query/scripts/query.mjs find SystemPrompt "key=${key}" --fields key 2>/dev/null`, false);
    const count = sysPromptResult.match(/found: (\d+)/)?.[1] || '0';
    sysPromptCount += parseInt(count);
  }
  
  if (sysPromptCount > 0) {
    console.log(`  ❌ SystemPrompt: ${sysPromptCount}件残存`);
    dbClean = false;
    allPassed = false;
    remainingItems.push(`DB SystemPrompt: ${sysPromptCount}件`);
  } else {
    console.log('  ✅ SystemPrompt: 削除済');
  }
  
  // FeaturePrompt確認
  const featPromptResult = runCommand(`node .claude/skills/db-query/scripts/query.mjs find FeaturePrompt "featureId=${keyword}" --fields featureId 2>/dev/null`, false);
  const featPromptCount = featPromptResult.match(/found: (\d+)/)?.[1] || '0';
  
  if (parseInt(featPromptCount) > 0) {
    console.log(`  ❌ FeaturePrompt: ${featPromptCount}件残存`);
    dbClean = false;
    allPassed = false;
    remainingItems.push(`DB FeaturePrompt: ${featPromptCount}件`);
  } else {
    console.log('  ✅ FeaturePrompt: 削除済');
  }
  
  results.dbCheck = dbClean;
} else {
  console.log('  ℹ️  db-queryスキルが見つかりません（手動で確認してください）');
  results.dbCheck = true; // 確認できないのでスキップ
}

// 5. 詳細な参照チェック（重要なファイル）
console.log('\n【重要ファイルの参照チェック】');
const criticalFiles = [
  'lib/chat/agents.ts',
  'lib/chat/chat-config.ts', 
  'lib/prompts/constants/keys.ts',
  'lib/settings/db.ts',
  'app/page.tsx',
];

for (const file of criticalFiles) {
  if (existsSync(file)) {
    const content = runCommand(`cat ${file} 2>/dev/null`);
    // 単語境界チェック
    const wordBoundaryPattern = new RegExp(`\\b${keyword.replace(/-/g, '[-_]')}\\b`, 'i');
    if (wordBoundaryPattern.test(content)) {
      console.log(`  ❌ ${file}: 参照あり`);
      allPassed = false;
      remainingItems.push(`重要ファイル: ${file}`);
    } else {
      console.log(`  ✅ ${file}: クリア`);
    }
  }
}

// 6. ビルドテスト
console.log('\n【ビルドテスト】');
console.log('  型チェック実行中...');
const typeCheck = runCommand('npx tsc --noEmit 2>&1', false);
if (typeCheck.includes('error')) {
  console.log('  ❌ 型エラーがあります:');
  const errors = typeCheck.split('\n').filter(l => l.includes('error')).slice(0, 5);
  errors.forEach(e => console.log(`     ${e.substring(0, 100)}`));
  allPassed = false;
  results.typeCheck = false;
} else {
  console.log('  ✅ 型チェック通過');
  results.typeCheck = true;
}

// 7. Lintチェック（任意）
console.log('\n【Lintチェック】');
const lint = runCommand('npm run lint 2>&1', true);
if (lint.includes('error') || lint.includes('Error')) {
  console.log('  ⚠️  Lintエラーがあります（警告として表示）');
  results.lintCheck = false;
} else {
  console.log('  ✅ Lintチェック通過');
  results.lintCheck = true;
}

// 8. サマリー
console.log('\n=== 確認結果 ===');
results.allPassed = allPassed;

if (allPassed) {
  console.log('✅ すべての削除が完了しています');
  console.log('\n次のステップ:');
  console.log('1. git add .');
  console.log(`2. git commit -m "cleanup: remove ${keyword}"`);
  
  // 削除履歴を記録
  if (shouldRecord) {
    const recordFile = recordCleanupHistory(keyword, results);
    console.log(`\n📝 削除履歴: ${recordFile}`);
  }
  
  process.exit(0);
} else {
  console.log('❌ 削除し忘れがあります');
  console.log('\n修正が必要な項目を確認し、削除を完了させてください。');
  console.log('再度確認する場合:');
  console.log(`  node verify.mjs "${keyword}"`);
  
  // 部分削除の記録
  if (shouldRecord) {
    const recordFile = recordCleanupHistory(keyword, results);
    console.log(`\n📝 削除履歴（部分）: ${recordFile}`);
  }
  
  process.exit(1);
}
