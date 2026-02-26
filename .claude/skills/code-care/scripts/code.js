#!/usr/bin/env node
/**
 * Code Care - Code quality and type safety management
 * Usage: node code.js <category> <command> [options]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ================ Health Check ================

function healthCheck(type) {
  console.log(`\n🔍 Health Check: ${type || 'all'}\n`);
  
  switch (type) {
    case 'unused':
      checkUnused();
      break;
    case 'types':
      checkTypes();
      break;
    case 'any':
      checkAny();
      break;
    case 'todos':
      checkTodos();
      break;
    default:
      checkTypes();
      checkAny();
      checkTodos();
      checkUnused();
  }
}

function checkUnused() {
  console.log('📦 Checking for unused code (knip)...');
  try {
    const result = execSync('npx knip --production 2>&1', { encoding: 'utf-8', cwd: process.cwd() });
    console.log(result || '✅ No unused code found\n');
  } catch (e) {
    console.log(e.stdout || e.message);
  }
}

function checkTypes() {
  console.log('📘 Checking TypeScript types...');
  try {
    execSync('npx tsc --noEmit 2>&1', { encoding: 'utf-8', cwd: process.cwd(), stdio: 'inherit' });
    console.log('✅ Type check passed\n');
  } catch (e) {
    console.log('\n❌ Type errors found\n');
    process.exit(1);
  }
}

function checkAny() {
  console.log('⚠️  Checking for "as any" usage...');
  try {
    const result = execSync('grep -r "as any" --include="*.ts" --include="*.tsx" app/ lib/ components/ 2>&1', { encoding: 'utf-8', cwd: process.cwd() });
    if (result) {
      console.log('\n❌ Found "as any" usage:\n');
      console.log(result);
      console.log('\nUse: node code.js fix-any --file=<path> for suggestions\n');
    } else {
      console.log('✅ No "as any" found\n');
    }
  } catch (e) {
    console.log('✅ No "as any" found\n');
  }
}

function checkTodos() {
  console.log('📝 Checking for TODO comments...');
  try {
    const result = execSync('grep -rn "TODO:" --include="*.ts" --include="*.tsx" app/ lib/ components/ 2>&1 | head -20', { encoding: 'utf-8', cwd: process.cwd() });
    if (result) {
      const lines = result.trim().split('\n');
      console.log(`\nFound ${lines.length} TODO comments:\n`);
      console.log(result);
    } else {
      console.log('✅ No TODO comments found\n');
    }
  } catch (e) {
    console.log('✅ No TODO comments found\n');
  }
}

// ================ Type Safety ================

function fixAny(filepath) {
  if (!filepath) {
    console.error('Usage: node code.js fix-any --file=<path>');
    process.exit(1);
  }
  
  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    process.exit(1);
  }
  
  console.log(`\n🔧 Fixing "as any" in: ${filepath}\n`);
  
  const content = fs.readFileSync(filepath, 'utf-8');
  const anyMatches = content.match(/as any/g);
  
  if (!anyMatches) {
    console.log('✅ No "as any" found in this file');
    return;
  }
  
  console.log(`Found ${anyMatches.length} occurrence(s)\n`);
  
  console.log('Suggested approaches:\n');
  
  console.log('【方法1: モジュール拡張】（外部ライブラリの型不足時）');
  console.log('Create: types/<package>.d.ts\n');
  console.log('```typescript');
  console.log('import type { DefaultSession } from "next-auth";');
  console.log('');
  console.log('declare module "next-auth" {');
  console.log('  interface Session extends DefaultSession {');
  console.log('    user: {');
  console.log('      id: string;');
  console.log('      role?: string;');
  console.log('    } & DefaultSession["user"];');
  console.log('  }');
  console.log('}');
  console.log('```\n');
  
  console.log('【方法2: 明示的なインターフェース】（動的インポート時）');
  console.log('```typescript');
  console.log('interface MyModule {');
  console.log('  default: (args: any) => Promise<Result>;');
  console.log('}');
  console.log('const mod = await import("module") as unknown as MyModule;');
  console.log('```\n');
  
  console.log('【方法3: 型ガード関数】（型の絞り込み）');
  console.log('```typescript');
  console.log('function isType(value: unknown): value is ExpectedType {');
  console.log('  return !!value && typeof value === "object" && "key" in value;');
  console.log('}');
  console.log('```\n');
  
  // Extract context around each 'as any'
  const lines = content.split('\n');
  console.log('Context in file:\n');
  lines.forEach((line, i) => {
    if (line.includes('as any')) {
      console.log(`Line ${i + 1}: ${line.trim()}`);
    }
  });
  console.log('');
}

function addGuard(interfacename) {
  if (!interfacename) {
    console.error('Usage: node code.js add-guard --interface=<InterfaceName>');
    process.exit(1);
  }
  
  console.log(`\n🛡️  Type Guard Template for: ${interfacename}\n`);
  console.log('```typescript');
  console.log(`function is${interfacename}(value: unknown): value is ${interfacename} {`);
  console.log('  return (');
  console.log('    !!value &&');
  console.log('    typeof value === "object" &&');
  console.log(`    // Add specific checks for ${interfacename} properties`);
  console.log('    "requiredProperty" in value &&');
  console.log('    typeof (value as any).requiredProperty === "string"');
  console.log('  );');
  console.log('}');
  console.log('```\n');
  
  console.log('Usage example:\n');
  console.log('```typescript');
  console.log(`const data: unknown = fetchData();`);
  console.log(`if (is${interfacename}(data)) {`);
  console.log('  // TypeScript knows data is ${interfacename} here');
  console.log('}');
  console.log('```\n');
}

function extendTypes(packageName) {
  if (!packageName) {
    console.error('Usage: node code.js extend-types --package=<package-name>');
    process.exit(1);
  }
  
  const typesDir = 'types';
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }
  
  const filepath = path.join(typesDir, `${packageName.replace('/', '-').replace('@', '')}.d.ts`);
  
  const template = `// Type extensions for ${packageName}
// This file extends types from the ${packageName} package

declare module "${packageName}" {
  // Add your extensions here
  // Example:
  // interface User {
  //   customField: string;
  // }
}

export {};
`;
  
  if (fs.existsSync(filepath)) {
    console.log(`File already exists: ${filepath}`);
    console.log('Edit it to add your type extensions');
  } else {
    fs.writeFileSync(filepath, template, 'utf-8');
    console.log(`✅ Created: ${filepath}`);
  }
  
  console.log('\nTemplate:\n');
  console.log('```typescript');
  console.log(template);
  console.log('```');
}

function auditTypes() {
  console.log('\n📊 Type Safety Audit\n');
  
  // Check for as any
  let anyCount = 0;
  try {
    const result = execSync('grep -r "as any" --include="*.ts" --include="*.tsx" app/ lib/ components/ 2>&1 | wc -l', { encoding: 'utf-8', cwd: process.cwd() });
    anyCount = parseInt(result.trim()) || 0;
  } catch (e) {}
  
  // Check for unknown
  let unknownCount = 0;
  try {
    const result = execSync('grep -r "as unknown" --include="*.ts" --include="*.tsx" app/ lib/ components/ 2>&1 | wc -l', { encoding: 'utf-8', cwd: process.cwd() });
    unknownCount = parseInt(result.trim()) || 0;
  } catch (e) {}
  
  // Check types directory
  const hasTypesDir = fs.existsSync('types');
  const typeFiles = hasTypesDir ? fs.readdirSync('types').filter(f => f.endsWith('.d.ts')).length : 0;
  
  console.log('Metrics:');
  console.log(`  "as any" usage:        ${anyCount > 0 ? '⚠️ ' + anyCount : '✅ 0'}`);
  console.log(`  "as unknown" usage:    ${unknownCount} (acceptable)`);
  console.log(`  Type declaration files: ${typeFiles}`);
  console.log(`  Types directory:       ${hasTypesDir ? '✅ exists' : '❌ missing'}`);
  
  console.log('\nRecommendations:');
  if (anyCount > 0) {
    console.log('  - Run: node code.js fix-any --file=<path> for each file');
  }
  if (!hasTypesDir) {
    console.log('  - Create: mkdir types');
  }
  if (typeFiles === 0 && hasTypesDir) {
    console.log('  - Add type declarations for external libraries');
  }
  console.log('');
}

// ================ Database ================

function dbPlan(change) {
  if (!change) {
    console.error('Usage: node code.js db plan --change="description"');
    process.exit(1);
  }
  
  console.log('\n🗄️  Database Change Plan\n');
  console.log('Change:', change);
  console.log('');
  console.log('Pre-migration checklist:');
  console.log('  ☐ Review existing data in target table');
  console.log('  ☐ Check for NOT NULL constraints on new columns');
  console.log('  ☐ Plan default values for existing rows');
  console.log('  ☐ Check downstream API usage');
  console.log('  ☐ Prepare rollback strategy');
  console.log('');
  console.log('Next step:');
  console.log(`  node code.js db migrate --name=<descriptive_name>`);
  console.log('');
}

function dbMigrate(name) {
  if (!name) {
    console.error('Usage: node code.js db migrate --name=<migration_name>');
    process.exit(1);
  }
  
  console.log('\n🗄️  Creating Migration\n');
  
  try {
    execSync(`npx prisma migrate dev --name ${name}`, { 
      encoding: 'utf-8', 
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    console.log('\n✅ Migration created successfully');
  } catch (e) {
    console.log('\n❌ Migration failed');
    process.exit(1);
  }
}

function dbCheckLoss() {
  console.log('\n⚠️  Data Loss Risk Check\n');
  console.log('Review these before running migrations:\n');
  console.log('1. Column Deletions:');
  console.log('   - Is the column truly unused?');
  console.log('   - Are there API references to this column?');
  console.log('   - Is there data that needs to be migrated?\n');
  
  console.log('2. NOT NULL Constraints:');
  console.log('   - Do existing rows have values?');
  console.log('   - Is there a sensible default?\n');
  
  console.log('3. Type Changes:');
  console.log('   - Are existing values compatible?');
  console.log('   - Do you need data transformation?\n');
  
  console.log('4. Table Drops:');
  console.log('   - Is the table truly unused?');
  console.log('   - Is there a backup?\n');
  
  console.log('Best practice:');
  console.log('  1. Create backup before migration');
  console.log('  2. Run migration in staging first');
  console.log('  3. Test rollback procedure');
  console.log('');
}

function dbRollbackGuide() {
  console.log('\n↩️  Rollback Guide\n');
  console.log('Option 1: Use Prisma Migrate (if migration is recent)\n');
  console.log('  npx prisma migrate resolve --rolled-back <migration_name>');
  console.log('');
  console.log('Option 2: Create a new migration to reverse changes\n');
  console.log('  npx prisma migrate dev --name revert_<change>');
  console.log('');
  console.log('Option 3: Restore from backup\n');
  console.log('  # Restore database from pre-migration backup');
  console.log('');
  console.log('Note: Always backup before running migrations in production!\n');
}

// ================ Pre-commit ================

function preCommit() {
  console.log('\n🚀 Pre-commit Checks\n');
  
  let hasErrors = false;
  
  // Type check
  console.log('1. TypeScript check...');
  try {
    execSync('npx tsc --noEmit 2>&1', { encoding: 'utf-8', cwd: process.cwd() });
    console.log('   ✅ Pass\n');
  } catch (e) {
    console.log('   ❌ Fail\n');
    hasErrors = true;
  }
  
  // Lint check
  console.log('2. Lint check...');
  try {
    execSync('npm run lint 2>&1', { encoding: 'utf-8', cwd: process.cwd() });
    console.log('   ✅ Pass\n');
  } catch (e) {
    console.log('   ⚠️  Warnings/Errors found\n');
    hasErrors = true;
  }
  
  // as any check
  console.log('3. "as any" check...');
  try {
    const result = execSync('grep -r "as any" --include="*.ts" --include="*.tsx" app/ lib/ components/ 2>&1 | wc -l', { encoding: 'utf-8', cwd: process.cwd() });
    const count = parseInt(result.trim()) || 0;
    if (count === 0) {
      console.log('   ✅ No "as any" found\n');
    } else {
      console.log(`   ⚠️  Found ${count} occurrence(s)\n`);
      hasErrors = true;
    }
  } catch (e) {
    console.log('   ✅ No "as any" found\n');
  }
  
  // Check staged changes
  console.log('4. Staged changes check...');
  try {
    const result = execSync('git diff --staged --name-only 2>&1', { encoding: 'utf-8', cwd: process.cwd() });
    if (result.trim()) {
      const files = result.trim().split('\n');
      console.log(`   ${files.length} file(s) staged\n`);
    } else {
      console.log('   ⚠️  No staged changes\n');
    }
  } catch (e) {
    console.log('   (Not a git repository or no changes)\n');
  }
  
  if (hasErrors) {
    console.log('⚠️  Some checks failed. Review and fix before committing.\n');
    process.exit(1);
  } else {
    console.log('✅ All checks passed! Ready to commit.\n');
  }
}

// ================ Main ================

function showHelp() {
  console.log(`
Code Care - Code quality and type safety management

Usage: node code.js <category> <command> [options]

Health Check:
  health [type]           Run health checks
    type: unused | types | any | todos

Type Safety:
  fix-any --file=<path>   Suggest fixes for "as any"
  add-guard --interface=<Name>  Generate type guard template
  extend-types --package=<name> Create type extension file
  audit-types             Type safety audit report

Database:
  db plan --change=<desc> Plan a migration
  db migrate --name=<name> Create migration
  db check-loss           Check data loss risks
  db rollback-guide       Show rollback instructions

Pre-commit:
  pre-commit              Run all pre-commit checks

Examples:
  node code.js health
  node code.js fix-any --file=lib/auth.ts
  node code.js db migrate --name=add_user_role
  node code.js pre-commit
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    return;
  }
  
  const category = args[0];
  const command = args[1];
  const restArgs = args.slice(2);
  
  // Parse options
  const options = {};
  for (const arg of restArgs) {
    if (arg.startsWith('--file=')) options.file = arg.substring(7);
    else if (arg.startsWith('--interface=')) options.interface = arg.substring(12);
    else if (arg.startsWith('--package=')) options.package = arg.substring(10);
    else if (arg.startsWith('--change=')) options.change = arg.substring(9);
    else if (arg.startsWith('--name=')) options.name = arg.substring(7);
  }
  
  switch (category) {
    case 'health':
      healthCheck(command);
      break;
    case 'fix-any':
      fixAny(options.file);
      break;
    case 'add-guard':
      addGuard(options.interface);
      break;
    case 'extend-types':
      extendTypes(options.package);
      break;
    case 'audit-types':
      auditTypes();
      break;
    case 'db':
      switch (command) {
        case 'plan':
          dbPlan(options.change);
          break;
        case 'migrate':
          dbMigrate(options.name);
          break;
        case 'check-loss':
          dbCheckLoss();
          break;
        case 'rollback-guide':
        case 'rollback':
          dbRollbackGuide();
          break;
        default:
          console.error('Unknown db command:', command);
          showHelp();
          process.exit(1);
      }
      break;
    case 'pre-commit':
      preCommit();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.error('Unknown category:', category);
      showHelp();
      process.exit(1);
  }
}

main();
