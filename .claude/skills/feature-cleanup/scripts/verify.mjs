#!/usr/bin/env node
/**
 * Feature Cleanup - Verify Script
 * 
 * 削除後の確認を行うスクリプト
 * 削除忘れがないかチェック
 * 
 * Usage:
 *   node verify.mjs [KEYWORD]
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const keyword = process.argv[2];

if (!keyword) {
  console.error('Usage: node verify.mjs [KEYWORD]');
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

console.log(`=== 削除確認: "${keyword}" ===\n`);

let allPassed = true;

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

for (const path of checkPaths) {
  if (checkFile(path)) {
    console.log(`  ❌ ${path} が残っています`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('  ✅ すべてのファイルが削除されています');
}

// 2. コード参照残存確認
console.log('\n【コード参照確認】');
const refs = runCommand(`grep -r "${keyword}" app/ lib/ components/ hooks/ prompts/ --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null`);

if (refs.trim()) {
  console.log('  ❌ コード参照が残っています:');
  const lines = refs.trim().split('\n').slice(0, 10);
  lines.forEach(line => {
    const [file, content] = line.split(':');
    console.log(`     ${file}: ${content?.trim().substring(0, 50) || ''}`);
  });
  if (refs.trim().split('\n').length > 10) {
    console.log(`     ... 他 ${refs.trim().split('\n').length - 10} 件`);
  }
  allPassed = false;
} else {
  console.log('  ✅ コード参照はありません');
}

// 3. DBデータ残存確認
console.log('\n【DBデータ確認】');
let dbClean = true;

if (existsSync('.claude/skills/db-query/scripts/query.mjs')) {
  // SystemPrompt確認
  const sysPromptResult = runCommand(`node .claude/skills/db-query/scripts/query.mjs find SystemPrompt "key~${keyword.toUpperCase()}" 2>/dev/null`, false);
  const sysPromptCount = sysPromptResult.match(/found: (\d+)/)?.[1] || '0';
  
  if (parseInt(sysPromptCount) > 0) {
    console.log(`  ❌ SystemPrompt: ${sysPromptCount}件残存`);
    dbClean = false;
    allPassed = false;
  } else {
    console.log('  ✅ SystemPrompt: 削除済');
  }
  
  // FeaturePrompt確認
  const featPromptResult = runCommand(`node .claude/skills/db-query/scripts/query.mjs find FeaturePrompt "featureId=${keyword}" 2>/dev/null`, false);
  const featPromptCount = featPromptResult.match(/found: (\d+)/)?.[1] || '0';
  
  if (parseInt(featPromptCount) > 0) {
    console.log(`  ❌ FeaturePrompt: ${featPromptCount}件残存`);
    dbClean = false;
    allPassed = false;
  } else {
    console.log('  ✅ FeaturePrompt: 削除済');
  }
} else {
  console.log('  ℹ️  db-queryスキルが見つかりません（手動で確認してください）');
}

// 4. 詳細な参照チェック（重要なファイル）
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
    if (content.includes(keyword)) {
      console.log(`  ❌ ${file}: 参照あり`);
      allPassed = false;
    } else {
      console.log(`  ✅ ${file}: クリア`);
    }
  }
}

// 5. ビルドテスト
console.log('\n【ビルドテスト】');
console.log('  型チェック実行中...');
const typeCheck = runCommand('npx tsc --noEmit 2>&1', false);
if (typeCheck.includes('error')) {
  console.log('  ❌ 型エラーがあります:');
  const errors = typeCheck.split('\n').filter(l => l.includes('error')).slice(0, 5);
  errors.forEach(e => console.log(`     ${e.substring(0, 100)}`));
  allPassed = false;
} else {
  console.log('  ✅ 型チェック通過');
}

// 6. Lintチェック（任意）
console.log('\n【Lintチェック】');
const lint = runCommand('npm run lint 2>&1', true);
if (lint.includes('error') || lint.includes('Error')) {
  console.log('  ⚠️  Lintエラーがあります（警告として表示）');
} else {
  console.log('  ✅ Lintチェック通過');
}

// 6. サマリー
console.log('\n=== 確認結果 ===');
if (allPassed) {
  console.log('✅ すべての削除が完了しています');
  console.log('\n次のステップ:');
  console.log('1. git add .');
  console.log(`2. git commit -m "cleanup: remove ${keyword}"`);
  process.exit(0);
} else {
  console.log('❌ 削除し忘れがあります');
  console.log('\n修正が必要な項目を確認し、削除を完了させてください。');
  console.log('再度確認する場合:');
  console.log(`  node verify.mjs "${keyword}"`);
  process.exit(1);
}
