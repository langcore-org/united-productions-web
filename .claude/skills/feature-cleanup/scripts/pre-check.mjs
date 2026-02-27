#!/usr/bin/env node
/**
 * Feature Cleanup - Pre-Check Script
 * 
 * 削除前の確認を行うスクリプト
 * 
 * Usage:
 *   node pre-check.mjs [KEYWORD]
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const keyword = process.argv[2];

if (!keyword) {
  console.error('Usage: node pre-check.mjs [KEYWORD]');
  process.exit(1);
}

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (e) {
    return '';
  }
}

console.log(`=== 削除前確認: "${keyword}" ===\n`);

// 1. Git状態確認
console.log('【Git状態】');
const gitStatus = runCommand('git status --porcelain');
if (gitStatus.trim()) {
  console.log('⚠️  未コミットの変更があります:');
  console.log(gitStatus.substring(0, 200));
  console.log('\n💡 先にコミットしてください:');
  console.log('   git add .');
  console.log('   git commit -m "backup: before removing ' + keyword + '"');
} else {
  console.log('✅ クリーンな状態（未コミット変更なし）');
}

// 2. 削除対象ファイル確認
console.log('\n【削除対象ファイル】');
const checkPaths = [
  `app/(authenticated)/${keyword}`,
  `app/api/${keyword}`,
  `lib/${keyword}`,
  `prompts/${keyword}`,
  `hooks/use${keyword}`,
];

let foundCount = 0;
for (const path of checkPaths) {
  if (existsSync(path)) {
    console.log(`  📁 ${path}`);
    foundCount++;
  }
}

if (foundCount === 0) {
  console.log('  ⚠️  削除対象ファイルが見つかりません');
}

// 3. 依存関係チェック
console.log('\n【依存関係チェック】');
const refs = runCommand(`grep -r "${keyword}" app/ lib/ components/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l`);
const refCount = parseInt(refs.trim()) || 0;

if (refCount > 0) {
  console.log(`  📊 ${refCount}箇所の参照があります`);
  
  // 重要な参照をチェック
  const importantFiles = ['agents.ts', 'config.ts', 'constants.ts', 'types.ts'];
  for (const file of importantFiles) {
    const hasRef = runCommand(`grep -r "${keyword}" lib/**/${file} --include="*.ts" 2>/dev/null`);
    if (hasRef.trim()) {
      console.log(`  ⚠️  ${file} に参照あり（型定義・定数を修正必要）`);
    }
  }
} else {
  console.log('  ✅ コード参照はありません');
}

// 4. DBデータ確認
console.log('\n【DBデータ確認】');
if (existsSync('.claude/skills/db-query/scripts/query.mjs')) {
  const sysPrompt = runCommand(`node .claude/skills/db-query/scripts/query.mjs find SystemPrompt "key~${keyword.toUpperCase()}" 2>/dev/null | grep "found:"`);
  const featPrompt = runCommand(`node .claude/skills/db-query/scripts/query.mjs find FeaturePrompt "featureId=${keyword}" 2>/dev/null | grep "found:"`);
  
  if (sysPrompt.includes('found:') && !sysPrompt.includes('found: 0')) {
    console.log(`  📊 SystemPrompt: ${sysPrompt.trim()}`);
  }
  if (featPrompt.includes('found:') && !featPrompt.includes('found: 0')) {
    console.log(`  📊 FeaturePrompt: ${featPrompt.trim()}`);
  }
  if ((!sysPrompt.includes('found:') || sysPrompt.includes('found: 0')) &&
      (!featPrompt.includes('found:') || featPrompt.includes('found: 0'))) {
    console.log('  ✅ DBデータはありません');
  }
} else {
  console.log('  ℹ️  db-queryスキルが見つかりません');
}

// 5. 警告・注意事項
console.log('\n【チェックリスト】');
console.log('  ☐ バックアップコミット済み？');
console.log('  ☐ 本番環境への影響は？');
console.log('  ☐ 他の機能への依存は？');
console.log('  ☐ DB削除が必要？');

console.log('\n=== 準備完了 ===');
console.log('削除を開始する場合:');
console.log('1. 上記チェックリストを確認');
console.log('2. ファイル削除・コード修正実行');
console.log('3. node verify.mjs "' + keyword + '" で削除確認');
