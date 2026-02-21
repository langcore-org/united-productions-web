/**
 * LangChain Test Page
 * 
 * LangChain統合の動作確認用ページ
 */

import { LangChainChat } from '@/components/LangChainChat';
import type { LLMProvider } from '@/lib/llm/types';

export const metadata = {
  title: 'LangChain Test',
  description: 'Test LangChain integration',
};

interface PageProps {
  searchParams: Promise<{ provider?: LLMProvider }>;
}

export default async function LangChainTestPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const provider = params.provider || 'grok-4-1-fast-reasoning';

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">LangChain Integration Test</h1>
          <p className="text-sm text-gray-600 mt-1">
            Testing LangChain with {provider}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden" style={{ height: '600px' }}>
          <LangChainChat provider={provider} temperature={0.7} />
        </div>

        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Available Providers</h2>
          <div className="flex flex-wrap gap-2">
            {['grok-4-1-fast-reasoning', 'grok-4-0709'/*, 'gpt-4o-mini', 'claude-sonnet-4.5'*/].map((p) => (
              <a
                key={p}
                href={`/langchain-test?provider=${p}`}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
              >
                {p}
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
