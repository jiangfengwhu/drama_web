import type { ScriptLine } from '../types/script.types';
import type { ChatThread, StoryScene } from '../types/story-scene.types';

/** UI 场景头部：仅 slugline */
export interface SceneHeaderContent {
  slugline: string;
}

export function resolveSceneHeaderContent(
  scene: StoryScene | undefined,
  thread: ChatThread | undefined,
): SceneHeaderContent | null {
  if (!scene) return null;

  const slugline = scene.slugline.trim() || thread?.title?.trim() || '';
  if (!slugline) return null;

  return { slugline };
}

/** 从对白中收集已登场 NPC（渐进式 cast） */
export function collectSpeakersFromLines(
  lines: ScriptLine[],
  protagonistName: string,
): string[] {
  const hero = protagonistName.trim();
  const seen = new Set<string>();

  for (const line of lines) {
    if (line.kind !== 'msg' || !line.sender?.trim()) continue;
    const sender = line.sender.trim();
    if (sender === '你' || sender === hero) continue;
    seen.add(sender);
  }

  return [...seen];
}
