import {
  AGNES_API_ENDPOINT,
  AGNES_MODEL,
} from '../constants/game.const';
import type { ChatMessage } from '../types/story.types';

export interface AgnesChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  enableThinking?: boolean;
}

export interface AgnesChatResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

function getApiKey(): string {
  return import.meta.env.VITE_AGNES_API_KEY?.trim() ?? '';
}

export function isAgnesConfigured(): boolean {
  return getApiKey().length > 0;
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
  options: AgnesChatOptions,
): Promise<AgnesChatResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('AGNES_API_KEY_NOT_CONFIGURED');
  }

  const body: Record<string, unknown> = {
    model: AGNES_MODEL,
    messages: options.messages,
    temperature: options.temperature ?? 0.85,
    max_tokens: options.maxTokens ?? 2048,
    stream: false,
  };

  if (options.enableThinking) {
    body.chat_template_kwargs = { enable_thinking: true };
  }

  const response = await fetch(AGNES_API_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Agnes API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  return {
    content,
    usage: data.usage,
  };
}

export async function* chatCompletionStream(
  options: AgnesChatOptions,
): AsyncGenerator<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('AGNES_API_KEY_NOT_CONFIGURED');
  }

  const response = await fetch(AGNES_API_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AGNES_MODEL,
      messages: options.messages,
      // temperature: options.temperature ?? 0.85,
      temperature: 1,
      // max_tokens: options.maxTokens ?? 2048,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Agnes API stream error ${response.status}`);
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
