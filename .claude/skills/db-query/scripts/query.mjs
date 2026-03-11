#!/usr/bin/env node
/**
 * DB Query Script - Supabase版
 *
 * Supabase Clientでデータベースを照会
 *
 * Usage:
 *   node query.mjs tables
 *   node query.mjs count [TABLE]
 *   node query.mjs list TABLE [OPTIONS]
 *   node query.mjs get TABLE ID [OPTIONS]
 *   node query.mjs find TABLE "col=val" [OPTIONS]
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const args = process.argv.slice(2);
const command = args[0];

const TABLE_ALIAS = {
  SystemPrompt: "system_prompts",
  SystemPromptVersion: "system_prompt_versions",
  FeaturePrompt: "feature_prompts",
  User: "users",
  MeetingNote: "meeting_notes",
  Transcript: "transcripts",
  ResearchChat: "research_chats",
  ResearchMessage: "research_messages",
  UsageLog: "usage_logs",
  ProgramSettings: "program_settings",
  SystemSettings: "system_settings",
};

const AVAILABLE_TABLES = [
  "system_prompts",
  "system_prompt_versions",
  "feature_prompts",
  "users",
  "meeting_notes",
  "transcripts",
  "research_chats",
  "research_messages",
  "usage_logs",
  "program_settings",
  "system_settings",
];

function toTableName(name) {
  if (TABLE_ALIAS[name]) return TABLE_ALIAS[name];
  if (name.includes("_")) return name;
  return name.replace(/([A-Z])/g, (_, c) => `_${c.toLowerCase()}`).replace(/^_/, "");
}

function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith("--")) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

function parseConditions(conditionStr) {
  const conditions = {};
  if (!conditionStr) return conditions;
  const pairs = conditionStr.split(",");
  for (const pair of pairs) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) continue;
    const key = pair.slice(0, eqIndex).trim().replace(/([A-Z])/g, (_, c) => `_${c.toLowerCase()}`).replace(/^_/, "");
    let value = pair.slice(eqIndex + 1).trim();
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (value === "null") value = null;
    else if (!Number.isNaN(Number(value))) value = Number(value);
    conditions[key] = value;
  }
  return conditions;
}

async function showTables() {
  console.log("=== Available Tables (Supabase) ===\n");
  console.log("Table Name                 | Records");
  console.log("---------------------------|--------");

  for (const table of AVAILABLE_TABLES) {
    try {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      console.log(`${table.padEnd(26)} | ${error ? "?" : count ?? "?"}`);
    } catch (e) {
      console.log(`${table.padEnd(26)} | error`);
    }
  }
}

async function showCount(tableName) {
  const table = toTableName(tableName);
  if (!AVAILABLE_TABLES.includes(table)) {
    console.error(`Unknown table: ${tableName}`);
    process.exit(1);
  }
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(`${table}: ${count ?? 0} records`);
}

async function listRecords(tableName, options = {}) {
  const table = toTableName(tableName);
  if (!AVAILABLE_TABLES.includes(table)) {
    console.error(`Unknown table: ${tableName}`);
    process.exit(1);
  }
  const limit = Number.parseInt(options.limit, 10) || 20;
  const order = options.order || "created_at";
  const ascending = !options.desc;

  let q = supabase.from(table).select(options.fields || "*").order(order, { ascending }).limit(limit);
  const { data: records, error } = await q;

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`=== ${table} Records (${records.length}件) ===\n`);
  for (const record of records) {
    console.log("-------------------------------------------");
    for (const [key, value] of Object.entries(record)) {
      if (value === null) console.log(`${key}: null`);
      else if (typeof value === "object" && value instanceof Date) console.log(`${key}: ${value.toISOString()}`);
      else if (typeof value === "string" && value.length > 100) console.log(`${key}: ${value.substring(0, 100)}...`);
      else console.log(`${key}: ${value}`);
    }
    console.log("");
  }
}

async function getRecord(tableName, id, options = {}) {
  const table = toTableName(tableName);
  if (!AVAILABLE_TABLES.includes(table)) {
    console.error(`Unknown table: ${tableName}`);
    process.exit(1);
  }
  const idField = options.idField || "id";
  let q = supabase.from(table).select(options.fields || "*").eq(idField, id);
  const { data: record, error } = await q.single();

  if (error || !record) {
    console.error(`Record not found: ${table} with ${idField}=${id}`);
    process.exit(1);
  }

  console.log(`=== ${table} Record ===\n`);
  for (const [key, value] of Object.entries(record)) {
    if (value === null) console.log(`${key}: null`);
    else if (typeof value === "string" && value.length > 200) console.log(`${key}:\n  ${value.substring(0, 200)}...`);
    else console.log(`${key}: ${value}`);
  }
}

async function findRecords(tableName, conditions, options = {}) {
  const table = toTableName(tableName);
  if (!AVAILABLE_TABLES.includes(table)) {
    console.error(`Unknown table: ${tableName}`);
    process.exit(1);
  }
  const where = parseConditions(conditions);
  const limit = Number.parseInt(options.limit, 10) || 20;

  let q = supabase.from(table).select(options.fields || "*").limit(limit);
  for (const [col, val] of Object.entries(where)) {
    q = q.eq(col, val);
  }

  const { data: records, error } = await q;

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`=== ${table} Records (found: ${records.length}) ===`);
  console.log(`Conditions: ${conditions}\n`);

  for (const record of records) {
    console.log("-------------------------------------------");
    for (const [key, value] of Object.entries(record)) {
      if (value === null) console.log(`${key}: null`);
      else if (typeof value === "string" && value.length > 100) console.log(`${key}: ${value.substring(0, 100)}...`);
      else console.log(`${key}: ${value}`);
    }
    console.log("");
  }
}

async function main() {
  const options = parseOptions(args.slice(2));

  try {
    switch (command) {
      case "tables":
        await showTables();
        break;
      case "count":
        await showCount(args[1]);
        break;
      case "list":
        if (!args[1]) {
          console.error("Usage: list TABLE [OPTIONS]");
          process.exit(1);
        }
        await listRecords(args[1], options);
        break;
      case "get":
        if (!args[1] || !args[2]) {
          console.error("Usage: get TABLE ID [OPTIONS]");
          process.exit(1);
        }
        await getRecord(args[1], args[2], options);
        break;
      case "find":
        if (!args[1] || !args[2]) {
          console.error('Usage: find TABLE "col=val" [OPTIONS]');
          process.exit(1);
        }
        await findRecords(args[1], args[2], options);
        break;
      default:
        console.log("DB Query (Supabase) - Usage:\n");
        console.log("  node query.mjs tables");
        console.log("  node query.mjs count [TABLE]");
        console.log("  node query.mjs list TABLE [--limit N] [--fields a,b,c]");
        console.log("  node query.mjs get TABLE ID");
        console.log('  node query.mjs find TABLE "col=val" [--fields a,b,c]');
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
