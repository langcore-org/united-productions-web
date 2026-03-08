import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function makeAdmin(email) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
      select: { id: true, email: true, name: true, role: true },
    });
    console.log("✅ 管理者権限を付与しました:");
    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error("❌ エラー:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
if (!email) {
  console.error("使い方: node scripts/make-admin.mjs <メールアドレス>");
  process.exit(1);
}

makeAdmin(email);
