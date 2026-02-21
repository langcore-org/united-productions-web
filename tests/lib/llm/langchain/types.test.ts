/**
 * LangChain Types Tests
 */

import { describe, it, expect } from 'vitest';
import { toLangChainMessages, fromLangChainMessages } from '@/lib/llm/langchain/types';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { LLMMessage } from '@/lib/llm/types';

describe('LangChain Types', () => {
  describe('toLangChainMessages', () => {
    it('should convert user message to HumanMessage', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const result = toLangChainMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(HumanMessage);
      expect(result[0].content).toBe('Hello');
    });

    it('should convert assistant message to AIMessage', () => {
      const messages: LLMMessage[] = [
        { role: 'assistant', content: 'Hi there!' },
      ];

      const result = toLangChainMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(AIMessage);
      expect(result[0].content).toBe('Hi there!');
    });

    it('should convert system message to SystemMessage', () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
      ];

      const result = toLangChainMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(SystemMessage);
      expect(result[0].content).toBe('You are a helpful assistant.');
    });

    it('should convert mixed messages', () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant response' },
      ];

      const result = toLangChainMessages(messages);

      expect(result).toHaveLength(3);
      expect(result[0]).toBeInstanceOf(SystemMessage);
      expect(result[1]).toBeInstanceOf(HumanMessage);
      expect(result[2]).toBeInstanceOf(AIMessage);
    });
  });

  describe('fromLangChainMessages', () => {
    it('should convert HumanMessage to user role', () => {
      const messages = [new HumanMessage('Hello')];

      const result = fromLangChainMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('Hello');
    });

    it('should convert AIMessage to assistant role', () => {
      const messages = [new AIMessage('Hi there!')];

      const result = fromLangChainMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
      expect(result[0].content).toBe('Hi there!');
    });

    it('should convert SystemMessage to system role', () => {
      const messages = [new SystemMessage('You are a helpful assistant.')];

      const result = fromLangChainMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('system');
      expect(result[0].content).toBe('You are a helpful assistant.');
    });
  });
});
