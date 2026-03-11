import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function checkUsers() {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, name, role")
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log(`登録ユーザー数: ${users.length}名`);
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("エラー:", error.message);
  }
}

checkUsers();
