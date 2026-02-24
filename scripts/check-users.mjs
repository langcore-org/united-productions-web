import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`登録ユーザー数: ${users.length}名`);
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
