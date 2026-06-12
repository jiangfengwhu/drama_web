import {
  getActiveAiProvider,
  AI_PROVIDER_LABELS,
  type AiProvider,
} from '../constants/ai-provider.const';
import {
  chatCompletionStream as agnesChatCompletionStream,
  isAgnesConfigured,
} from './agnes-ai.service';
import {
  chatCompletionStream as openAiChatCompletionStream,
  isOpenAiConfigured,
} from './openai-ai.service';
import type { ChatMessage } from '../types/story.types';

export interface AiChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export function resolveAiProvider(): AiProvider {
  return getActiveAiProvider();
}

export function isAiConfigured(): boolean {
  switch (resolveAiProvider()) {
    case 'agnes':
      return isAgnesConfigured();
    case 'openai':
      return isOpenAiConfigured();
    default:
      return false;
  }
}

export function getAiProviderLabel(): string {
  return AI_PROVIDER_LABELS[resolveAiProvider()];
}

export async function* chatCompletionStream(
  options: AiChatOptions,
): AsyncGenerator<string> {
  switch (resolveAiProvider()) {
    case 'agnes':
      yield* agnesChatCompletionStream(options);
      return;
    case 'openai':
      yield* openAiChatCompletionStream(options);
      return;
    default:
      throw new Error('AI_PROVIDER_NOT_CONFIGURED');
  }
}
