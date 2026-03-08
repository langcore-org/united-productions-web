#!/usr/bin/env node
/**
 * Feature Cleanup - Risk Analysis
 * 
 * 削除によるリスクを網羅的に調査するスクリプト
 * 
 * Usage:
 *   node analyze-risk.mjs [KEYWORD]
 * 
 * Example:
 *   node analyze-risk.mjs "na-script"
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

const keyword = process.argv[2];

if (!keyword) {
  console.error('Usage: node analyze-risk.mjs [KEYWORD]');
  console.error('Example: node analyze-risk.mjs "na-script"');
  process.exit(1);
}

function runCommand(cmd, ignoreError = true) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', ignoreError ? 'ignore' : 'pipe'] });
  } catch (e) {
    return '';
  }
}

function exists(path) {
  return existsSync(path);
}

console.log(`=== 削除リスク分析: "${keyword}" ===\n`);

const risks = {
  critical: [],
  high: [],
  medium: [],
  low: [],
};

// 1. ファイル依存関係の調査
console.log('【📁 ファイル依存関係】');

// 削除対象ファイル
const filesToDelete = [];
const checkPaths = [
  `app/(authenticated)/${keyword}`,
  `app/(authenticated)/${keyword.replace('-', '_')}`,
  `app/api/${keyword}`,
  `app/api/${keyword.replace('-', '_')}`,
  `lib/${keyword}`,
  `prompts/${keyword}*`,
];

for (const path of checkPaths) {
  if (exists(path)) {
    filesToDelete.push(path);
  }
}

if (filesToDelete.length > 0) {
  console.log(`削除対象ファイル: ${filesToDelete.length}件`);
  filesToDelete.forEach(f => console.log(`  - ${f}`));
} else {
  console.log('削除対象ファイル: なし');
}

// 2. コード参照の詳細調査
console.log('\n【💻 コード参照詳細】');
const allRefs = runCommand(`grep -rn "${keyword}" app/ lib/ components/ hooks/ prompts/ --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null`);
const refLines = allRefs.trim().split('\n').filter(l => l.trim());

// 参照をカテゴリ別に分類
const refsByType = {
  typeDefinition: [],      // 型定義
  constant: [],            // 定数
  import: [],              // import
  function: [],            // 関数呼び出し
  config: [],              // 設定
  ui: [],                  // UI（JSX）
  comment: [],             // コメント
  other: [],
};

for (const line of refLines) {
  const [file, ...contentParts] = line.split(':');
  const content = contentParts.join(':');
  
  if (content.includes('type ') || content.includes('interface ') || content.includes('| "')) {
    refsByType.typeDefinition.push({ file, content: content.trim() });
  } else if (content.includes('import ')) {
    refsByType.import.push({ file, content: content.trim() });
  } else if (content.includes('const ') || content.includes(': "')) {
    refsByType.constant.push({ file, content: content.trim() });
  } else if (content.includes('(') && content.includes(')')) {
    refsByType.function.push({ file, content: content.trim() });
  } else if (content.includes('{') && content.includes('}')) {
    refsByType.config.push({ file, content: content.trim() });
  } else if (content.includes('<') || content.includes('jsx')) {
    refsByType.ui.push({ file, content: content.trim() });
  } else if (content.trim().startsWith('//') || content.trim().startsWith('*')) {
    refsByType.comment.push({ file, content: content.trim() });
  } else {
    refsByType.other.push({ file, content: content.trim() });
  }
}

console.log(`総参照数: ${refLines.length}件`);
console.log(`  - 型定義: ${refsByType.typeDefinition.length}件`);
console.log(`  - 定数: ${refsByType.constant.length}件`);
console.log(`  - import: ${refsByType.import.length}件`);
console.log(`  - 関数呼び出し: ${refsByType.function.length}件`);
console.log(`  - 設定: ${refsByType.config.length}件`);
console.log(`  - UI: ${refsByType.ui.length}件`);
console.log(`  - コメント: ${refsByType.comment.length}件`);

// 重要な参照をリスクとして記録
if (refsByType.typeDefinition.length > 0) {
  risks.critical.push({
    type: '型定義',
    desc: 'TypeScript型システムで使用されている',
    files: [...new Set(refsByType.typeDefinition.map(r => r.file))],
    impact: '削除すると型エラーが発生',
  });
}

if (refsByType.import.length > 0) {
  risks.high.push({
    type: 'import依存',
    desc: '他ファイルからimportされている',
    files: [...new Set(refsByType.import.map(r => r.file))],
    impact: 'モジュール解決エラーが発生',
  });
}

// 3. 他機能への依存関係
console.log('\n【🔗 他機能への影響】');

// 共有設定の確認
const sharedConfigs = [];
if (exists('lib/settings/db.ts')) {
  const dbContent = readFileSync('lib/settings/db.ts', 'utf-8');
  if (dbContent.includes(keyword)) {
    sharedConfigs.push('lib/settings/db.ts');
  }
}
if (exists('lib/chat/agents.ts')) {
  const agentsContent = readFileSync('lib/chat/agents.ts', 'utf-8');
  if (agentsContent.includes(keyword)) {
    sharedConfigs.push('lib/chat/agents.ts');
  }
}
if (exists('lib/chat/chat-config.ts')) {
  const configContent = readFileSync('lib/chat/chat-config.ts', 'utf-8');
  if (configContent.includes(keyword)) {
    sharedConfigs.push('lib/chat/chat-config.ts');
  }
}

if (sharedConfigs.length > 0) {
  console.log('共有設定ファイルに依存:');
  sharedConfigs.forEach(f => console.log(`  - ${f}`));
  
  risks.critical.push({
    type: '共有設定への依存',
    desc: '複数機能で共有される設定ファイルに含まれている',
    files: sharedConfigs,
    impact: '他機能の設定も修正が必要',
  });
} else {
  console.log('共有設定への依存: なし');
}

// 4. データ影響の調査
console.log('\n【💾 データ影響】');

// DBレコード数の確認
let dbStats = null;
if (exists('.claude/skills/db-query/scripts/query.mjs')) {
  // SystemPrompt
  const sysPromptResult = runCommand(`node .claude/skills/db-query/scripts/query.mjs find SystemPrompt "key~${keyword.toUpperCase()}" 2>/dev/null`);
  const sysPromptCount = sysPromptResult.match(/found: (\d+)/)?.[1] || '0';
  
  // FeaturePrompt
  const featPromptResult = runCommand(`node .claude/skills/db-query/scripts/query.mjs find FeaturePrompt "featureId=${keyword}" 2>/dev/null`);
  const featPromptCount = featPromptResult.match(/found: (\d+)/)?.[1] || '0';
  
  // ユーザーデータ（Chat, Message等）
  const chatResult = runCommand(`node .claude/skills/db-query/scripts/query.mjs find Chat "featureId=${keyword}" --limit 100 2>/dev/null`);
  const chatCount = chatResult.match(/found: (\d+)/)?.[1] || '0';
  
  dbStats = {
    systemPrompt: parseInt(sysPromptCount),
    featurePrompt: parseInt(featPromptCount),
    chat: parseInt(chatCount),
  };
  
  console.log(`SystemPrompt: ${dbStats.systemPrompt}件`);
  console.log(`FeaturePrompt: ${dbStats.featurePrompt}件`);
  console.log(`Chat履歴: ${dbStats.chat}件`);
  
  if (dbStats.chat > 0) {
    risks.high.push({
      type: 'ユーザーデータ',
      desc: `ユーザーが作成した${dbStats.chat}件のデータが存在`,
      impact: '削除するとユーザーが過去のチャットにアクセスできなくなる',
      mitigation: 'データはアーカイブまたは移行が必要',
    });
  }
} else {
  console.log('DB調査スキルが見つかりません');
}

// 5. ビルド・テストへの影響予測
console.log('\n【🔨 ビルド・テストへの影響予測】');

// TypeScriptエラーの予測
let typeErrors = 0;
if (refsByType.typeDefinition.length > 0) typeErrors += refsByType.typeDefinition.length;
if (refsByType.import.length > 0) typeErrors += refsByType.import.length;
if (refsByType.constant.length > 0) typeErrors += refsByType.constant.length;

console.log(`予想される型エラー: ~${typeErrors}件`);

// テストファイルの確認
const testRefs = runCommand(`grep -rn "${keyword}" tests/ --include="*.ts" --include="*.tsx" --include="*.spec.ts" 2>/dev/null`);
const testCount = testRefs.trim().split('\n').filter(l => l.trim()).length;
console.log(`関連テスト: ${testCount}件`);

if (testCount > 0) {
  risks.medium.push({
    type: 'テストへの影響',
    desc: `${testCount}件のテストが該当機能を参照`,
    impact: 'テストが失敗する可能性あり',
  });
}

// 6. 復元の難易度評価
console.log('\n【♻️ 復元の難易度】');

const restorationDifficulty = {
  files: filesToDelete.length,
  codeRefs: refLines.length,
  dbRecords: dbStats ? dbStats.systemPrompt + dbStats.featurePrompt : 0,
};

let difficulty = '低';
if (restorationDifficulty.codeRefs > 20) difficulty = '中';
if (restorationDifficulty.codeRefs > 50 || restorationDifficulty.dbRecords > 5) difficulty = '高';

console.log(`復元難易度: ${difficulty}`);
console.log(`  - 削除対象ファイル: ${restorationDifficulty.files}件`);
console.log(`  - コード参照: ${restorationDifficulty.codeRefs}件`);
console.log(`  - DBレコード: ${restorationDifficulty.dbRecords}件`);

if (difficulty === '高') {
  risks.high.push({
    type: '復元の難易度',
    desc: '削除後の復元が困難',
    impact: 'git revert以外の方法での復元が必要になる可能性',
  });
}

// 7. リスクサマリー
console.log('\n' + '='.repeat(60));
console.log('【⚠️ リスクサマリー】');
console.log('='.repeat(60));

if (risks.critical.length > 0) {
  console.log('\n🔴 重大なリスク:');
  risks.critical.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.type}`);
    console.log(`     ${r.desc}`);
    console.log(`     影響: ${r.impact}`);
    if (r.files) {
      console.log(`     対象ファイル: ${r.files.join(', ')}`);
    }
  });
}

if (risks.high.length > 0) {
  console.log('\n🟠 高リスク:');
  risks.high.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.type}`);
    console.log(`     ${r.desc}`);
    console.log(`     影響: ${r.impact}`);
    if (r.mitigation) {
      console.log(`     対策: ${r.mitigation}`);
    }
  });
}

if (risks.medium.length > 0) {
  console.log('\n🟡 中リスク:');
  risks.medium.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.type}`);
    console.log(`     ${r.desc}`);
    console.log(`     影響: ${r.impact}`);
  });
}

if (risks.critical.length === 0 && risks.high.length === 0 && risks.medium.length === 0) {
  console.log('\n✅ 重大なリスクは検出されませんでした');
}

// 8. 推奨アクション
console.log('\n' + '='.repeat(60));
console.log('【📋 推奨アクション】');
console.log('='.repeat(60));

// エージェント向けの推奨モード決定
let recommendedMode = 'simple';
if (risks.critical.length > 0) {
  recommendedMode = 'step-by-step';
} else if (risks.high.length > 0 || difficulty === '高') {
  recommendedMode = 'gradual';
} else if (dbStats && dbStats.chat > 10) {
  recommendedMode = 'with-data-migration';
}

console.log('\n削除実行前の準備:');
console.log('  1. 必ずgitコミットを作成');
console.log('  2. ステージング環境で削除テスト');
console.log('  3. 本番DBのバックアップ（DB削除の場合）');

console.log('\n削除手順:');
if (risks.critical.length > 0) {
  console.log('  ⚠️ 重大なリスクがあります。慎重に進めてください。');
}
console.log('  1. ファイル削除');
console.log('  2. コード参照の修正');
if (dbStats && dbStats.chat > 0) {
  console.log('  3. ユーザーデータの移行検討');
}
if (dbStats && dbStats.systemPrompt > 0) {
  console.log('  4. DBデータ削除');
}
console.log('  5. ビルド・テスト実行');

console.log('\n推奨する削除方針:');
if (difficulty === '高') {
  console.log('  【段階的削除】1つのコンポーネントずつ削除し、都度ビルド確認');
} else if (difficulty === '中') {
  console.log('  【一括削除】まとめて削除し、まとめて修正');
} else {
  console.log('  【簡易削除】単純な削除で問題なし');
}

// エージェント向けの出力（機械的にパース可能）
console.log('\n' + '='.repeat(60));
console.log('【🤖 エージェント向け情報】');
console.log('='.repeat(60));
console.log(`RECOMMENDED_MODE: ${recommendedMode}`);
console.log(`RISK_LEVEL: ${risks.critical.length > 0 ? 'CRITICAL' : risks.high.length > 0 ? 'HIGH' : risks.medium.length > 0 ? 'MEDIUM' : 'LOW'}`);
console.log(`CRITICAL_COUNT: ${risks.critical.length}`);
console.log(`HIGH_COUNT: ${risks.high.length}`);
console.log(`MEDIUM_COUNT: ${risks.medium.length}`);
console.log(`TOTAL_REFS: ${refLines.length}`);
console.log(`HAS_USER_DATA: ${dbStats && dbStats.chat > 0 ? 'YES' : 'NO'}`);
console.log(`USER_DATA_COUNT: ${dbStats ? dbStats.chat : 0}`);
console.log(`RESTORATION_DIFFICULTY: ${difficulty}`);
console.log(`CAN_AUTOFIX: ${refsByType.import.length === 0 && risks.critical.length <= 1 ? 'YES' : 'NO'}`);

console.log('');
