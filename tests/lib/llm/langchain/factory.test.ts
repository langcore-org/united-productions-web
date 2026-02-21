/**
 * LangChain Factory Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createLangChainModel } from '@/lib/llm/langchain/factory';
import type { LLMProvider } from '@/lib/llm/types';

describe('LangChain Factory', () => {
  describe('createLangChainModel', () => {
    it('should create OpenAI model for gpt-4o-mini', () => {
      // 環境変数が設定されている前提
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping test: OPENAI_API_KEY not set');
        return;
      }

      const model = createLangChainModel('gpt-4o-mini');
      expect(model).toBeDefined();
      expect(model.modelName).toBe('gpt-4o-mini');
    });

    it('should create model with custom temperature', () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping test: OPENAI_API_KEY not set');
        return;
      }

      const model = createLangChainModel('gpt-4o-mini', { temperature: 0.5 });
      expect(model).toBeDefined();
      expect(model.temperature).toBe(0.5);
    });

    it('should throw error for unsupported provider', () => {
      // geminiは現状未対応
      expect(() => createLangChainModel('gemini-2.5-flash-lite')).toThrow();
    });

    it('should throw error when API key is missing', () => {
      // 環境変数を一時的に削除
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      expect(() => createLangChainModel('gpt-4o-mini')).toThrow();

      // 復元
      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });
  });
});
