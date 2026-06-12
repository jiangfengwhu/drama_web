import { OPENAI_MODEL } from '../constants/game.const';
import type { ChatMessage } from '../types/story.types';

export interface OpenAiChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface OpenAiChatResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const OPENAI_PROXY_BASE = '/api/openai';

function getApiKey(): string {
  return import.meta.env.VITE_OPENAI_API_KEY?.trim() ?? '';
}

function getApiEndpoint(): string {
  const base = (import.meta.env.VITE_OPENAI_API_BASE?.trim() || OPENAI_PROXY_BASE).replace(
    /\/$/,
    '',
  );
  return `${base}/v1/chat/completions`;
}

function getModel(): string {
  return import.meta.env.VITE_OPENAI_MODEL?.trim() || OPENAI_MODEL;
}

export function isOpenAiConfigured(): boolean {
  return getApiKey().length > 0;
}

const DEFAULT_CHAT_TEMPERATURE = 1;

function buildChatRequestBody(
  options: OpenAiChatOptions,
  stream: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: getModel(),
    messages: options.messages,
    temperature: options.temperature ?? DEFAULT_CHAT_TEMPERATURE,
    stream,
  };

  if (options.maxTokens !== undefined) {
    body.max_tokens = options.maxTokens;
  }

  return body;
}

function drainSseLines(buffer: string): { tokens: string[]; remainder: string } {
  const lines = buffer.split('\n');
  const remainder = lines.pop() ?? '';
  const tokens: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data: ')) continue;
    const payload = trimmed.slice(6);
    if (payload === '[DONE]') continue;

    try {
      const parsed = JSON.parse(payload);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) tokens.push(delta);
    } catch {
      // skip malformed chunks
    }
  }

  return { tokens, remainder };
}

export async function chatCompletion(
  options: OpenAiChatOptions,
): Promise<OpenAiChatResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
  }

  const response = await fetch(getApiEndpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildChatRequestBody(options, false)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  return {
    content,
    usage: data.usage,
  };
}

export async function* chatCompletionStream(
  options: OpenAiChatOptions,
): AsyncGenerator<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
  }

  const response = await fetch(getApiEndpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildChatRequestBody(options, true)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API stream error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let sseBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const drained = drainSseLines(sseBuffer);
    sseBuffer = drained.remainder;

    for (const token of drained.tokens) {
      yield token;
    }
  }

  if (sseBuffer.trim()) {
    const drained = drainSseLines(`${sseBuffer}\n`);
    for (const token of drained.tokens) {
      yield token;
    }
  }
}
