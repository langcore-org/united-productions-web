/**
 * プロンプトAPIテストスクリプト
 */

const BASE_URL = 'http://localhost:3002';

async function testGetPrompts() {
  console.log('\n=== GET /api/prompts ===');
  try {
    const res = await fetch(`${BASE_URL}/api/prompts`);
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Prompts count:', data.prompts?.length || 0);
    if (data.prompts?.length > 0) {
      console.log('First prompt:', data.prompts[0].key, '-', data.prompts[0].name);
    }
    return data.prompts;
  } catch (e) {
    console.error('Error:', e.message);
    return null;
  }
}

async function testGetPrompt(key) {
  console.log(`\n=== GET /api/prompts/${key} ===`);
  try {
    const res = await fetch(`${BASE_URL}/api/prompts/${key}`);
    const data = await res.json();
    console.log('Status:', res.status);
    if (data.content) {
      console.log('Version:', data.version);
      console.log('Content preview:', data.content.substring(0, 200) + '...');
    } else {
      console.log('Error:', data.error);
    }
    return data;
  } catch (e) {
    console.error('Error:', e.message);
    return null;
  }
}

async function testGetVersions(key) {
  console.log(`\n=== GET /api/prompts/${key}/versions ===`);
  try {
    const res = await fetch(`${BASE_URL}/api/prompts/${key}/versions`);
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Current version:', data.prompt?.currentVersion);
    console.log('Versions count:', data.versions?.length || 0);
    if (data.versions?.length > 0) {
      data.versions.slice(0, 3).forEach(v => {
        console.log(`  v${v.version}: ${v.changeNote || '(no note)'}`);
      });
    }
    return data;
  } catch (e) {
    console.error('Error:', e.message);
    return null;
  }
}

async function main() {
  console.log('Prompt API Test');
  
  const prompts = await testGetPrompts();
  if (!prompts || prompts.length === 0) {
    console.log('No prompts found');
    return;
  }
  
  // GENERAL_CHATの確認
  await testGetPrompt('GENERAL_CHAT');
  await testGetVersions('GENERAL_CHAT');
  
  console.log('\n=== Test completed ===');
}

main();
