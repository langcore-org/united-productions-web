import { addMessage, addGeneratedFile, createSession, getSession } from '@/lib/db';
import { getModeById } from '@/lib/modes';
import { randomUUID } from 'crypto';

// Configuration
const WRAPPER_URL = process.env.CLIPROXY_URL || 'http://localhost:8000/v1';
const API_KEY = process.env.CLIPROXY_API_KEY || 'not-needed';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'claude-haiku-4-5-20251001';
const ENABLE_TOOLS = process.env.ENABLE_TOOLS === 'true';

export async function POST(req: Request) {
  const { messages, sessionId, mode, systemPrompt, showThinking, model } = await req.json();

  // Ensure session exists
  let sessionData = getSession(sessionId);
  if (!sessionData) {
    // Create session with mode and system prompt
    createSession(sessionId, undefined, mode, systemPrompt);
    sessionData = getSession(sessionId);
  }

  // Get system prompt from session or request
  let finalSystemPrompt = sessionData?.session.system_prompt || systemPrompt;

  // If mode is provided but no system prompt, get from mode definition
  if (!finalSystemPrompt && mode) {
    const modeConfig = getModeById(mode);
    if (modeConfig) {
      finalSystemPrompt = modeConfig.systemPrompt;
    }
  }

  // Build messages array with system prompt
  let finalMessages = [...messages];
  if (finalSystemPrompt && !messages.some((m: { role: string }) => m.role === 'system')) {
    finalMessages = [
      { role: 'system', content: finalSystemPrompt },
      ...messages,
    ];
  }

  // Save user message
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role === 'user') {
    addMessage(randomUUID(), sessionId, 'user', lastMessage.content);
  }

  // Build request body for Claude Code OpenAI Wrapper
  // enable_tools: true enables Claude Code features (WebSearch, Read, Write, Bash, etc.)
  const requestBody = {
    model: model || DEFAULT_MODEL,
    messages: finalMessages,
    stream: true,
    session_id: sessionId, // Enable session continuity
    ...(ENABLE_TOOLS && { enable_tools: true }), // Enable Claude Code tools
    show_thinking: showThinking || false, // Show/hide agent thinking process
  };

  // Call Claude Code OpenAI Wrapper directly
  const response = await fetch(`${WRAPPER_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    return new Response(JSON.stringify({ error }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create a TransformStream to convert SSE to Data Stream format for Vercel AI SDK
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullContent = '';

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            // Save assistant response on completion
            if (fullContent) {
              addMessage(randomUUID(), sessionId, 'assistant', fullContent);
            }
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // Handle custom todo_update events from wrapper
            if (parsed.type === 'todo_update' && parsed.todos) {
              // Send as data chunk (2: prefix) for Vercel AI SDK
              const todoData = JSON.stringify([{ type: 'todo_update', todos: parsed.todos }]);
              controller.enqueue(encoder.encode(`2:${todoData}\n`));
              continue;
            }

            // Handle file_created events from wrapper
            if (parsed.type === 'file_created' && parsed.path) {
              // Save to database
              addGeneratedFile(sessionId, parsed.path);
              // Send as data chunk (2: prefix) for Vercel AI SDK
              const fileData = JSON.stringify([{ type: 'file_created', path: parsed.path }]);
              controller.enqueue(encoder.encode(`2:${fileData}\n`));
              continue;
            }

            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              // Convert to Vercel AI SDK data stream format
              controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    },
  });

  // Pipe the response through our transform
  const stream = response.body?.pipeThrough(transformStream);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    },
  });
}
