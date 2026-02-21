/**
 * LangChain Agents
 * 
 * エージェントパターン実装
 */

import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { DynamicTool } from '@langchain/core/tools';
import { defaultTools } from '../tools';

/**
 * OpenAI Functions Agentを作成
 */
export async function createFunctionsAgent(
  model: BaseChatModel,
  tools: DynamicTool[] = defaultTools,
  systemMessage?: string
): Promise<AgentExecutor> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemMessage || 'You are a helpful assistant with access to tools.'],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

  const agent = await createOpenAIFunctionsAgent({
    llm: model,
    tools,
    prompt,
  });

  return new AgentExecutor({
    agent,
    tools,
    verbose: process.env.NODE_ENV === 'development',
  });
}

/**
 * エージェントを実行
 */
export async function runAgent(
  executor: AgentExecutor,
  input: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{ output: string; intermediateSteps: unknown[] }> {
  const result = await executor.invoke({
    input,
    chat_history: chatHistory,
  });

  return {
    output: result.output as string,
    intermediateSteps: result.intermediateSteps || [],
  };
}

/**
 * シンプルなツール使用チェーン
 * （Agentを使わずにツールを直接呼び出す）
 */
export async function executeWithTools(
  model: BaseChatModel,
  tools: DynamicTool[],
  query: string
): Promise<string> {
  // ツールの説明を作成
  const toolDescriptions = tools
    .map(t => `- ${t.name}: ${t.description}`)
    .join('\n');

  const prompt = `You have access to the following tools:
${toolDescriptions}

To use a tool, respond with:
TOOL: <tool_name>
INPUT: <tool_input>

If you don't need a tool, respond directly.

User query: ${query}`;

  const response = await model.invoke(prompt);
  const content = typeof response.content === 'string' 
    ? response.content 
    : JSON.stringify(response.content);

  // ツール呼び出しをパース
  const toolMatch = content.match(/TOOL:\s*(\w+)\s*\nINPUT:\s*(.+)/i);
  
  if (toolMatch) {
    const toolName = toolMatch[1];
    const toolInput = toolMatch[2].trim();
    
    const tool = tools.find(t => t.name === toolName);
    if (tool) {
      const toolResult = await tool.func(toolInput);
      
      // ツール結果を含めて再度モデルを呼び出し
      const finalPrompt = `${prompt}\n\nAssistant: ${content}\n\nTool result: ${toolResult}\n\nBased on this result, provide your final response.`;
      const finalResponse = await model.invoke(finalPrompt);
      
      return typeof finalResponse.content === 'string'
        ? finalResponse.content
        : JSON.stringify(finalResponse.content);
    }
  }

  return content;
}
