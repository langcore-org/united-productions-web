/**
 * LangChain動作テストスクリプト
 * 
 * Grok APIを使用してLangChainの動作を確認
 */

import { createLangChainModel } from '../lib/llm/langchain/factory';
import { executeChat } from '../lib/llm/langchain/chains/base';
import { executeStreamingChat } from '../lib/llm/langchain/chains/streaming';
import type { LLMMessage } from '../lib/llm/types';

const messages: LLMMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello! What is your name?' },
];

async function testNonStreaming() {
  console.log('=== Testing Non-Streaming Chat ===\n');
  
  try {
    const model = createLangChainModel('grok-4-1-fast-reasoning', {
      temperature: 0.7,
    });
    
    console.log('Model created successfully');
    
    const response = await executeChat(model, messages, 'grok-4-1-fast-reasoning');
    
    console.log('\nResponse:');
    console.log(response.content);
    console.log('\nUsage:', response.usage);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testStreaming() {
  console.log('\n=== Testing Streaming Chat ===\n');
  
  try {
    const model = createLangChainModel('grok-4-1-fast-reasoning', {
      temperature: 0.7,
      streaming: true,
    });
    
    console.log('Model created successfully');
    console.log('Streaming response:\n');
    
    let fullContent = '';
    
    for await (const { chunk, usage, error } of executeStreamingChat(model, messages)) {
      if (error) {
        console.error('Stream error:', error);
        break;
      }
      
      if (chunk) {
        process.stdout.write(chunk);
        fullContent += chunk;
      }
      
      if (usage) {
        console.log('\n\nUsage:', usage);
      }
    }
    
    console.log('\n\nFull content length:', fullContent.length);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  console.log('LangChain Grok API Test\n');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('XAI_API_KEY exists:', !!process.env.XAI_API_KEY);
  console.log('');
  
  if (!process.env.XAI_API_KEY) {
    console.error('Error: XAI_API_KEY is not set');
    process.exit(1);
  }
  
  // 非同期テスト
  await testNonStreaming();
  
  // ストリーミングテスト
  await testStreaming();
  
  console.log('\n=== All tests completed ===');
}

main().catch(console.error);
