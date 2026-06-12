import type { ScriptLine } from './script.types';
import type { ChatThread, SceneCutPayload, StoryScene } from './story-scene.types';

export type AudienceType = 'male' | 'female';

export type StoryLength = 'short' | 'medium' | 'long';

export type ThemeId =
  | 'business-war'
  | 'rich-family'
  | 'urban-romance'
  | 'ancient-rebirth'
  | 'urban-system'
  | 'master-descends'
  | 'urban-martial'
  | 'suspense-brain'
  | 'rebirth-revenge'
  | 'apocalypse'
  | 'palace-intrigue'
  | 'ancient-romance'
  | 'youth-sweet'
  | 'ceo-romance'
  | 'custom';

export interface CustomThemeInput {
  /** 用户自定义故事设定全文，注入 Story Bible 与 AI 提示词 */
  description: string;
}

export interface StoryConfig {
  themeId: ThemeId;
  audience: AudienceType;
  length: StoryLength;
  protagonistName: string;
  customTheme?: CustomThemeInput;
}

export type SceneMood = 'tension' | 'romance' | 'triumph' | 'sorrow' | 'neutral';

/** 剧本概览 */
export interface StoryBackground {
  title: string;
  /** 前情提要（一两句话） */
  prologue: string;
  /** 已登记人物（GUIDE CAST 累积，渐进揭露） */
  characters: string;
  /** 当前场景（来自 SCENE 行） */
  sceneNow: string;
  atmosphere: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  tone?: string;
}

export interface SceneStreamState {
  turnIndex: number;
  threadId: string;
  scriptLines: ScriptLine[];
  liveTail?: string;
  lockedScript?: string;
  background?: StoryBackground;
  mood?: SceneMood;
  sceneCut?: SceneCutPayload;
  isStreaming: boolean;
  streamRevision: number;
}

export interface PlayerAction {
  raw: string;
  /** 用户输入的台词（默认全文，不含 #() 行为段） */
  dialogue: string;
  /** #(...) / #（...） 行为指令 */
  behaviors: string[];
}

export interface StoryActionRecord {
  turnIndex: number;
  action: PlayerAction;
}

export interface StoryState {
  config: StoryConfig;
  turnIndex: number;
  background: StoryBackground;
  scenes: StoryScene[];
  threads: Record<string, ChatThread>;
  activeThreadId: string;
  actionHistory: StoryActionRecord[];
}

export interface GeneratedTurnPayload {
  scriptLines: ScriptLine[];
  scriptRaw: string;
  background?: StoryBackground;
  mood: SceneMood;
  isComplete: boolean;
  sceneCut?: SceneCutPayload;
  sceneHeadRaw?: string;
}

export type SceneStreamUpdate =
  | {
      kind: 'chunk';
      revision: number;
      fields: Partial<
        Pick<
          SceneStreamState,
          | 'scriptLines'
          | 'liveTail'
          | 'lockedScript'
          | 'background'
          | 'mood'
          | 'sceneCut'
        >
      >;
    }
  | { kind: 'turn_complete'; payload: GeneratedTurnPayload; isOpening: boolean };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
