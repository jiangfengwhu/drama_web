import type { ScriptLine } from './script.types';

export type AudienceType = 'male' | 'female';

export type StoryLength = 'short' | 'medium' | 'long';

export type ThemeId =
  | 'business-war'
  | 'rich-family'
  | 'urban-romance'
  | 'ancient-rebirth';

export type SceneMood = 'tension' | 'romance' | 'triumph' | 'sorrow' | 'neutral';

export interface StoryConfig {
  themeId: ThemeId;
  audience: AudienceType;
  length: StoryLength;
  characterCount: number;
  protagonistName: string;
}

/** 群公告：吸顶展示故事背景 */
export interface StoryBackground {
  title: string;
  /** 一句话引子 */
  summary: string;
  /** 当前场景：时间地点、正在发生什么 */
  sceneNow: string;
  /** 人物关系：谁是谁、与主角关系、各自立场 */
  relationships: string;
  /** 前情与冲突背景 */
  detail: string;
  atmosphere: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  tone?: string;
}

export interface SceneStreamState {
  turnIndex: number;
  scriptLines: ScriptLine[];
  liveTail?: string;
  lockedScript?: string;
  background?: StoryBackground;
  mood?: SceneMood;
  isStreaming: boolean;
  streamRevision: number;
}

export interface PlayerAction {
  text: string;
}

export interface StoryActionRecord {
  turnIndex: number;
  action: PlayerAction;
}

export interface StoryState {
  config: StoryConfig;
  turnIndex: number;
  scriptLines: ScriptLine[];
  background: StoryBackground;
  mood: SceneMood;
  actionHistory: StoryActionRecord[];
}

export interface GeneratedTurnPayload {
  scriptLines: ScriptLine[];
  scriptRaw: string;
  background?: StoryBackground;
  mood: SceneMood;
  isComplete: boolean;
}

export type SceneStreamUpdate =
  | {
      kind: 'chunk';
      revision: number;
      fields: Partial<
        Pick<
          SceneStreamState,
          'scriptLines' | 'liveTail' | 'lockedScript' | 'background' | 'mood'
        >
      >;
    }
  | { kind: 'turn_complete'; payload: GeneratedTurnPayload; isOpening: boolean };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
