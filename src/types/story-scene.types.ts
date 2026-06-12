import type { ScriptLine } from './script.types';
import type { SceneMood } from './story.types';

/** 电影场景 heading：INT/EXT + 地点 + 时间 */
export type IntExt = 'INT' | 'EXT';

export type SceneTimeLabel =
  | 'DAY'
  | 'NIGHT'
  | 'DAWN'
  | 'DUSK'
  | 'LATER'
  | 'CONTINUOUS'
  | 'SAME';

export interface ScenePlacement {
  intExt: IntExt;
  location: string;
  subLocation?: string;
  time: SceneTimeLabel | string;
}

export type StorySceneStatus = 'active' | 'closed';

export type ChatThreadKind = 'scene' | 'private';

export type ChatThreadStatus = 'active' | 'readonly';

/** 电影式场景单元 — 对应一次转场 */
export interface StoryScene {
  id: string;
  order: number;
  slugline: string;
  placement: ScenePlacement;
  /** 环境氛围一句，供 UI 与 SCENE: 行对齐 */
  sceneIntro: string;
  /** 运行时从对白累积的已登场 NPC（非 AI 预填） */
  presentCast: string[];
  atmosphere?: string;
  status: StorySceneStatus;
  groupThreadId: string;
}

export interface ChatThread {
  id: string;
  kind: ChatThreadKind;
  sceneId?: string;
  title: string;
  subtitle?: string;
  participantNames: string[];
  status: ChatThreadStatus;
  scriptLines: ScriptLine[];
  mood: SceneMood;
  lastActiveAt: number;
}

export interface SceneCutPayload {
  slugline: string;
  placement: ScenePlacement;
  sceneIntro: string;
  closePrevious: boolean;
}

export interface SceneHeadDraft {
  slugline: string;
  placement: ScenePlacement;
  sceneIntro: string;
  atmosphere?: string;
}
