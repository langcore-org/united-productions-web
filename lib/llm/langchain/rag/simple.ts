/**
 * LangChain RAG Simple Implementation
 * 
 * 依存関係を最小限にしたRAG実装
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Document } from '@langchain/core/documents';

/**
 * シンプルなテキスト分割（フォールバック実装）
 */
export function simpleTextSplit(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - chunkOverlap;
    
    if (start >= end) break;
  }

  return chunks;
}

/**
 * シンプルな類似度検索（コサイン類似度）
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * シンプルなRAG実行（VectorStoreなし）
 * 
 * 注: 本番環境では適切なVectorStoreを使用すること
 */
export async function executeSimpleRAG(
  model: BaseChatModel,
  documents: string[],
  question: string,
  options: {
    apiKey?: string;
    topK?: number;
  } = {}
): Promise<{ answer: string; sources: number[] }> {
  const embeddings = new OpenAIEmbeddings({
    apiKey: options.apiKey || process.env.OPENAI_API_KEY,
  });

  // ドキュメントと質問をエンベディング
  const docEmbeddings = await embeddings.embedDocuments(documents);
  const questionEmbedding = await embeddings.embedQuery(question);

  // 類似度を計算
  const similarities = docEmbeddings.map((emb, idx) => ({
    index: idx,
    score: cosineSimilarity(emb, questionEmbedding),
  }));

  // トップKを取得
  const topK = options.topK || 3;
  const topDocs = similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // コンテキストを構築
  const context = topDocs
    .map(d => documents[d.index])
    .join('\n\n---\n\n');

  // プロンプトを構築
  const prompt = `Answer the question based on the following context:

${context}

Question: ${question}

Answer:`;

  // モデルで回答生成
  const response = await model.invoke(prompt);
  const answer = typeof response.content === 'string'
    ? response.content
    : JSON.stringify(response.content);

  return {
    answer,
    sources: topDocs.map(d => d.index),
  };
}
