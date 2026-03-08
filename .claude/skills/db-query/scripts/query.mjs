#!/usr/bin/env node
/**
 * DB Query Script - Generic Version
 * 
 * Prisma Clientを使ってデータベースを柔軟に照会
 * 
 * Usage:
 *   node query.mjs tables                              # テーブル一覧
 *   node query.mjs count [MODEL]                       # レコード数
 *   node query.mjs list MODEL [OPTIONS]                # レコード一覧
 *   node query.mjs get MODEL ID [OPTIONS]              # 特定レコード
 *   node query.mjs find MODEL CONDITIONS [OPTIONS]     # 条件検索
 *   node query.mjs schema [MODEL] [OPTIONS]            # スキーマ確認
 *   node query.mjs relation MODEL                      # リレーション確認
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const command = args[0];

// 利用可能なモデル一覧
const AVAILABLE_MODELS = [
  'SystemPrompt',
  'SystemPromptVersion',
  'FeaturePrompt',
  'User',
  'Session',
  'Chat',
  'ChatMessage',
  'MeetingNote',
  'Transcript',
  'ResearchChat',
  'Schedule',
  'LocationSchedule',
];

// オプション解析
function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

// 検索条件をパース
function parseConditions(conditionStr) {
  if (!conditionStr) return {};
  
  const conditions = {};
  const pairs = conditionStr.split(',');
  
  for (const pair of pairs) {
    const [key, value] = pair.split(/=|!=|>=|<=|>|</).map(s => s.trim());
    const operator = pair.match(/!=|>=|<=|>|</)?.[0] || '=';
    
    if (key && value !== undefined) {
      if (operator === '=' && value.includes('~')) {
        // contains検索
        conditions[key] = { contains: value.replace(/~/g, '') };
      } else if (operator === '=' && value === 'null') {
        conditions[key] = null;
      } else if (operator === '!=') {
        conditions[key] = { not: value === 'null' ? null : value };
      } else if (operator === '>') {
        conditions[key] = { gt: value };
      } else if (operator === '>=') {
        conditions[key] = { gte: value };
      } else if (operator === '<') {
        conditions[key] = { lt: value };
      } else if (operator === '<=') {
        conditions[key] = { lte: value };
      } else if (value === 'true') {
        conditions[key] = true;
      } else if (value === 'false') {
        conditions[key] = false;
      } else if (!isNaN(Number(value))) {
        conditions[key] = Number(value);
      } else {
        conditions[key] = value;
      }
    }
  }
  
  return conditions;
}

// フィールド選択をパース
function parseFields(fieldsStr) {
  if (!fieldsStr) return null;
  const fields = {};
  fieldsStr.split(',').forEach(f => {
    fields[f.trim()] = true;
  });
  return fields;
}

// includeオプションをパース
function parseInclude(includeStr) {
  if (!includeStr) return null;
  const include = {};
  includeStr.split(',').forEach(rel => {
    include[rel.trim()] = true;
  });
  return include;
}

// テーブル一覧表示
async function showTables() {
  console.log('=== Available Tables (Prisma Models) ===\n');
  
  const counts = await Promise.all(
    AVAILABLE_MODELS.map(async (model) => {
      try {
        const count = await prisma[model.charAt(0).toLowerCase() + model.slice(1)].count();
        return { model, count };
      } catch (e) {
        return { model, count: '?' };
      }
    })
  );
  
  console.log('Model Name               | Records');
  console.log('-------------------------|--------');
  for (const { model, count } of counts) {
    console.log(`${model.padEnd(24)} | ${count}`);
  }
}

// レコード数表示
async function showCount(modelName) {
  if (!modelName) {
    // 全モデルのカウント
    console.log('=== Record Counts ===\n');
    for (const model of AVAILABLE_MODELS) {
      try {
        const camelModel = model.charAt(0).toLowerCase() + model.slice(1);
        const count = await prisma[camelModel].count();
        console.log(`${model.padEnd(24)} : ${count} records`);
      } catch (e) {
        console.log(`${model.padEnd(24)} : error`);
      }
    }
  } else {
    // 特定モデルのみ
    const camelModel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const count = await prisma[camelModel].count();
    console.log(`${modelName}: ${count} records`);
  }
}

// レコード一覧表示
async function listRecords(modelName, options = {}) {
  const camelModel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const limit = parseInt(options.limit) || 20;
  const fields = parseFields(options.fields);
  const orderBy = options.order ? { [options.order]: options.desc ? 'desc' : 'asc' } : { id: 'asc' };
  
  const findOptions = {
    take: limit,
    orderBy,
  };
  
  if (fields) {
    findOptions.select = fields;
  }
  
  const records = await prisma[camelModel].findMany(findOptions);
  
  console.log(`=== ${modelName} Records (${records.length}件) ===\n`);
  
  for (const record of records) {
    console.log('-------------------------------------------');
    for (const [key, value] of Object.entries(record)) {
      if (value === null) {
        console.log(`${key}: null`);
      } else if (typeof value === 'object' && value instanceof Date) {
        console.log(`${key}: ${value.toISOString()}`);
      } else if (typeof value === 'string' && value.length > 100) {
        console.log(`${key}: ${value.substring(0, 100)}...`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }
    console.log('');
  }
}

// 特定レコード取得
async function getRecord(modelName, id, options = {}) {
  const camelModel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const idField = options.idField || 'id';
  const include = parseInclude(options.include);
  
  const findOptions = {
    where: { [idField]: id },
  };
  
  if (include) {
    findOptions.include = include;
  }
  
  const record = await prisma[camelModel].findUnique(findOptions);
  
  if (!record) {
    console.error(`Record not found: ${modelName} with ${idField}=${id}`);
    process.exit(1);
  }
  
  console.log(`=== ${modelName} Record ===\n`);
  
  function printObject(obj, indent = '') {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null) {
        console.log(`${indent}${key}: null`);
      } else if (Array.isArray(value)) {
        console.log(`${indent}${key}: [Array(${value.length})]`);
        if (value.length > 0 && options.verbose) {
          value.slice(0, 3).forEach((item, i) => {
            if (typeof item === 'object') {
              console.log(`${indent}  [${i}]:`);
              printObject(item, indent + '    ');
            }
          });
        }
      } else if (typeof value === 'object' && value instanceof Date) {
        console.log(`${indent}${key}: ${value.toISOString()}`);
      } else if (typeof value === 'object') {
        console.log(`${indent}${key}:`);
        printObject(value, indent + '  ');
      } else if (typeof value === 'string' && value.length > 200) {
        console.log(`${indent}${key}:`);
        console.log(`${indent}  ${value.substring(0, 200)}...`);
      } else {
        console.log(`${indent}${key}: ${value}`);
      }
    }
  }
  
  printObject(record);
}

// 条件検索
async function findRecords(modelName, conditions, options = {}) {
  const camelModel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const where = parseConditions(conditions);
  const limit = parseInt(options.limit) || 20;
  const fields = parseFields(options.fields);
  const orderBy = options.order ? { [options.order]: options.desc ? 'desc' : 'asc' } : { id: 'asc' };
  
  const findOptions = {
    where,
    take: limit,
    orderBy,
  };
  
  if (fields) {
    findOptions.select = fields;
  }
  
  const records = await prisma[camelModel].findMany(findOptions);
  
  console.log(`=== ${modelName} Records (found: ${records.length}) ===`);
  console.log(`Conditions: ${conditions}\n`);
  
  for (const record of records) {
    console.log('-------------------------------------------');
    for (const [key, value] of Object.entries(record)) {
      if (value === null) {
        console.log(`${key}: null`);
      } else if (typeof value === 'object' && value instanceof Date) {
        console.log(`${key}: ${value.toISOString()}`);
      } else if (typeof value === 'string' && value.length > 100) {
        console.log(`${key}: ${value.substring(0, 100)}...`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }
    console.log('');
  }
}

// スキーマ情報表示（簡易版）
async function showSchema(modelName, options = {}) {
  if (!modelName) {
    // 全モデル一覧
    console.log('=== Available Models ===\n');
    for (const model of AVAILABLE_MODELS) {
      console.log(`- ${model}`);
    }
    console.log('\nUse: schema [MODEL] --detailed for field details');
    return;
  }
  
  console.log(`=== ${modelName} Schema ===\n`);
  
  // Prismaの型定義からフィールド情報を取得（簡易版）
  const schemaInfo = {
    SystemPrompt: {
      fields: [
        { name: 'id', type: 'String', id: true },
        { name: 'key', type: 'String', unique: true },
        { name: 'name', type: 'String' },
        { name: 'description', type: 'String?', optional: true },
        { name: 'content', type: 'String' },
        { name: 'category', type: 'String' },
        { name: 'isActive', type: 'Boolean', default: 'true' },
        { name: 'currentVersion', type: 'Int', default: '1' },
        { name: 'changedBy', type: 'String?', optional: true },
        { name: 'changeNote', type: 'String?', optional: true },
        { name: 'createdAt', type: 'DateTime' },
        { name: 'updatedAt', type: 'DateTime' },
      ],
      relations: ['versions'],
    },
    FeaturePrompt: {
      fields: [
        { name: 'id', type: 'String', id: true },
        { name: 'featureId', type: 'String', unique: true },
        { name: 'promptKey', type: 'String' },
        { name: 'description', type: 'String?', optional: true },
        { name: 'isActive', type: 'Boolean', default: 'true' },
        { name: 'createdAt', type: 'DateTime' },
        { name: 'updatedAt', type: 'DateTime' },
      ],
      relations: [],
    },
    User: {
      fields: [
        { name: 'id', type: 'String', id: true },
        { name: 'name', type: 'String?', optional: true },
        { name: 'email', type: 'String', unique: true },
        { name: 'role', type: 'String', default: 'USER' },
        { name: 'image', type: 'String?', optional: true },
        { name: 'isActive', type: 'Boolean', default: 'true' },
        { name: 'createdAt', type: 'DateTime' },
        { name: 'updatedAt', type: 'DateTime' },
        { name: 'lastLoginAt', type: 'DateTime?', optional: true },
      ],
      relations: ['sessions', 'chats', 'meetingNotes', 'transcripts', 'researchChats', 'schedules'],
    },
    Chat: {
      fields: [
        { name: 'id', type: 'String', id: true },
        { name: 'userId', type: 'String' },
        { name: 'title', type: 'String?' },
        { name: 'featureId', type: 'String?' },
        { name: 'agentType', type: 'String?' },
        { name: 'isArchived', type: 'Boolean', default: 'false' },
        { name: 'createdAt', type: 'DateTime' },
        { name: 'updatedAt', type: 'DateTime' },
      ],
      relations: ['messages'],
    },
  };
  
  const info = schemaInfo[modelName];
  if (!info) {
    console.log(`Schema info for ${modelName} not available. Check schema.prisma file.`);
    return;
  }
  
  console.log('Fields:');
  console.log('-------');
  for (const field of info.fields) {
    const flags = [];
    if (field.id) flags.push('ID');
    if (field.unique) flags.push('UNIQUE');
    if (field.optional) flags.push('optional');
    if (field.default) flags.push(`default: ${field.default}`);
    
    const flagStr = flags.length > 0 ? ` (${flags.join(', ')})` : '';
    console.log(`  ${field.name}: ${field.type}${flagStr}`);
  }
  
  if (info.relations.length > 0) {
    console.log('\nRelations:');
    console.log('----------');
    for (const rel of info.relations) {
      console.log(`  ${rel}`);
    }
  }
}

// リレーション確認
async function showRelations(modelName) {
  const relations = {
    SystemPrompt: ['versions (SystemPromptVersion[])'],
    FeaturePrompt: [],
    User: ['sessions', 'chats', 'meetingNotes', 'transcripts', 'researchChats', 'schedules'],
    Chat: ['messages (ChatMessage[])', 'user'],
    ChatMessage: ['chat'],
    MeetingNote: ['user'],
    Transcript: ['user'],
    ResearchChat: ['user'],
    Schedule: ['user', 'locationSchedules'],
    LocationSchedule: ['schedule'],
    SystemPromptVersion: ['prompt (SystemPrompt)'],
  };
  
  console.log(`=== ${modelName} Relations ===\n`);
  
  const rels = relations[modelName] || [];
  if (rels.length === 0) {
    console.log('No relations defined.');
  } else {
    for (const rel of rels) {
      console.log(`- ${rel}`);
    }
  }
  
  console.log('\nTo include relations in query:');
  console.log(`  node query.mjs get ${modelName} [ID] --include ${rels[0]?.split(' ')[0] || 'relationName'}`);
}

// メイン処理
async function main() {
  const options = parseOptions(args.slice(2));
  
  try {
    switch (command) {
      case 'tables':
        await showTables();
        break;
        
      case 'count':
        await showCount(args[1]);
        break;
        
      case 'list':
        if (!args[1]) {
          console.error('Usage: list [MODEL] [OPTIONS]');
          console.error('Example: list SystemPrompt --limit 10');
          process.exit(1);
        }
        await listRecords(args[1], options);
        break;
        
      case 'get':
        if (!args[1] || !args[2]) {
          console.error('Usage: get [MODEL] [ID] [OPTIONS]');
          console.error('Example: get SystemPrompt prompt_transcript');
          process.exit(1);
        }
        await getRecord(args[1], args[2], options);
        break;
        
      case 'find':
        if (!args[1] || !args[2]) {
          console.error('Usage: find [MODEL] [CONDITIONS] [OPTIONS]');
          console.error('Example: find SystemPrompt "category=transcript"');
          process.exit(1);
        }
        await findRecords(args[1], args[2], options);
        break;
        
      case 'schema':
        await showSchema(args[1], options);
        break;
        
      case 'relation':
        if (!args[1]) {
          console.error('Usage: relation [MODEL]');
          process.exit(1);
        }
        await showRelations(args[1]);
        break;
        
      default:
        console.log('DB Query Tool - Usage:');
        console.log('');
        console.log('  node query.mjs tables                              # テーブル一覧');
        console.log('  node query.mjs count [MODEL]                       # レコード数');
        console.log('  node query.mjs list MODEL [OPTIONS]                # レコード一覧');
        console.log('  node query.mjs get MODEL ID [OPTIONS]              # 特定レコード');
        console.log('  node query.mjs find MODEL CONDITIONS [OPTIONS]     # 条件検索');
        console.log('  node query.mjs schema [MODEL] [OPTIONS]            # スキーマ確認');
        console.log('  node query.mjs relation MODEL                      # リレーション確認');
        console.log('');
        console.log('Options:');
        console.log('  --limit N        取得件数（default: 20）');
        console.log('  --fields a,b,c   表示フィールド');
        console.log('  --order FIELD    ソートフィールド');
        console.log('  --desc           降順ソート');
        console.log('  --include REL    リレーションを含める');
        console.log('  --idField NAME   IDフィールド名を指定');
        console.log('');
        console.log('Examples:');
        console.log('  node query.mjs list SystemPrompt --limit 5 --fields key,name');
        console.log('  node query.mjs find SystemPrompt "key~TRANSCRIPT"');
        console.log('  node query.mjs find User "role=ADMIN,isActive=true"');
        console.log('  node query.mjs get SystemPrompt prompt_transcript --include versions');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
