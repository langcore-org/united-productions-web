/**
 * Neonデータベース確認スクリプト (pg使用)
 */
import pg from 'pg';
const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_I4bJ3BjiFCNX@ep-plain-grass-a10993pu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({ connectionString: databaseUrl });

async function checkNeon() {
  console.log('========================================');
  console.log('🐘 Neon (PostgreSQL) データベース確認');
  console.log('========================================\n');
  
  try {
    await client.connect();
    console.log('✅ 接続成功\n');
    
    // テーブル一覧
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 テーブル一覧:');
    tablesResult.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.table_name}`);
    });
    
    // ResearchChatテーブル確認（Prismaの古いテーブル名）
    console.log('\n🔍 ResearchChatテーブル:');
    try {
      const chatResult = await client.query('SELECT COUNT(*) as count FROM "ResearchChat"');
      console.log(`  レコード数: ${chatResult.rows[0].count}`);
      
      if (parseInt(chatResult.rows[0].count) > 0) {
        const recentChats = await client.query(`
          SELECT id, "userId", "agentType", title, "updatedAt"
          FROM "ResearchChat"
          ORDER BY "updatedAt" DESC
          LIMIT 5
        `);
        console.log('\n  最新5件:');
        recentChats.rows.forEach((c, i) => {
          console.log(`    ${i+1}. ${c.id} | ${c.agentType} | ${c.title?.substring(0, 30) || '(no title)'} | ${c.updatedAt}`);
        });
      }
    } catch (e) {
      console.log(`  テーブルなしまたはエラー: ${e.message}`);
    }
    
    // ResearchMessageテーブル確認
    console.log('\n💬 ResearchMessageテーブル:');
    try {
      const msgResult = await client.query('SELECT COUNT(*) as count FROM "ResearchMessage"');
      console.log(`  レコード数: ${msgResult.rows[0].count}`);
    } catch (e) {
      console.log(`  テーブルなしまたはエラー: ${e.message}`);
    }
    
    // chatsテーブル確認（Supabase移行後のテーブル名）
    console.log('\n🔍 chatsテーブル（小文字）:');
    try {
      const chatResult = await client.query('SELECT COUNT(*) as count FROM chats');
      console.log(`  レコード数: ${chatResult.rows[0].count}`);
      
      if (parseInt(chatResult.rows[0].count) > 0) {
        const recentChats = await client.query(`
          SELECT id, user_id, agent_type, title, updated_at
          FROM chats
          ORDER BY updated_at DESC
          LIMIT 5
        `);
        console.log('\n  最新5件:');
        recentChats.rows.forEach((c, i) => {
          console.log(`    ${i+1}. ${c.id.substring(0, 8)}... | ${c.agent_type} | ${c.title?.substring(0, 30) || '(no title)'} | ${c.updated_at}`);
        });
      }
    } catch (e) {
      console.log(`  テーブルなしまたはエラー: ${e.message}`);
    }
    
    // Userテーブル確認
    console.log('\n👤 Userテーブル:');
    try {
      const userResult = await client.query('SELECT COUNT(*) as count FROM "User"');
      console.log(`  レコード数: ${userResult.rows[0].count}`);
      
      if (parseInt(userResult.rows[0].count) > 0) {
        const users = await client.query(`
          SELECT id, email, name, "createdAt"
          FROM "User"
          LIMIT 5
        `);
        users.rows.forEach((u, i) => {
          console.log(`    ${i+1}. ${u.email} | ${u.name || '(no name)'} | ${u.id.substring(0, 8)}...`);
        });
      }
    } catch (e) {
      console.log(`  テーブルなしまたはエラー: ${e.message}`);
    }
    
  } catch (error) {
    console.error('❌ 接続エラー:', error.message);
  } finally {
    await client.end();
  }
  
  console.log('\n========================================');
  console.log('確認完了');
  console.log('========================================');
}

checkNeon().catch(console.error);
