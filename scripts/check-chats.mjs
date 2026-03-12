/**
 * Supabase の chats / chat_messages テーブルのレコードを確認するスクリプト
 * 実行: node --env-file=.env.local scripts/check-chats.mjs
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function checkChats() {
  try {
    const { data: chats, error: chatsError } = await supabase
      .from("chats")
      .select("id, user_id, agent_type, title, llm_provider, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (chatsError) {
      console.error("chats 取得エラー:", chatsError.message);
      return;
    }

    console.log("=== chats テーブル ===");
    console.log(`レコード数: ${chats?.length ?? 0}`);
    if (chats?.length) {
      console.log(JSON.stringify(chats, null, 2));
    }

    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("id, chat_id, role, content, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (messagesError) {
      console.error("chat_messages 取得エラー:", messagesError.message);
      return;
    }

    console.log("\n=== chat_messages テーブル（直近50件） ===");
    console.log(`レコード数（取得分）: ${messages?.length ?? 0}`);
    if (messages?.length) {
      const preview = messages.map((m) => ({
        ...m,
        content: m.content ? `${String(m.content).slice(0, 80)}${m.content.length > 80 ? "…" : ""}` : null,
      }));
      console.log(JSON.stringify(preview, null, 2));
    }
  } catch (err) {
    console.error("エラー:", err.message);
    process.exit(1);
  }
}

checkChats();
