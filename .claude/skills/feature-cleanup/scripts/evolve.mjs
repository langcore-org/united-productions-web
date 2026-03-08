#!/usr/bin/env node
/**
 * Feature Cleanup - Skill Evolution
 * 
 * 使用パターンに基づいてスキルを進化させるスクリプト
 * 
 * Usage:
 *   node evolve.mjs [ACTION]
 * 
 * Actions:
 *   log [KEYWORD] [MODE] [RESULT]  # 使用ログを記録
 *   analyze                        # パターンを分析
 *   suggest [KEYWORD]              # 改善提案を生成
 */

import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const LOG_FILE = '.claude/skills/feature-cleanup/usage.log';
const args = process.argv.slice(2);
const action = args[0];

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8' });
  } catch (e) {
    return '';
  }
}

// ログを記録
function logUsage(keyword, mode, result) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} ${keyword} ${mode} ${result}\n`;
  
  appendFileSync(LOG_FILE, logEntry);
  console.log(`✅ ログを記録しました: ${keyword} ${mode} ${result}`);
}

// パターンを分析
function analyzePatterns() {
  if (!existsSync(LOG_FILE)) {
    console.log('ログファイルが見つかりません。まだ使用履歴がありません。');
    return;
  }
  
  const logs = readFileSync(LOG_FILE, 'utf-8').trim().split('\n');
  
  console.log('=== 使用パターン分析 ===\n');
  console.log(`総使用回数: ${logs.length}回\n`);
  
  // 機能別集計
  const byFeature = {};
  const byMode = {};
  const byResult = {};
  
  for (const log of logs) {
    // ISO timestamp format: 2026-02-27T12:00:00.000Z
    const match = log.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/);
    if (match) {
      const [, timestamp, feature, mode, result] = match;
      
      byFeature[feature] = (byFeature[feature] || 0) + 1;
      byMode[mode] = (byMode[mode] || 0) + 1;
      byResult[result] = (byResult[result] || 0) + 1;
    }
  }
  
  console.log('【機能別使用回数】');
  Object.entries(byFeature)
    .sort((a, b) => b[1] - a[1])
    .forEach(([feature, count]) => {
      console.log(`  ${feature}: ${count}回`);
    });
  
  console.log('\n【モード別使用回数】');
  Object.entries(byMode)
    .sort((a, b) => b[1] - a[1])
    .forEach(([mode, count]) => {
      console.log(`  ${mode}: ${count}回`);
    });
  
  console.log('\n【結果別】');
  Object.entries(byResult)
    .sort((a, b) => b[1] - a[1])
    .forEach(([result, count]) => {
      const icon = result === 'success' ? '✅' : result === 'failed' ? '❌' : '⚠️';
      console.log(`  ${icon} ${result}: ${count}回`);
    });
  
  // 成功率の計算
  const successCount = byResult['success'] || 0;
  const failedCount = byResult['failed'] || 0;
  const total = successCount + failedCount;
  const successRate = total > 0 ? (successCount / total * 100).toFixed(1) : 0;
  
  console.log(`\n【成功率】 ${successRate}% (${successCount}/${total})`);
  
  // 自動化レベルの提案
  console.log('\n【自動化レベル提案】');
  Object.entries(byFeature)
    .filter(([, count]) => count >= 3)
    .forEach(([feature, count]) => {
      const level = count >= 10 ? 'Level 3 (中リスク自動化)' : 
                    count >= 5 ? 'Level 2 (低リスク自動化)' : 
                    'Level 1 (確認必須)';
      console.log(`  ${feature}: ${count}回使用 → ${level}`);
    });
}

// 改善提案を生成
function suggestImprovements(keyword) {
  if (!existsSync(LOG_FILE)) {
    console.log('ログがないため、推測ベースの提案を生成します。');
    return;
  }
  
  const logs = readFileSync(LOG_FILE, 'utf-8').trim().split('\n');
  const featureLogs = logs.filter(l => l.includes(keyword));
  
  if (featureLogs.length === 0) {
    console.log(`${keyword} の使用履歴がありません。`);
    return;
  }
  
  console.log(`=== ${keyword} の改善提案 ===\n`);
  console.log(`使用回数: ${featureLogs.length}回\n`);
  
  // 失敗パターンの分析
  const failures = featureLogs.filter(l => l.includes('failed'));
  if (failures.length > 0) {
    console.log('【過去の失敗】');
    console.log(`  失敗回数: ${failures.length}回`);
    console.log('  推奨: 段階的削除モードを使用し、各ステップで慎重に確認\n');
  }
  
  // 成功パターンの分析
  const successes = featureLogs.filter(l => l.includes('success'));
  if (successes.length >= 3) {
    console.log('【成功パターン】');
    console.log(`  成功回数: ${successes.length}回`);
    console.log('  推奨: 低リスクと判断し、自動化レベルを上げる\n');
  }
  
  // 推奨モード
  const successRate = successes.length / featureLogs.length;
  const recommendedMode = successRate >= 0.8 ? 'simple' :
                          successRate >= 0.5 ? 'gradual' : 'step-by-step';
  
  console.log('【推奨設定】');
  console.log(`  推奨モード: ${recommendedMode}`);
  console.log(`  自動実行: ${successRate >= 0.8 ? '低リスクは自動で実行' : 'すべて確認を取る'}`);
}

// メイン処理
switch (action) {
  case 'log':
    const [keyword, mode, result] = args.slice(1);
    if (!keyword || !mode || !result) {
      console.error('Usage: node evolve.mjs log [KEYWORD] [MODE] [RESULT]');
      process.exit(1);
    }
    logUsage(keyword, mode, result);
    break;
    
  case 'analyze':
    analyzePatterns();
    break;
    
  case 'suggest':
    const suggestKeyword = args[1];
    if (!suggestKeyword) {
      console.error('Usage: node evolve.mjs suggest [KEYWORD]');
      process.exit(1);
    }
    suggestImprovements(suggestKeyword);
    break;
    
  default:
    console.log('Feature Cleanup Skill Evolution');
    console.log('');
    console.log('Usage:');
    console.log('  node evolve.mjs log [KEYWORD] [MODE] [RESULT]');
    console.log('  node evolve.mjs analyze');
    console.log('  node evolve.mjs suggest [KEYWORD]');
    console.log('');
    console.log('Examples:');
    console.log('  node evolve.mjs log na-script step-by-step success');
    console.log('  node evolve.mjs analyze');
    console.log('  node evolve.mjs suggest na-script');
}
