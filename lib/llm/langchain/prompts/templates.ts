/**
 * LangChain Prompt Templates
 * 
 * 再利用可能なプロンプトテンプレート定義
 */

import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';

/**
 * 基本チャットプロンプト
 */
export const basicChatPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'You are a helpful assistant. Answer the user\'s questions to the best of your ability.'
  ),
  HumanMessagePromptTemplate.fromTemplate('{input}'),
]);

/**
 * 構造化出力用プロンプト
 */
export const structuredOutputPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `You are a helpful assistant. Provide your response in the requested format.
    
{format_instructions}`
  ),
  HumanMessagePromptTemplate.fromTemplate('{input}'),
]);

/**
 * 会議録要約用プロンプト
 */
export const meetingSummaryPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `You are an expert meeting assistant. Summarize the following meeting transcript.
    
Guidelines:
- Extract key decisions made
- List action items with owners
- Highlight important discussion points
- Keep the summary concise but comprehensive`
  ),
  HumanMessagePromptTemplate.fromTemplate('Meeting Transcript:\n\n{transcript}'),
]);

/**
 * 議事録生成用プロンプト
 */
export const minutesGenerationPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `You are a professional minute-taker. Create formal meeting minutes from the transcript.
    
Format:
1. Meeting Information (Date, Attendees, Purpose)
2. Agenda Items
3. Discussion Summary
4. Decisions Made
5. Action Items (with assignees and deadlines)
6. Next Steps`
  ),
  HumanMessagePromptTemplate.fromTemplate('Meeting Transcript:\n\n{transcript}'),
]);

/**
 * 研究支援用プロンプト
 */
export const researchAssistantPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `You are a research assistant helping with investigative journalism.
    
Guidelines:
- Provide factual, well-sourced information
- Highlight any uncertainties or conflicting information
- Suggest angles for further investigation
- Cite sources when possible`
  ),
  HumanMessagePromptTemplate.fromTemplate('Research Topic: {topic}\n\nContext: {context}'),
]);

/**
 * カスタムプロンプト作成ヘルパー
 */
export function createCustomPrompt(
  systemMessage: string,
  humanMessageTemplate: string = '{input}'
): ChatPromptTemplate {
  return ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(systemMessage),
    HumanMessagePromptTemplate.fromTemplate(humanMessageTemplate),
  ]);
}

/**
 * Few-shotプロンプト作成ヘルパー
 */
export function createFewShotPrompt(
  systemMessage: string,
  examples: Array<{ input: string; output: string }>,
  suffix: string = '{input}'
): ChatPromptTemplate {
  const exampleMessages = examples.flatMap(ex => [
    HumanMessagePromptTemplate.fromTemplate(ex.input),
    SystemMessagePromptTemplate.fromTemplate(ex.output),
  ]);

  return ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(systemMessage),
    ...exampleMessages,
    HumanMessagePromptTemplate.fromTemplate(suffix),
  ]);
}
