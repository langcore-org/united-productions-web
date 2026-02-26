#!/usr/bin/env node
/**
 * Backlog list viewer
 * Usage: node list.js [--priority=<p>] [--type=<t>] [--sort=<s>]
 */

const fs = require('fs');
const path = require('path');

const BACKLOG_DIR = 'docs/backlog';

const PRIORITY_ORDER = {
  '🔴 高': 1,
  '🟡 中': 2,
  '🟢 低': 3,
  '⏸️ 保留': 4
};

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
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function main() {
  const args = process.argv.slice(2);
  
  // Parse options
  let priorityFilter = null;
  let typeFilter = null;
  let sortBy = 'priority'; // priority | date
  
  for (const arg of args) {
    if (arg.startsWith('--priority=')) {
      const p = arg.substring(11);
      priorityFilter = p === 'high' ? '🔴 高' :
                       p === 'medium' ? '🟡 中' :
                       p === 'low' ? '🟢 低' :
                       p === 'pending' ? '⏸️ 保留' : p;
    } else if (arg.startsWith('--type=')) {
      typeFilter = arg.substring(7);
    } else if (arg.startsWith('--sort=')) {
      sortBy = arg.substring(7);
    }
  }
  
  // Check if backlog directory exists
  if (!fs.existsSync(BACKLOG_DIR)) {
    console.log('No backlog directory found.');
    process.exit(0);
  }
  
  // Read all markdown files
  const files = fs.readdirSync(BACKLOG_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => {
      const filepath = path.join(BACKLOG_DIR, f);
      const content = fs.readFileSync(filepath, 'utf-8');
      const meta = parseFrontmatter(content);
      const type = f.split('-')[0];
      
      return {
        filename: f,
        filepath,
        type,
        ...meta
      };
    });
  
  // Apply filters
  let filtered = files;
  
  if (priorityFilter) {
    filtered = filtered.filter(f => f.priority === priorityFilter);
  }
  
  if (typeFilter) {
    filtered = filtered.filter(f => f.type === typeFilter);
  }
  
  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'priority') {
      const pa = PRIORITY_ORDER[a.priority] || 999;
      const pb = PRIORITY_ORDER[b.priority] || 999;
      if (pa !== pb) return pa - pb;
    }
    // Secondary sort by date
    const da = new Date(a.発見日 || 0);
    const db = new Date(b.発見日 || 0);
    return db - da; // Newest first
  });
  
  // Output
  if (filtered.length === 0) {
    console.log('No backlog items found.');
    if (priorityFilter) console.log(`Filter: priority=${priorityFilter}`);
    if (typeFilter) console.log(`Filter: type=${typeFilter}`);
    process.exit(0);
  }
  
  // Header
  console.log(`\n📋 Backlog Items (${filtered.length}件)\n`);
  console.log('Priority | Type   | Date  | Age | Title');
  console.log('---------|--------|-------|-----|----------------------------------------');
  
  // Items
  for (const item of filtered) {
    const priority = (item.priority || '⏸️ 保留').padEnd(6);
    const type = (item.type || '?').padEnd(6);
    const date = formatDate(item.発見日).padEnd(5);
    const age = `${getDaysOld(item.発見日)}d`.padEnd(3);
    const title = item.title || '(no title)';
    
    console.log(`${priority} | ${type} | ${date} | ${age} | ${title}`);
  }
  
  console.log('');
  
  // Summary by priority
  const summary = {};
  for (const f of files) {
    const p = f.priority || '⏸️ 保留';
    summary[p] = (summary[p] || 0) + 1;
  }
  
  console.log('Summary:');
  for (const [p, count] of Object.entries(summary).sort((a, b) => 
    (PRIORITY_ORDER[a[0]] || 999) - (PRIORITY_ORDER[b[0]] || 999)
  )) {
    console.log(`  ${p}: ${count}件`);
  }
  console.log('');
}

main();
