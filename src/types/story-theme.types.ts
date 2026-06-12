import type { StoryConfig, ThemeId } from './story.types';

export type ThemeAudienceTag = 'male' | 'female' | 'all';

/** /create 卡片与 Play 页展示用的题材元信息（由 Story Bible 派生） */
export interface ThemeMeta {
  id: ThemeId;
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
  imageUrl: string;
  maleHook: string;
  femaleHook: string;
  audienceTag: ThemeAudienceTag;
  fanqieTag?: string;
}

export type ThemeResolver = (config: StoryConfig) => ThemeMeta;
