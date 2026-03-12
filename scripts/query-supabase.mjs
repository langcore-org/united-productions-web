import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQueries() {
  console.log('='.repeat(70));
  console.log('📊 Supabase データベースクエリ結果');
  console.log(`🌐 ${supabaseUrl}`);
  console.log('='.repeat(70));
  
  // 1. chatsテーブルのレコード数
  console.log('\n📊 1. chatsテーブルの総レコード数');
  console.log('-'.repeat(50));
  const { data: chatData, error: chatError } = await supabase.from('chats').select('id');
  if (chatError) {
    console.error('❌ エラー:', chatError.message);
  } else {
    console.log(`   総レコード数: ${chatData?.length || 0}`);
  }
  
  // 2. 最新10件のチャット
  console.log('\n📋 2. 最新10件のチャット');
  console.log('-'.repeat(50));
  const { data: recentChats, error: chatsError } = await supabase
    .from('chats')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (chatsError) {
    console.error('❌ エラー:', chatsError.message);
  } else if (recentChats && recentChats.length > 0) {
    for (const chat of recentChats) {
      const { data: msgList } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('chat_id', chat.id);
      const msgCount = msgList?.length || 0;
      
      console.log(`\n   ┌────────────────────────────────────────────`);
      console.log(`   │ 🆔 ${chat.id}`);
      console.log(`   │ 👤 ユーザー: ${chat.user_id?.substring(0, 25)}...`);
      console.log(`   │ 🤖 エージェント: ${chat.agent_type}`);
      console.log(`   │ 📝 タイトル: ${chat.title || '(無題)'}`);
      console.log(`   │ 📅 作成: ${new Date(chat.created_at).toLocaleString('ja-JP')}`);
      console.log(`   │ 🔄 更新: ${new Date(chat.updated_at).toLocaleString('ja-JP')}`);
      console.log(`   │ 💬 メッセージ数: ${msgCount}`);
      console.log(`   └────────────────────────────────────────────`);
    }
  } else {
    console.log('   データがありません');
  }
  
  // 3. chat_messagesテーブルのレコード数
  console.log('\n📊 3. chat_messagesテーブルの総レコード数');
  console.log('-'.repeat(50));
  const { data: msgData, error: msgError } = await supabase.from('chat_messages').select('id');
  if (msgError) {
    console.error('❌ エラー:', msgError.message);
  } else {
    console.log(`   総レコード数: ${msgData?.length || 0}`);
  }
  
  // 4. 最新5件のメッセージ
  console.log('\n📋 4. 最新5件のメッセージ');
  console.log('-'.repeat(50));
  const { data: recentMsgs, error: msgsError } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (msgsError) {
    console.error('❌ エラー:', msgsError.message);
  } else if (recentMsgs && recentMsgs.length > 0) {
    for (const msg of recentMsgs) {
      const preview = msg.content ? msg.content.substring(0, 50).replace(/\n/g, ' ') + (msg.content.length > 50 ? '...' : '') : '(空)';
      console.log(`\n   ┌────────────────────────────────────────────`);
      console.log(`   │ 🆔 ${msg.id}`);
      console.log(`   │ 💬 チャットID: ${msg.chat_id}`);
      console.log(`   │ 👤 役割: ${msg.role}`);
      console.log(`   │ 📝 内容: ${preview}`);
      console.log(`   │ 📅 作成: ${new Date(msg.created_at).toLocaleString('ja-JP')}`);
      console.log(`   └────────────────────────────────────────────`);
    }
  } else {
    console.log('   データがありません');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ クエリ実行完了');
  console.log('='.repeat(70));
}

runQueries().catch(err => {
  console.error('実行エラー:', err);
  process.exit(1);
});
