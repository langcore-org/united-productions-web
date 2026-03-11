/**
 * プロンプト使用状況調査（詳細版）
 */

import { createAdminClient } from "@/lib/supabase/admin";

const USAGE_MAP: Record<string, { used: boolean; location: string }> = {
  GENERAL_CHAT: { used: true, location: "chat-config.ts (general-chat)" },
  RESEARCH_CAST: { used: true, location: "chat-config.ts (research-cast)" },
  RESEARCH_LOCATION: { used: true, location: "chat-config.ts (research-location)" },
  RESEARCH_INFO: { used: true, location: "chat-config.ts (research-info)" },
  RESEARCH_EVIDENCE: { used: true, location: "chat-config.ts (research-evidence)" },
  MINUTES: { used: true, location: "chat-config.ts (minutes)" },
  PROPOSAL: { used: true, location: "chat-config.ts (proposal)" },
  TRANSCRIPT: { used: true, location: "chat-config.ts (na-script)" },
  AGENTIC_BASE: { used: true, location: "prompts/constants/base.ts" },
  MEETING_FORMAT_MEETING: { used: true, location: "api/meeting-notes/route.ts" },
  MEETING_FORMAT_INTERVIEW: { used: true, location: "api/meeting-notes/route.ts" },
  TRANSCRIPT_FORMAT: { used: true, location: "api/transcripts/route.ts" },
  SCHEDULE_SYSTEM: { used: false, location: "未使用？" },
  SCHEDULE_ACTOR: { used: false, location: "未使用？" },
  SCHEDULE_STAFF: { used: false, location: "未使用？" },
  SCHEDULE_VEHICLE: { used: false, location: "未使用？" },
};

async function main() {
  console.log("=== プロンプト使用状況調査 ===\n");

  const supabase = createAdminClient();
  const { data: dbPrompts, error } = await supabase
    .from("system_prompts")
    .select("key, name")
    .order("key");

  if (error) throw error;

  console.log("【使用中】\n");
  for (const p of dbPrompts) {
    const usage = USAGE_MAP[p.key];
    if (usage?.used) {
      console.log(`  ✅ ${p.key}`);
      console.log(`     ${p.name}`);
      console.log(`     → ${usage.location}\n`);
    }
  }

  console.log("【未使用の可能性】\n");
  for (const p of dbPrompts) {
    const usage = USAGE_MAP[p.key];
    if (!usage?.used) {
      console.log(`  ❓ ${p.key}`);
      console.log(`     ${p.name}\n`);
    }
  }
}

main();
