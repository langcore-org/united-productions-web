#!/usr/bin/env node
/**
 * Feature Cleanup - Audit Unused Features (Enhanced v2.0)
 * 
 * 未使用機能を発見し、削除候補を提示するスクリプト
 * 
 * 【改善点】v2.0
 * - 空のディレクトリ検出機能
 * - 削除スクリプト自動生成 (--generate-delete)
 * - 対話的削除モード (--interactive)
 * 
 * Usage:
 *   node audit-unused.mjs
 *   node audit-unused.mjs --deep
 *   node audit-unused.mjs --generate-delete [機能ID]
 *   node audit-unused.mjs --interactive
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const showAll = args.includes('--deep') || args.includes('--show-all');
const deepMode = args.includes('--deep');
const interactive = args.includes('--interactive');
const generateDelete = args.includes('--generate-delete');
const generateDeleteTarget = generateDelete ? args[args.indexOf('--generate-delete') + 1] : null;
const minRefsArg = args.find(arg => arg.startsWith('--min-refs='));
const minRefs = minRefsArg ? parseInt(minRefsArg.split('=')[1]) : 1;

function runCommand(cmd, ignoreError = true) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', ignoreError ? 'ignore' : 'pipe'] });
  } catch (e) {
    return '';
  }
}

// 新機能: 空のディレクトリを検出
function findEmptyDirectories() {
  console.log('\n【🔍 空のディレクトリ検出】');
  
  const checkPaths = [
    'app/(authenticated)',
    'app/api',
    'lib',
    'components',
    'hooks'
  ];
  
  const emptyDirs = [];
  
  for (const basePath of checkPaths) {
    if (!existsSync(basePath)) continue;
    
    const dirs = runCommand(`find ${basePath} -type d 2>/dev/null`).trim().split('\n');
    
    for (const dir of dirs) {
      if (!dir || dir === basePath) continue;
      
      const contents = runCommand(`ls -A "${dir}" 2>/dev/null`).trim();
      if (!contents) {
        emptyDirs.push(dir);
      }
    }
  }
  
  if (emptyDirs.length > 0) {
    console.log(`  ⚠️  空のディレクトリが ${emptyDirs.length}件見つかりました:\n`);
    emptyDirs.forEach(dir => {
      console.log(`    - ${dir}`);
      console.log(`      → 削除: rm -rf ${dir}`);
    });
    console.log('');
  } else {
    console.log('  ✅ 空のディレクトリはありません\n');
  }
  
  return emptyDirs;
}

// 新機能: DB削除スクリプト自動生成
function generateDeleteScript(featureId) {
  console.log(`\n【📝 DB削除スクリプト生成: ${featureId}】\n`);
  
  const scriptContent = `#!/usr/bin/env node
/**
 * Auto-generated delete script for ${featureId}
 * Generated: ${new Date().toISOString()}
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const FEATURE_ID = '${featureId}';
const PROMPT_KEYS = ['${featureId.toUpperCase().replace(/-/g, '_')}']; // 必要に応じて追加

async function deleteFeature() {
  console.log(\`=== \${FEATURE_ID} 関連データの削除 ===\\n\`);
  
  try {
    // 1. FeaturePrompt削除
    const featurePromptResult = await prisma.featurePrompt.deleteMany({
      where: { featureId: FEATURE_ID }
    });
    console.log(\`✅ FeaturePrompt: \${featurePromptResult.count}件削除\`);
    
    // 2. SystemPromptVersion削除
    for (const key of PROMPT_KEYS) {
      const prompt = await prisma.systemPrompt.findUnique({ where: { key } });
      if (prompt) {
        const versionsResult = await prisma.systemPromptVersion.deleteMany({
          where: { promptId: prompt.id }
        });
        console.log(\`✅ SystemPromptVersion (\${key}): \${versionsResult.count}件削除\`);
        
        // 3. SystemPrompt削除
        await prisma.systemPrompt.delete({ where: { key } });
        console.log(\`✅ SystemPrompt (\${key}): 削除\`);
      }
    }
    
    console.log('\\n🎉 すべての削除が完了しました');
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

deleteFeature();
`;

  const scriptPath = `scripts/delete-${featureId}.mjs`;
  writeFileSync(scriptPath, scriptContent);
  console.log(`✅ 削除スクリプトを生成しました: ${scriptPath}`);
  console.log(`\n実行方法:`);
  console.log(`  node ${scriptPath}`);
  console.log(`\n⚠️  実行前に必ずDBバックアップを取ってください`);
}

// 新機能: 対話的削除モード
async function interactiveMode() {
  console.log('\n【🎮 対話的削除モード】\n');
  
  // Node.jsのreadlineを動的にインポート
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
  
  // 候補を取得
  console.log('未使用機能の候補を収集中...\n');
  
  // 簡易的な候補検出
  const chatConfigPath = 'lib/chat/chat-config.ts';
  const sidebarPath = 'components/layout/Sidebar.tsx';
  
  const allFeatureIds = new Set();
  
  if (existsSync(chatConfigPath)) {
    const content = readFileSync(chatConfigPath, 'utf-8');
    const matches = content.match(/featureId: "([^"]+)"/g);
    if (matches) {
      matches.forEach(match => {
        const id = match.match(/featureId: "([^"]+)"/)?.[1];
        if (id) allFeatureIds.add(id);
      });
    }
  }
  
  const candidates = [...allFeatureIds];
  
  console.log('削除候補:');
  candidates.forEach((id, i) => {
    console.log(`  ${i + 1}. ${id}`);
  });
  console.log('  0. キャンセル');
  
  const answer = await question('\n削除する機能番号を選択: ');
  const index = parseInt(answer) - 1;
  
  if (index === -1 || !candidates[index]) {
    console.log('キャンセルしました');
    rl.close();
    return;
  }
  
  const target = candidates[index];
  console.log(`\n「${target}」を削除しますか？`);
  console.log('  1. 完全削除（ファイル+DB）');
  console.log('  2. ファイルのみ削除');
  console.log('  3. DBのみ削除');
  console.log('  0. キャンセル');
  
  const action = await question('\n選択: ');
  
  switch(action) {
    case '1':
      console.log(`\n✅ 「${target}」の完全削除を実行します`);
      console.log('実行コマンド:');
      console.log(`  node .claude/skills/feature-cleanup/scripts/delete-feature.mjs "${target}"`);
      break;
    case '2':
      console.log(`\n✅ 「${target}」のファイル削除を実行します`);
      console.log(`  rm -rf app/(authenticated)/${target}`);
      break;
    case '3':
      generateDeleteScript(target);
      break;
    default:
      console.log('キャンセルしました');
  }
  
  rl.close();
}

// ======== メイン処理 ========

// 削除スクリプト生成モード
if (generateDelete && generateDeleteTarget) {
  generateDeleteScript(generateDeleteTarget);
  process.exit(0);
}

// 対話的モード
if (interactive) {
  interactiveMode().then(() => process.exit(0));
  // 対話的モードの場合はここで終了
} else {
  // 通常モードは以下続行
  runAudit();
}

function runAudit() {

// 通常モード
console.log('=== 未使用機能調査（強化版 v2.0）===\n');
if (deepMode) {
  console.log('🔍 深層調査モード: prisma/schema, types/, config/ も対象\n');
}

// 空のディレクトリ検出（新機能）
const emptyDirs = findEmptyDirectories();

// ========== 1. 機能IDの収集（複数ソース） ==========
console.log('【機能IDを収集中...】');

const allFeatureIds = new Set();
const featureSources = []; // {id, source, location}

// 1.1 chat-config.ts から取得（従来）
const chatConfigPath = 'lib/chat/chat-config.ts';
if (existsSync(chatConfigPath)) {
  const content = readFileSync(chatConfigPath, 'utf-8');
  const matches = content.match(/featureId: "([^"]+)"/g);
  if (matches) {
    matches.forEach(match => {
      const id = match.match(/featureId: "([^"]+)"/)?.[1];
      if (id) {
        allFeatureIds.add(id);
        featureSources.push({ id, source: 'chat-config', location: chatConfigPath });
      }
    });
  }
}

// 1.2 types/ から取得（FeatureId 型定義）
const typeFiles = [
  'types/chat.ts',
  'types/index.ts',
  'types/feature.ts'
].filter(existsSync);

for (const typeFile of typeFiles) {
  const content = readFileSync(typeFile, 'utf-8');
  // type FeatureId = "xxx" | "yyy" パターン
  const typeMatches = content.match(/type\s+\w*[Ff]eature\w*\s*=\s*([^;]+)/g);
  if (typeMatches) {
    const idMatches = typeMatches.join(' ').match(/"([^"]+)"/g);
    if (idMatches) {
      idMatches.forEach(match => {
        const id = match.replace(/"/g, '');
        if (id && !id.includes(' ')) {
          allFeatureIds.add(id);
          featureSources.push({ id, source: 'types', location: typeFile });
        }
      });
    }
  }
}

// 1.3 Sidebar.tsx から取得（すべての文字列リテラルを収集）
const sidebarPath = 'components/layout/Sidebar.tsx';
if (existsSync(sidebarPath)) {
  const content = readFileSync(sidebarPath, 'utf-8');
  
  // href="/chat?agent=xxx" パターン
  const hrefMatches = content.match(/agent=([a-z0-9_-]+)/gi);
  if (hrefMatches) {
    hrefMatches.forEach(match => {
      const id = match.replace('agent=', '');
      allFeatureIds.add(id);
      featureSources.push({ id, source: 'sidebar-href', location: sidebarPath });
    });
  }
}

// 1.4 prisma/schema.prisma から取得（deepモードのみ）
if (deepMode) {
  const prismaPath = 'prisma/schema.prisma';
  if (existsSync(prismaPath)) {
    const content = readFileSync(prismaPath, 'utf-8');
    // enum や コメント内の機能IDを検出
    const enumMatches = content.match(/enum\s+\w*[Ff]eature\w*\s*\{([^}]+)\}/g);
    if (enumMatches) {
      const idMatches = enumMatches.join(' ').match(/([a-z0-9_-]+)/g);
      if (idMatches) {
        idMatches.forEach(id => {
          if (id.length > 2 && !['enum', 'model', 'id', 'createdAt'].includes(id)) {
            allFeatureIds.add(id);
            featureSources.push({ id, source: 'prisma-schema', location: prismaPath });
          }
        });
      }
    }
  }
}

console.log(`  検出された機能ID: ${allFeatureIds.size}件`);
console.log(`  ソース: ${[...new Set(featureSources.map(s => s.source))].join(', ')}\n`);

// ========== 2. Sidebarに表示されている機能を取得 ==========
console.log('【Sidebar機能を取得中...】');

const sidebarFeatures = [];
if (existsSync(sidebarPath)) {
  const content = readFileSync(sidebarPath, 'utf-8');
  
  // コメントを除外
  const lines = content.split('\n');
  const activeLines = [];
  let inComment = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('/*')) inComment = true;
    if (trimmed.includes('*/')) {
      inComment = false;
      continue;
    }
    if (trimmed.startsWith('//')) continue;
    if (inComment) continue;
    activeLines.push(line);
  }
  
  const activeContent = activeLines.join('\n');
  
  // agent=xxx パターン
  const hrefMatches = activeContent.match(/agent=([a-z0-9_-]+)/gi);
  if (hrefMatches) {
    hrefMatches.forEach(match => {
      const id = match.replace('agent=', '');
      if (!sidebarFeatures.includes(id)) {
        sidebarFeatures.push(id);
      }
    });
  }
}

console.log(`  Sidebarに表示されている機能: ${sidebarFeatures.length}件`);
sidebarFeatures.forEach(f => console.log(`    - ${f}`));

// ========== 3. 各機能の使用状況を調査（拡張版） ==========
console.log('\n【使用状況調査中...】\n');

const searchPaths = deepMode 
  ? 'app/ lib/ components/ types/ config/ hooks/ prisma/'
  : 'app/ lib/ components/';

const featureAnalysis = [];

for (const featureId of allFeatureIds) {
  const analysis = {
    id: featureId,
    inSidebar: sidebarFeatures.includes(featureId),
    refsInCode: 0,
    refsInApp: 0,
    refsInLib: 0,
    refsInTypes: 0,
    refsInConfig: 0,
    refsInPrisma: 0,
    hasPage: false,
    hasApi: false,
    hasComponent: false,
    hasHook: false,
    isCommentedOut: false,
    isInTest: false,
    dbRecord: null,
    sources: featureSources.filter(s => s.id === featureId).map(s => s.source),
  };
  
  // コード内参照数（拡張パス）
  const codeRefs = runCommand(`grep -r "${featureId}" ${searchPaths} --include="*.ts" --include="*.tsx" --include="*.prisma" 2>/dev/null`);
  const codeLines = codeRefs.trim().split('\n').filter(l => l.trim() && !l.includes('node_modules'));
  analysis.refsInCode = codeLines.length;
  analysis.refsInApp = codeLines.filter(l => l.startsWith('app/')).length;
  analysis.refsInLib = codeLines.filter(l => l.startsWith('lib/')).length;
  analysis.refsInTypes = codeLines.filter(l => l.startsWith('types/')).length;
  analysis.refsInConfig = codeLines.filter(l => l.startsWith('config/')).length;
  analysis.refsInPrisma = codeLines.filter(l => l.includes('.prisma')).length;
  
  // コメントアウトされているか
  analysis.isCommentedOut = codeLines.some(l => {
    const trimmed = l.trim();
    return (trimmed.startsWith('//') || trimmed.startsWith('*')) && l.includes(featureId);
  });
  
  // テストファイルでの参照
  const testRefs = runCommand(`grep -r "${featureId}" tests/ --include="*.ts" --include="*.tsx" 2>/dev/null`);
  analysis.isInTest = testRefs.trim().length > 0;
  
  // 専用ページがあるか（複数パターン対応）
  const pagePatterns = [
    `app/(authenticated)/${featureId}/page.tsx`,
    `app/(authenticated)/${featureId}/page.ts`,
    `app/(authenticated)/${featureId.replace(/-/g, '_')}/page.tsx`,
    `app/${featureId}/page.tsx`,
  ];
  analysis.hasPage = pagePatterns.some(existsSync);
  
  // 専用APIがあるか
  const apiPatterns = [
    `app/api/${featureId}/route.ts`,
    `app/api/${featureId.replace(/-/g, '_')}/route.ts`,
  ];
  analysis.hasApi = apiPatterns.some(existsSync);
  
  // 専用コンポーネントがあるか
  const componentPatterns = [
    `components/${featureId}/`,
    `components/${toPascalCase(featureId)}.tsx`,
    `components/${toPascalCase(featureId)}Section.tsx`,
  ];
  analysis.hasComponent = componentPatterns.some(p => existsSync(p));
  
  // 専用フックがあるか
  analysis.hasHook = existsSync(`hooks/use${toPascalCase(featureId)}.ts`);
  
  // DBレコード確認
  if (existsSync('.claude/skills/db-query/scripts/query.mjs')) {
    const dbResult = runCommand(`node .claude/skills/db-query/scripts/query.mjs find FeaturePrompt "featureId=${featureId}" --fields isActive 2>/dev/null`);
    if (dbResult.includes('isActive:')) {
      const isActive = dbResult.includes('isActive: true');
      analysis.dbRecord = { exists: true, isActive };
    }
  }
  
  featureAnalysis.push(analysis);
}

// PascalCase変換ヘルパー
function toPascalCase(str) {
  return str.replace(/(^|-)([a-z])/g, (_, __, letter) => letter.toUpperCase());
}

// ========== 4. カテゴリ分け（改善版） ==========
const categories = {
  active: [],      // Sidebarに表示されていて使用されている
  hidden: [],      // Sidebarにないがコードで使用されている（要注意）
  unused: [],      // Sidebarにない、参照も少ない
  commented: [],   // コメントアウトされている
  configOnly: [],  // 設定ファイルにのみ存在
  testOnly: [],    // テストにのみ存在
};

for (const feature of featureAnalysis) {
  if (feature.isCommentedOut && feature.refsInCode <= 2) {
    categories.commented.push(feature);
  } else if (feature.inSidebar) {
    categories.active.push(feature);
  } else if (feature.refsInCode === 0) {
    if (feature.isInTest) {
      categories.testOnly.push(feature);
    } else {
      categories.configOnly.push(feature);
    }
  } else if (feature.refsInCode <= minRefs) {
    categories.unused.push(feature);
  } else {
    categories.hidden.push(feature);
  }
}

// ========== 5. 結果表示 ==========
console.log('=== 調査結果 ===\n');

// アクティブ機能
if (showAll || categories.active.length > 0) {
  console.log(`【✅ アクティブ機能】(${categories.active.length}件)`);
  console.log('Sidebarに表示され、使用されている機能：\n');
  for (const f of categories.active) {
    console.log(`  ${f.id}`);
    console.log(`    Sidebar: ✅ | コード参照: ${f.refsInCode}件`);
    console.log(`    ページ: ${f.hasPage ? '✅' : '❌'} | API: ${f.hasApi ? '✅' : '❌'} | コンポーネント: ${f.hasComponent ? '✅' : '❌'}`);
    if (deepMode) {
      console.log(`    内訳: app:${f.refsInApp} lib:${f.refsInLib} types:${f.refsInTypes} config:${f.refsInConfig}`);
    }
  }
  console.log('');
}

// 非表示だが使用中
if (categories.hidden.length > 0) {
  console.log(`【⚠️ 非表示だが使用中】(${categories.hidden.length}件)`);
  console.log('Sidebarにないが、コードで参照されている機能：');
  console.log('→ エージェントによる詳細調査が必要\n');
  for (const f of categories.hidden) {
    console.log(`  ${f.id}`);
    console.log(`    コード参照: ${f.refsInCode}件 (app:${f.refsInApp} lib:${f.refsInLib} types:${f.refsInTypes})`);
    console.log(`    ページ: ${f.hasPage ? '✅' : '❌'} | API: ${f.hasApi ? '✅' : '❌'} | コンポーネント: ${f.hasComponent ? '✅' : '❌'} | フック: ${f.hasHook ? '✅' : '❌'}`);
    console.log(`    ソース: ${f.sources.join(', ')}`);
    if (f.dbRecord) {
      console.log(`    DB: ${f.dbRecord.isActive ? '有効' : '無効'}`);
    }
    console.log(`    → 調査: node analyze.mjs "${f.id}"`);
    console.log('');
  }
}

// 設定ファイルにのみ存在
if (categories.configOnly.length > 0) {
  console.log(`【📄 設定のみ】(${categories.configOnly.length}件)`);
  console.log('設定ファイルに定義があるが、コードから参照されていない機能：\n');
  for (const f of categories.configOnly) {
    console.log(`  ${f.id}`);
    console.log(`    定義ソース: ${f.sources.join(', ')}`);
    console.log(`    → 削除候補（詳細調査推奨）: node analyze.mjs "${f.id}"`);
    console.log(`    → 削除スクリプト生成: node audit-unused.mjs --generate-delete "${f.id}"`);
    console.log('');
  }
}

// 未使用（削除候補）
if (categories.unused.length > 0) {
  console.log(`【🗑️ 削除候補（未使用）】(${categories.unused.length}件)`);
  console.log('Sidebarになく、参照が少ない機能：\n');
  for (const f of categories.unused) {
    console.log(`  ${f.id}`);
    console.log(`    参照: ${f.refsInCode}件`);
    console.log(`    ページ: ${f.hasPage ? '⚠️ あり' : 'なし'} | API: ${f.hasApi ? '⚠️ あり' : 'なし'} | コンポーネント: ${f.hasComponent ? '⚠️ あり' : 'なし'}`);
    console.log(`    → 削除候補: node analyze.mjs "${f.id}"`);
    console.log(`    → 削除スクリプト生成: node audit-unused.mjs --generate-delete "${f.id}"`);
    console.log('');
  }
}

// コメントアウト済み
if (categories.commented.length > 0) {
  console.log(`【💬 コメントアウト済み】(${categories.commented.length}件)`);
  console.log('コードがコメントアウトされている機能：\n');
  for (const f of categories.commented) {
    console.log(`  ${f.id}`);
    console.log(`    → 完全削除の候補`);
    console.log('');
  }
}

// テストのみ
if (categories.testOnly.length > 0) {
  console.log(`【🧪 テストのみ参照】(${categories.testOnly.length}件)`);
  console.log('テストにのみ存在する機能（実装が削除されている可能性）：\n');
  for (const f of categories.testOnly) {
    console.log(`  ${f.id}`);
    console.log(`    → テストも合わせて削除検討`);
    console.log('');
  }
}

// ========== 6. エージェント向けサマリーと次のアクション ==========
console.log('=== エージェント向けサマリー ===\n');

const needsInvestigation = [
  ...categories.hidden,
  ...categories.configOnly,
  ...categories.unused.filter(f => f.hasPage || f.hasApi || f.hasComponent)
];

if (needsInvestigation.length === 0) {
  console.log('✅ 即座の削除候補はありません');
  console.log('（ただし、--deep モードでより詳細な調査が可能です）\n');
} else {
  console.log(`🔍 詳細調査が必要な機能: ${needsInvestigation.length}件\n`);
  
  for (const f of needsInvestigation) {
    console.log(`  - ${f.id}`);
  }
  
  console.log('\n【エージェンティック調査ワークフロー】');
  console.log('1. 各機能の定義ファイルを開いて内容を確認');
  console.log('   → lib/chat/chat-config.ts, types/*.ts など');
  console.log('');
  console.log('2. コード参照箇所を確認');
  console.log('   grep -rn "機能ID" app/ lib/ components/ --include="*.ts" --include="*.tsx"');
  console.log('');
  console.log('3. 実際の使用状況を判断');
  console.log('   - 型定義のみか、実際のロジックもあるか');
  console.log('   - 他の機能から参照されているか');
  console.log('   - 将来的に使用される可能性があるか');
  console.log('');
  console.log('4. 削除可否を決定して、削除ワークフローを実行');
  console.log('   → SKILL.md の Phase 0-5 を参照');
}

// 新機能: 対話的モードの案内
console.log('\n【💡 新機能の案内】');
console.log('  対話的削除モード: node audit-unused.mjs --interactive');
console.log('  削除スクリプト生成: node audit-unused.mjs --generate-delete "機能ID"');
console.log('  空ディレクトリ検出: 自動実行済み');

// 深層調査推奨
if (!deepMode) {
  console.log('\n【🔍 深層調査の推奨】');
  console.log('より網羅的な調査が必要な場合：');
  console.log('  node audit-unused.mjs --deep');
  console.log('');
  console.log('--deep モードでは以下も対象になります：');
  console.log('  - prisma/schema.prisma');
  console.log('  - types/ ディレクトリ');
  console.log('  - config/ ディレクトリ');
  console.log('  - hooks/ ディレクトリ');
}
}
