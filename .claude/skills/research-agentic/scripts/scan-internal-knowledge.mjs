#!/usr/bin/env node
/**
 * 内部ナレッジ収集・分析スクリプト
 * 
 * プロジェクト内のドキュメント・設定ファイルを走査し、
 * 検証が必要な情報（バージョン、日付、URLなど）を抽出する。
 * ナレッジ監査、作成、更新の際に使用する。
 * 
 * 使用方法:
 *   node scan-internal-knowledge.mjs [options]
 * 
 * オプション:
 *   --format=json|md    出力形式（デフォルト: md）
 *   --depth=N           サブディレクトリの深さ（デフォルト: 5）
 *   --include-skills    .claude/skills/ も含める
 */

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM で __dirname を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');

// 設定
const CONFIG = {
  versionPattern: /v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?/g,
  datePattern: /\d{4}[-/]\d{1,2}[-/]\d{1,2}/g,
  urlPattern: /https?:\/\/[^\s\)\]\>\"\'\`\,]+/g,
  targetDirs: ['docs', '.github', '.claude/skills'],
  targetFiles: ['README.md', 'CHANGELOG.md', 'SECURITY.md', 'package.json', 'tsconfig.json', '.env.example']
};

// コマンドライン引数のパース
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    format: args.find(a => a.startsWith('--format='))?.split('=')[1] || 'md',
    depth: parseInt(args.find(a => a.startsWith('--depth='))?.split('=')[1] || '5'),
    includeSkills: args.includes('--include-skills')
  };
}

// 再帰的にファイル収集
async function collectFilesRecursive(dir, depth, maxDepth, results = []) {
  if (depth > maxDepth) return results;
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(PROJECT_ROOT, fullPath);
      
      // node_modules, .git, dist などを除外
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || 
          entry.name === 'test-results' || entry.name === 'playwright-report') {
        continue;
      }
      
      if (entry.isDirectory()) {
        await collectFilesRecursive(fullPath, depth + 1, maxDepth, results);
      } else if (entry.isFile()) {
        // 対象ファイル判定
        if (shouldInclude(relPath, entry.name)) {
          results.push(relPath);
        }
      }
    }
  } catch (err) {
    // 権限エラー等は無視
  }
  
  return results;
}

// 対象ファイル判定
function shouldInclude(relPath, fileName) {
  // Markdown ファイル
  if (fileName.endsWith('.md')) {
    // docs/ 以下
    if (relPath.startsWith('docs/')) return true;
    // .github/ 以下
    if (relPath.startsWith('.github/')) return true;
    // スキルファイル
    if (relPath.startsWith('.claude/skills/')) return true;
    // ルートの重要ファイル
    if (['README.md', 'CHANGELOG.md', 'SECURITY.md'].includes(fileName)) return true;
  }
  
  // 設定ファイル
  if (['package.json', 'tsconfig.json', 'jsconfig.json', '.env.example'].includes(fileName)) {
    return true;
  }
  
  // GitHub Actions
  if (relPath.startsWith('.github/workflows/') && (fileName.endsWith('.yml') || fileName.endsWith('.yaml'))) {
    return true;
  }
  
  return false;
}

// ファイル収集メイン
async function collectFiles(options) {
  const files = await collectFilesRecursive(PROJECT_ROOT, 0, options.depth);
  
  // スキルファイルのフィルタ
  if (!options.includeSkills) {
    return files.filter(f => !f.startsWith('.claude/skills/'));
  }
  
  return files.sort();
}

// ファイルから情報抽出
async function extractFromFile(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    const ext = path.extname(filePath);
    const fileName = path.basename(filePath);
    
    const result = {
      path: filePath,
      type: getFileType(filePath, ext, fileName),
      versions: extractUnique(content.match(CONFIG.versionPattern) || []),
      dates: extractUnique(content.match(CONFIG.datePattern) || []),
      urls: extractUnique(content.match(CONFIG.urlPattern) || [])
    };
    
    // package.json からは追加情報を抽出
    if (fileName === 'package.json') {
      result.packages = extractPackageInfo(content);
    }
    
    return result;
  } catch (err) {
    return { path: filePath, error: err.message };
  }
}

// ファイルタイプ判定
function getFileType(filePath, ext, fileName) {
  if (filePath.includes('docs/')) return 'documentation';
  if (filePath.includes('.claude/skills/')) return 'skill';
  if (filePath.includes('.github/workflows/')) return 'github-workflow';
  if (filePath.includes('.github/')) return 'github-config';
  if (ext === '.json') return 'json-config';
  if (ext === '.yml' || ext === '.yaml') return 'yaml-config';
  if (fileName.startsWith('README')) return 'readme';
  if (fileName === 'CHANGELOG.md') return 'changelog';
  if (fileName === 'SECURITY.md') return 'security';
  return 'other';
}

// 重複除去・制限
function extractUnique(arr) {
  return [...new Set(arr)].slice(0, 15); // 最大15件
}

// パッケージ情報抽出
function extractPackageInfo(content) {
  try {
    const json = JSON.parse(content);
    return {
      dependencies: Object.entries(json.dependencies || {})
        .map(([k, v]) => ({ name: k, version: v }))
        .slice(0, 20),
      devDependencies: Object.entries(json.devDependencies || {})
        .map(([k, v]) => ({ name: k, version: v }))
        .slice(0, 20),
      engines: json.engines || {}
    };
  } catch {
    return null;
  }
}

// Markdown形式で出力
function formatMarkdown(results) {
  const lines = ['# 内部ナレッジ収集結果\n'];
  
  // エラーフィルタ
  const validResults = results.filter(r => !r.error);
  const errorResults = results.filter(r => r.error);
  
  // サマリー
  lines.push('## サマリー\n');
  lines.push(`- 収集ファイル数: ${validResults.length}`);
  if (errorResults.length > 0) {
    lines.push(`- 読み取りエラー: ${errorResults.length}`);
  }
  lines.push(`- ドキュメント: ${validResults.filter(r => r.type === 'documentation').length}`);
  lines.push(`- README/CHANGELOG: ${validResults.filter(r => r.type === 'readme' || r.type === 'changelog').length}`);
  lines.push(`- 設定ファイル: ${validResults.filter(r => r.type === 'json-config' || r.type === 'yaml-config').length}`);
  lines.push(`- スキルファイル: ${validResults.filter(r => r.type === 'skill').length}`);
  lines.push('');
  
  // バージョン一覧（検証対象）
  const allVersions = new Map();
  validResults.forEach(r => {
    r.versions?.forEach(v => {
      if (!allVersions.has(v)) allVersions.set(v, []);
      allVersions.get(v).push(r.path);
    });
  });
  
  if (allVersions.size > 0) {
    lines.push('## 検出されたバージョン（検証対象）\n');
    lines.push('| バージョン | 検出ファイル |');
    lines.push('|-----------|-------------|');
    [...allVersions.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([version, files]) => {
        const fileList = files.slice(0, 3).join(', ');
        const more = files.length > 3 ? ` +${files.length - 3}` : '';
        lines.push(`| ${version} | ${fileList}${more} |`);
      });
    lines.push('');
  }
  
  // 日付一覧
  const allDates = new Set();
  validResults.forEach(r => r.dates?.forEach(d => allDates.add(d)));
  if (allDates.size > 0) {
    lines.push('## 検出された日付\n');
    lines.push([...allDates].sort().slice(-10).map(d => `- ${d}`).join('\n'));
    lines.push('');
  }
  
  // package.json 依存関係
  const pkgResults = validResults.filter(r => r.packages);
  if (pkgResults.length > 0) {
    lines.push('## パッケージ依存関係（検証対象）\n');
    pkgResults.forEach(r => {
      lines.push(`### ${r.path}\n`);
      
      if (Object.keys(r.packages.engines || {}).length > 0) {
        lines.push('**Engines:**');
        Object.entries(r.packages.engines).forEach(([k, v]) => {
          lines.push(`- ${k}: ${v}`);
        });
        lines.push('');
      }
      
      if (r.packages.dependencies?.length > 0) {
        lines.push(`**Dependencies (${r.packages.dependencies.length}):**`);
        lines.push('| Package | Version |');
        lines.push('|---------|---------|');
        r.packages.dependencies.forEach(dep => {
          lines.push(`| ${dep.name} | ${dep.version} |`);
        });
        lines.push('');
      }
      
      if (r.packages.devDependencies?.length > 0) {
        lines.push(`**DevDependencies (${r.packages.devDependencies.length}):**`);
        lines.push('| Package | Version |');
        lines.push('|---------|---------|');
        r.packages.devDependencies.forEach(dep => {
          lines.push(`| ${dep.name} | ${dep.version} |`);
        });
        lines.push('');
      }
    });
  }
  
  // 外部URL一覧
  const allUrls = new Map();
  validResults.forEach(r => {
    r.urls?.forEach(url => {
      if (!allUrls.has(url)) allUrls.set(url, []);
      allUrls.get(url).push(r.path);
    });
  });
  
  if (allUrls.size > 0) {
    lines.push('## 検出された外部URL\n');
    lines.push('| URL | 検出ファイル |');
    lines.push('|-----|-------------|');
    [...allUrls.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 30) // 最大30件
      .forEach(([url, files]) => {
        const shortUrl = url.length > 50 ? url.slice(0, 47) + '...' : url;
        lines.push(`| ${shortUrl} | ${files[0]} |`);
      });
    lines.push('');
  }
  
  // ファイル詳細
  lines.push('## ファイル詳細\n');
  validResults.forEach(r => {
    lines.push(`### ${r.path} (${r.type})\n`);
    
    if (r.versions?.length > 0) {
      lines.push(`- **バージョン:** ${r.versions.join(', ')}`);
    }
    if (r.dates?.length > 0) {
      lines.push(`- **日付:** ${r.dates.slice(0, 5).join(', ')}`);
    }
    if (r.urls?.length > 0) {
      lines.push(`- **URL数:** ${r.urls.length}`);
    }
    if (!r.versions?.length && !r.dates?.length && !r.urls?.length) {
      lines.push('- 特記事項なし');
    }
    lines.push('');
  });
  
  if (errorResults.length > 0) {
    lines.push('## 読み取りエラー\n');
    errorResults.forEach(r => {
      lines.push(`- ${r.path}: ${r.error}`);
    });
  }
  
  return lines.join('\n');
}

// JSON形式で出力
function formatJSON(results) {
  return JSON.stringify({
    summary: {
      total: results.length,
      valid: results.filter(r => !r.error).length,
      errors: results.filter(r => r.error).length
    },
    results
  }, null, 2);
}

// メイン処理
async function main() {
  const options = parseArgs();
  
  console.error('🔍 内部ナレッジを収集中...');
  const files = await collectFiles(options);
  console.error(`📁 ${files.length} ファイルが見つかりました`);
  
  if (files.length === 0) {
    console.error('⚠️ 対象ファイルが見つかりませんでした');
    process.exit(0);
  }
  
  console.error('📋 情報を抽出中...');
  const results = await Promise.all(files.map(extractFromFile));
  
  console.error('✅ 完了\n');
  
  // 出力
  if (options.format === 'json') {
    console.log(formatJSON(results));
  } else {
    console.log(formatMarkdown(results));
  }
}

main().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
