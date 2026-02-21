/**
 * LangChain RAG (Retrieval-Augmented Generation)
 * 
 * 文書検索・RAG機能の基盤実装
 */

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Document } from '@langchain/core/documents';

/**
 * テキストをチャンクに分割
 */
export async function splitText(
  text: string,
  options: {
    chunkSize?: number;
    chunkOverlap?: number;
  } = {}
): Promise<Document[]> {
  const { chunkSize = 1000, chunkOverlap = 200 } = options;

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  return splitter.createDocuments([text]);
}

/**
 * メモリベクトルストアを作成
 * 
 * 注: 本番環境ではPinecone、Weaviate、Supabase等の外部Vector Storeを使用
 */
export async function createVectorStore(
  documents: Document[],
  apiKey?: string
): Promise<MemoryVectorStore> {
  const embeddings = new OpenAIEmbeddings({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
  });

  return MemoryVectorStore.fromDocuments(documents, embeddings);
}

/**
 * RAG Chainを作成
 */
export function createRAGChain(
  model: BaseChatModel,
  retriever: ReturnType<MemoryVectorStore['asRetriever']>,
  systemPrompt?: string
) {
  const defaultPrompt = `Answer the question based only on the following context:

{context}

Question: {question}

Answer:`;

  return RunnableSequence.from([
    {
      context: async (input: { question: string }) => {
        const docs = await retriever.invoke(input.question);
        return docs.map((doc: Document) => doc.pageContent).join('\n\n');
      },
      question: (input: { question: string }) => input.question,
    },
    {
      context: (input: { context: string; question: string }) => input.context,
      question: (input: { context: string; question: string }) => input.question,
      prompt: () => systemPrompt || defaultPrompt,
    },
    async (input: { context: string; question: string; prompt: string }) => {
      const formattedPrompt = input.prompt
        .replace('{context}', input.context)
        .replace('{question}', input.question);
      
      const response = await model.invoke(formattedPrompt);
      return typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
    },
    new StringOutputParser(),
  ]);
}

/**
 * シンプルなRAG実行
 */
export async function executeRAG(
  model: BaseChatModel,
  documents: Document[],
  question: string,
  options: {
    apiKey?: string;
    systemPrompt?: string;
    topK?: number;
  } = {}
): Promise<{ answer: string; sources: string[] }> {
  const vectorStore = await createVectorStore(documents, options.apiKey);
  const retriever = vectorStore.asRetriever({ k: options.topK || 4 });
  
  const chain = createRAGChain(model, retriever, options.systemPrompt);
  const answer = await chain.invoke({ question });
  
  // ソース取得
  const sourceDocs = await retriever.invoke(question);
  const sources = sourceDocs.map((doc: Document) => doc.metadata?.source || 'Unknown');

  return { answer, sources };
}

/**
 * 複数ドキュメントからRAG用VectorStore作成
 */
export async function createRAGFromTexts(
  texts: Array<{ content: string; metadata?: Record<string, unknown> }>,
  apiKey?: string
): Promise<MemoryVectorStore> {
  const documents: Document[] = [];

  for (const { content, metadata } of texts) {
    const chunks = await splitText(content);
    // メタデータを各チャンクに追加
    chunks.forEach(chunk => {
      chunk.metadata = { ...chunk.metadata, ...metadata };
    });
    documents.push(...chunks);
  }

  return createVectorStore(documents, apiKey);
}
