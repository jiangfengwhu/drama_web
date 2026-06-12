import type { ThemeId } from '../../types/story.types';

/** 单题材故事指导脚本（Show Bible / Series Bible 精简版，供 AI 系统提示词注入） */
export interface StoryBible {
  id: ThemeId;
  version: string;
  meta: StoryBibleMeta;
  presentation: StoryBiblePresentation;
  logline: string;
  pitch: string;
  coreThemes: string[];
  toneAndStyle: StoryBibleTone;
  storyWorld: StoryBibleWorld;
  protagonist: StoryBibleProtagonist;
  antagonistForces: StoryBibleAntagonist[];
  coreConflicts: string[];
  informationGap: string;
  hookMechanics: StoryBibleHooks;
  storyArc: StoryBibleArc;
  beatRoadmap: StoryBibleBeat[];
  dialogueCraft: StoryBibleDialogue;
}

export interface StoryBibleMeta {
  title: string;
  subtitle: string;
  genre: string[];
  audience: 'male' | 'female' | 'all';
  /** 2025-2026 短剧/网文爆款标签，便于 AI 对齐市场节奏 */
  trendTags: string[];
  referenceWorks: string[];
}

/** /create 选题卡片与 Play 页展示（与 AI 蓝图同文件维护） */
export interface StoryBiblePresentation {
  /** 卡片一句话介绍 */
  description: string;
  gradient: string;
  imageUrl: string;
  maleHook: string;
  femaleHook: string;
  fanqieTag?: string;
  /** /create 列表排序，越小越靠前 */
  sortOrder: number;
}

export interface StoryBibleTone {
  narrativeVoice: string;
  pacing: string;
  emotionalRegister: string;
}

export interface StoryBibleWorld {
  era: string;
  setting: string;
  socialRules: string[];
  keyLocations: string[];
}

export interface StoryBibleProtagonist {
  archetype: string;
  fatalFlaw: string;
  desire: string;
  stakes: string;
  arc: string;
}

export interface StoryBibleAntagonist {
  label: string;
  motivation: string;
  tactics: string;
}

export interface StoryBibleHooks {
  openingMustEstablish: string[];
  perTurnPayoff: string[];
  climaxSignals: string[];
  endingCriteria: string[];
}

export interface StoryBibleArc {
  act1: string;
  act2: string;
  act3: string;
  finale: string;
}

export interface StoryBibleBeat {
  stage: string;
  dramaticGoal: string;
  sceneExamples: string[];
}

export interface StoryBibleDialogue {
  voiceNotes: string;
  taboo: string;
}

export interface StoryBibleRegistry {
  version: string;
  updatedAt: string;
  themes: Partial<Record<ThemeId, StoryBible>>;
}
