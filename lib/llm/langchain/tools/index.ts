/**
 * LangChain Tools
 * 
 * カスタムツール定義と登録
 */

import { DynamicTool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * 計算ツール
 */
export const calculatorTool = new DynamicTool({
  name: 'calculator',
  description: 'Perform mathematical calculations. Input should be a valid mathematical expression like "2 + 2" or "10 * 5"',
  func: async (input: string) => {
    try {
      // 安全な計算（Functionコンストラクタを使用）
      const result = new Function('return ' + input)();
      return String(result);
    } catch (error) {
      return `Error: Invalid expression - ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

/**
 * 現在時刻取得ツール
 */
export const currentTimeTool = new DynamicTool({
  name: 'current_time',
  description: 'Get the current date and time',
  func: async () => {
    return new Date().toISOString();
  },
});

/**
 * 文字数カウントツール
 */
export const wordCountTool = new DynamicTool({
  name: 'word_count',
  description: 'Count words and characters in text',
  func: async (input: string) => {
    const words = input.trim().split(/\s+/).length;
    const chars = input.length;
    return JSON.stringify({ words, characters: chars });
  },
});

/**
 * 検索シミュレーションツール（実際の検索は別途実装）
 */
export const searchTool = new DynamicTool({
  name: 'web_search',
  description: 'Search the web for information. Use this when you need current information or facts you are not certain about.',
  func: async (query: string) => {
    // 注: 実際の検索実装は別途必要
    // ここではモックレスポンスを返す
    return `Search results for "${query}":\n\n` +
      `[This is a mock search result. Implement actual search integration with SerpAPI, Google Custom Search, etc.]`;
  },
});

/**
 * デフォルトツールセット
 */
export const defaultTools = [
  calculatorTool,
  currentTimeTool,
  wordCountTool,
];

/**
 * ツール名で検索
 */
export function getToolByName(name: string): DynamicTool | undefined {
  return defaultTools.find(tool => tool.name === name);
}

/**
 * カスタムツール作成ヘルパー
 */
export function createCustomTool(
  name: string,
  description: string,
  func: (input: string) => Promise<string>
): DynamicTool {
  return new DynamicTool({
    name,
    description,
    func,
  });
}
