#!/usr/bin/env node
/**
 * Feature Cleanup - Audit Unused Features
 * 
 * 未使用機能を発見し、削除候補を提示するスクリプト
 * Sidebarにない機能、コメントアウトされている機能、参照が少ない機能を検出
 * 
 * Usage:
 *   node audit-unused.mjs
 * 
 * Options:
 *   --show-all    すべての機能を表示（Sidebarにあるものも含む）
 *   --min-refs N  最小参照数（デフォルト: 1、これ以下は未使用とみなす）
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

const args = process.argv.slice(2);
const showAll = args.includes('--show-all');
const minRefsArg = args.find(arg => arg.startsWith('--min-refs='));
const minRefs = minRefsArg ? parseInt(minRefsArg.split('=')[1]) : 1;

function runCommand(cmd, ignoreError = true) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', ignoreError ? 'ignore' : 'pipe'] });
  } catch (e) {
    return '';
  }
}

console.log('=== 未使用機能調査 ===\n');

// 1. Sidebarから表示されている機能を取得（コメントアウトを除外）
console.log('【Sidebar機能を取得中...】');
const sidebarContent = existsSync('components/layout/Sidebar.tsx') 
  ? readFileSync('components/layout/Sidebar.tsx', 'utf-8')
  : '';

// コメントを除外して解析
const lines = sidebarContent.split('\n');
const activeLines = [];
let inComment = false;

for (const line of lines) {
  const trimmed = line.trim();
  // ブロックコメント開始
  if (trimmed.startsWith('/*')) inComment = true;
  // ブロックコメント終了
  if (trimmed.includes('*/')) {
    inComment = false;
    continue;
  }
  // ラインコメント
  if (trimmed.startsWith('//')) continue;
  // ブロックコメント中
  if (inComment) continue;
  
  activeLines.push(line);
}

const activeContent = activeLines.join('\n');

const sidebarFeatures = [];
const hrefMatches = activeContent.match(/href: "\/chat\?agent=([^&"]+)/g);
if (hrefMatches) {
  hrefMatches.forEach(match => {
    const featureId = match.match(/agent=([^&"]+)/)?.[1];
    if (featureId && !sidebarFeatures.includes(featureId)) {
      sidebarFeatures.push(featureId);
    }
  });
}

// NEW_CHAT_BUTTONS からも取得（コメント除外済みのactiveContentから）
const labelMatches = activeContent.match(/label: "([^"]+)"/g);
if (labelMatches) {
  labelMatches.forEach(match => {
    const label = match.match(/label: "([^"]+)"/)?.[1];
    if (label && !sidebarFeatures.includes(label)) {
      sidebarFeatures.push(label);
    }
  });
}

console.log(`  Sidebarに表示されている機能: ${sidebarFeatures.length}件`);
sidebarFeatures.forEach(f => console.log(`    - ${f}`));

// 2. chat-config.ts から全機能を取得
console.log('\n【全機能を取得中...】');
const chatConfigContent = existsSync('lib/chat/chat-config.ts')
  ? readFileSync('lib/chat/chat-config.ts', 'utf-8')
  : '';

const allFeatures = [];
const featureIdMatches = chatConfigContent.match(/featureId: "([^"]+)"/g);
if (featureIdMatches) {
  featureIdMatches.forEach(match => {
    const featureId = match.match(/featureId: "([^"]+)"/)?.[1];
    if (featureId && !allFeatures.find(f => f.id === featureId)) {
      // タイトルを取得
      const titleMatch = chatConfigContent.match(new RegExp(`featureId: "${featureId}"[\\s\\S]{0,500}title: "([^"]+)"`));
      const title = titleMatch ? titleMatch[1] : '不明';
      
      allFeatures.push({ id: featureId, title });
    }
  });
}

console.log(`  定義されている全機能: ${allFeatures.length}件`);

// 3. 各機能の使用状況を調査
console.log('\n【使用状況調査中...】\n');

const featureAnalysis = [];

for (const feature of allFeatures) {
  const analysis = {
    ...feature,
    inSidebar: sidebarFeatures.includes(feature.id) || sidebarFeatures.some(s => s.includes(feature.title)),
    refsInCode: 0,
    refsInApp: 0,
    refsInLib: 0,
    hasPage: false,
    hasApi: false,
    isCommentedOut: false,
    dbRecord: null,
  };
  
  // コード内参照数
  const codeRefs = runCommand(`grep -r "${feature.id}" app/ lib/ components/ --include="*.ts" --include="*.tsx" 2>/dev/null`);
  const codeLines = codeRefs.trim().split('\n').filter(l => l.trim());
  analysis.refsInCode = codeLines.length;
  analysis.refsInApp = codeLines.filter(l => l.startsWith('app/')).length;
  analysis.refsInLib = codeLines.filter(l => l.startsWith('lib/')).length;
  
  // コメントアウトされているか
  analysis.isCommentedOut = codeLines.some(l => l.trim().startsWith('//') && l.includes(feature.id));
  
  // 専用ページがあるか
  analysis.hasPage = existsSync(`app/(authenticated)/${feature.id}/page.tsx`) ||
                     existsSync(`app/(authenticated)/${feature.id.replace('-', '_')}/page.tsx`);
  
  // APIがあるか
  analysis.hasApi = existsSync(`app/api/${feature.id}/route.ts`) ||
                    existsSync(`app/api/${feature.id.replace('-', '_')}/route.ts`);
  
  // DBレコード確認
  if (existsSync('.claude/skills/db-query/scripts/query.mjs')) {
    const dbResult = runCommand(`node .claude/skills/db-query/scripts/query.mjs find FeaturePrompt "featureId=${feature.id}" --fields isActive 2>/dev/null`);
    if (dbResult.includes('isActive:')) {
      const isActive = dbResult.includes('isActive: true');
      analysis.dbRecord = { exists: true, isActive };
    }
  }
  
  featureAnalysis.push(analysis);
}

// 4. カテゴリ分け
const categories = {
  active: [],      // Sidebarに表示されていて使用されている
  hidden: [],      // Sidebarにないがコードで使用されている
  unused: [],      // Sidebarにない、参照も少ない
  commented: [],   // コメントアウトされている
  noPage: [],      // 専用ページがない
};

for (const feature of featureAnalysis) {
  if (feature.isCommentedOut) {
    categories.commented.push(feature);
  } else if (feature.inSidebar) {
    categories.active.push(feature);
  } else if (feature.refsInCode <= minRefs) {
    categories.unused.push(feature);
  } else if (!feature.hasPage && !feature.hasApi) {
    categories.noPage.push(feature);
  } else {
    categories.hidden.push(feature);
  }
}

// 5. 結果表示
console.log('=== 調査結果 ===\n');

// アクティブ機能
if (showAll || categories.active.length > 0) {
  console.log(`【✅ アクティブ機能】(${categories.active.length}件)`);
  console.log('Sidebarに表示され、使用されている機能：\n');
  for (const f of categories.active) {
    console.log(`  ${f.title} (${f.id})`);
    console.log(`    参照: ${f.refsInCode}件 | ページ: ${f.hasPage ? 'あり' : 'なし'} | API: ${f.hasApi ? 'あり' : 'なし'}`);
  }
  console.log('');
}

// 非表示だが使用中
if (categories.hidden.length > 0) {
  console.log(`【⚠️ 非表示だが使用中】(${categories.hidden.length}件)`);
  console.log('Sidebarにないが、コードで参照されている機能：\n');
  for (const f of categories.hidden) {
    console.log(`  ${f.title} (${f.id})`);
    console.log(`    参照: ${f.refsInCode}件 (app: ${f.refsInApp}, lib: ${f.refsInLib})`);
    console.log(`    ページ: ${f.hasPage ? 'あり' : 'なし'} | API: ${f.hasApi ? 'あり' : 'なし'}`);
    if (f.dbRecord) {
      console.log(`    DB: ${f.dbRecord.isActive ? '有効' : '無効'}`);
    }
    console.log('');
  }
}

// 未使用（削除候補）
if (categories.unused.length > 0) {
  console.log(`【🗑️ 削除候補（未使用）】(${categories.unused.length}件)`);
  console.log('Sidebarになく、参照も少ない機能：\n');
  for (const f of categories.unused) {
    console.log(`  ${f.title} (${f.id})`);
    console.log(`    参照: ${f.refsInCode}件`);
    console.log(`    ページ: ${f.hasPage ? 'あり ⚠️' : 'なし'} | API: ${f.hasApi ? 'あり ⚠️' : 'なし'}`);
    if (f.dbRecord) {
      console.log(`    DB: ${f.dbRecord.isActive ? '有効' : '無効'}`);
    }
    console.log(`    → 削除候補: node analyze.mjs "${f.id}"`);
    console.log('');
  }
}

// コメントアウト済み
if (categories.commented.length > 0) {
  console.log(`【💬 コメントアウト済み】(${categories.commented.length}件)`);
  console.log('コードがコメントアウトされている機能：\n');
  for (const f of categories.commented) {
    console.log(`  ${f.title} (${f.id})`);
    console.log(`    → 完全削除の候補`);
    console.log('');
  }
}

// ページ/APIなし
if (categories.noPage.length > 0) {
  console.log(`【📄 ページ/APIなし】(${categories.noPage.length}件)`);
  console.log('専用ページやAPIがない機能（設定のみ）：\n');
  for (const f of categories.noPage) {
    console.log(`  ${f.title} (${f.id})`);
    console.log(`    参照: ${f.refsInCode}件`);
    console.log('');
  }
}

// 6. 削除候補サマリー
console.log('=== 削除候補サマリー ===\n');
const deletionCandidates = [...categories.unused, ...categories.commented];

if (deletionCandidates.length === 0) {
  console.log('✅ 明確な削除候補はありません');
} else {
  console.log(`削除を検討すべき機能: ${deletionCandidates.length}件\n`);
  for (const f of deletionCandidates) {
    console.log(`  - ${f.title} (${f.id})`);
  }
  console.log('');
  console.log('詳細調査と削除手順：');
  console.log('  1. node analyze.mjs "[機能ID]"    # 詳細調査');
  console.log('  2. node pre-check.mjs "[機能ID]"  # 削除前確認');
  console.log('  3. （ユーザー確認後）削除実行');
  console.log('  4. node verify.mjs "[機能ID]"     # 削除確認');
}
