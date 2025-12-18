import { createOpenAI } from '@ai-sdk/openai';

// Create OpenAI-compatible client pointing to CLIProxyAPI
export const cliproxy = createOpenAI({
  baseURL: process.env.CLIPROXY_URL || 'http://localhost:8317/v1',
  apiKey: process.env.CLIPROXY_API_KEY || 'sk-default',
});

// Available Claude models
export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude 4.5 Haiku',
    description: 'Fast and cost-effective',
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude 4.5 Sonnet',
    description: 'Balanced performance',
  },
  {
    id: 'claude-opus-4-1-20250805',
    name: 'Claude 4.1 Opus',
    description: 'Most capable',
  },
];

// Default model
export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'claude-haiku-4-5-20251001';
