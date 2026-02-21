/**
 * LangChain Agents
 * 
 * エージェントパターン実装（簡略版）
 * 
 * 注: 完全なAgent機能は別途 langchain/agents パッケージが必要
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { DynamicTool } from '@langchain/core/tools';
import { defaultTools } from '../tools';

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

/**
 * デフォルトツールで実行
 */
export async function executeWithDefaultTools(
  model: BaseChatModel,
  query: string
): Promise<string> {
  return executeWithTools(model, defaultTools, query);
}
