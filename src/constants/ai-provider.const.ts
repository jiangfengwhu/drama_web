export type AiProvider = 'agnes' | 'openai';

export const AI_PROVIDER_VALUES: readonly AiProvider[] = ['agnes', 'openai'] as const;

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  agnes: 'Agnes 流式',
  openai: 'GPT 流式',
};

export const AI_PROVIDER_MODE_LABELS: Record<AiProvider, string> = {
  agnes: '流式剧本 · Agnes',
  openai: '流式剧本 · GPT',
};

const DEFAULT_AI_PROVIDER: AiProvider = 'openai';

export function normalizeAiProvider(value: string | undefined): AiProvider {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'agnes') return 'agnes';
  if (normalized === 'openai' || normalized === 'gpt') return 'openai';
  return DEFAULT_AI_PROVIDER;
}

export function getActiveAiProvider(): AiProvider {
  return normalizeAiProvider(import.meta.env.VITE_AI_PROVIDER);
}
