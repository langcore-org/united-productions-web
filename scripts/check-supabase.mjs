/**
 * Supabaseデータベース確認スクリプト
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tbzqswctewjgmhtswssq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRienFzd2N0ZXdqZ21odHN3c3NxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTkyOSwiZXhwIjoyMDg2NzkxOTI5fQ.96QbwF9tEksvuwQrNron97uWMQdDstjHfaSMe5rDDig';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabase() {
  console.log('========================================');
  console.log('📦 Supabase データベース確認');
  console.log('========================================\n');
  
  // chatsテーブル
  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (chatsError) {
    console.error('❌ chatsテーブルエラー:', chatsError.message);
    return;
  }
  
  console.log(`✅ chatsテーブル: ${chats?.length || 0} 件（最新10件）`);
  if (chats && chats.length > 0) {
    console.log('\n最新10件:');
    chats.forEach((c, i) => {
      console.log(`  ${i+1}. ${c.id} | ${c.agent_type} | ${c.title?.substring(0, 30) || '(no title)'} | ${c.updated_at}`);
    });
  } else {
    console.log('  （データなし）');
  }
  
  // chat_messagesテーブル
  const { data: messages, error: msgError, count: msgCount } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact' });
  
  if (msgError) {
    console.error('❌ chat_messagesテーブルエラー:', msgError.message);
  } else {
    console.log(`\n✅ chat_messagesテーブル: ${msgCount} 件`);
  }
  
  // ユーザー一覧
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, name, created_at')
    .limit(5);
  
  if (userError) {
    console.error('❌ usersテーブルエラー:', userError.message);
  } else {
    console.log(`\n✅ usersテーブル: ${users?.length || 0} 件`);
    users?.forEach((u, i) => {
      console.log(`  ${i+1}. ${u.email} | ${u.name || '(no name)'} | ${u.id.substring(0, 8)}...`);
    });
  }
  
  console.log('\n========================================');
  console.log('確認完了');
  console.log('========================================');
}

checkSupabase().catch(console.error);
