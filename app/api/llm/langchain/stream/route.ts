/**
 * LangChain版 ストリーミング API Route
 *
 * POST /api/llm/langchain/stream
 * /api/llm/stream への単純なリエクスポート（完全重複の解消）
 */

export { POST } from '../../stream/route';
export type { StreamRequest as LangChainStreamRequest } from '../../stream/route';
