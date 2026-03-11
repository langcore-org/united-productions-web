import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function makeAdmin(email) {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .update({ role: "ADMIN" })
      .eq("email", email)
      .select("id, email, name, role");

    const user = Array.isArray(users) ? users[0] : users;

    if (error) throw error;
    if (!user) {
      console.error("❌ ユーザーが見つかりません:", email);
      process.exit(1);
    }

    console.log("✅ 管理者権限を付与しました:");
    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error("❌ エラー:", error.message);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.error("使い方: node scripts/make-admin.mjs <メールアドレス>");
  process.exit(1);
}

makeAdmin(email);
