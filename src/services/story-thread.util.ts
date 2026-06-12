import type { ScriptLine } from '../types/script.types';
import type {
  ChatThread,
  ChatThreadKind,
  SceneCutPayload,
  SceneHeadDraft,
  ScenePrivateChatContext,
  StoryScene,
} from '../types/story-scene.types';
import type { SceneMood, StoryConfig, StoryState } from '../types/story.types';
import { collectSpeakersFromLines } from './scene-header.util';
import { parseSlugline, sceneThreadTitle } from './scene-meta.util';

let threadSeq = 0;

function nextThreadId(prefix: string): string {
  threadSeq += 1;
  return `${prefix}-${threadSeq}`;
}

function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, '');
}

export function createEmptyThread(
  kind: ChatThreadKind,
  title: string,
  participantNames: string[],
  opts?: { sceneId?: string; subtitle?: string },
): ChatThread {
  return {
    id: nextThreadId(kind === 'scene' ? 'thread-scene' : 'thread-private'),
    kind,
    sceneId: opts?.sceneId,
    title,
    subtitle: opts?.subtitle,
    participantNames,
    status: 'active',
    scriptLines: [],
    mood: 'neutral',
    lastActiveAt: Date.now(),
  };
}

export function createSceneFromHead(
  draft: SceneHeadDraft,
  order: number,
): { scene: StoryScene; thread: ChatThread } {
  const thread = createEmptyThread('scene', sceneThreadTitle(draft), [], {
    subtitle: draft.slugline,
  });

  const scene: StoryScene = {
    id: nextThreadId('scene'),
    order,
    slugline: draft.slugline,
    placement: draft.placement,
    sceneIntro: draft.sceneIntro,
    presentCast: [],
    atmosphere: draft.atmosphere,
    status: 'active',
    groupThreadId: thread.id,
  };

  thread.sceneId = scene.id;
  return { scene, thread };
}

export function getThread(
  state: StoryState,
  threadId: string,
): ChatThread | undefined {
  return state.threads[threadId];
}

export function getActiveThread(state: StoryState): ChatThread | undefined {
  return getThread(state, state.activeThreadId);
}

export function getThreadLines(state: StoryState, threadId: string): ScriptLine[] {
  return getThread(state, threadId)?.scriptLines ?? [];
}

export function isThreadWritable(thread: ChatThread): boolean {
  return thread.status === 'active';
}

export function listConversationThreads(state: StoryState): ChatThread[] {
  return Object.values(state.threads).sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'scene' ? -1 : 1;
    return b.lastActiveAt - a.lastActiveAt;
  });
}

export function listSceneThreads(state: StoryState): ChatThread[] {
  return state.scenes
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((scene) => state.threads[scene.groupThreadId])
    .filter((thread): thread is ChatThread => Boolean(thread));
}

export function listPrivateThreads(state: StoryState): ChatThread[] {
  return Object.values(state.threads)
    .filter((thread) => thread.kind === 'private')
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

export function getSceneForThread(
  state: StoryState,
  thread: ChatThread,
): StoryScene | undefined {
  if (!thread.sceneId) return undefined;
  return state.scenes.find((scene) => scene.id === thread.sceneId);
}

export function switchActiveThread(
  state: StoryState,
  threadId: string,
): StoryState {
  if (!state.threads[threadId]) return state;
  return { ...state, activeThreadId: threadId };
}

export function getActiveScene(state: StoryState): StoryScene | undefined {
  const activeThread = getActiveThread(state);
  if (activeThread?.sceneId) {
    const linked = state.scenes.find((scene) => scene.id === activeThread.sceneId);
    if (linked) return linked;
  }
  return state.scenes.find((scene) => scene.status === 'active');
}

export function getSceneGroupThreadLines(
  state: StoryState,
  scene: StoryScene,
): ScriptLine[] {
  return state.threads[scene.groupThreadId]?.scriptLines ?? [];
}

export function ensurePrivateThread(
  state: StoryState,
  npcName: string,
  protagonistName: string,
): StoryState {
  const key = sanitizeName(npcName);
  const activeScene = getActiveScene(state);
  const sceneId = activeScene?.id;

  const existing = Object.values(state.threads).find(
    (thread) =>
      thread.kind === 'private' &&
      thread.sceneId === sceneId &&
      thread.participantNames.some((name) => sanitizeName(name) === key),
  );
  if (existing) {
    return switchActiveThread(state, existing.id);
  }

  const thread = createEmptyThread(
    'private',
    npcName.trim(),
    [protagonistName.trim(), npcName.trim()],
    {
      sceneId,
      subtitle: activeScene?.slugline,
    },
  );
  return {
    ...state,
    threads: { ...state.threads, [thread.id]: thread },
    activeThreadId: thread.id,
  };
}

export function appendThreadLines(
  state: StoryState,
  threadId: string,
  lines: ScriptLine[],
): StoryState {
  const thread = state.threads[threadId];
  if (!thread || lines.length === 0) return state;

  const updated: ChatThread = {
    ...thread,
    scriptLines: [...thread.scriptLines, ...lines],
    lastActiveAt: Date.now(),
  };

  let next: StoryState = {
    ...state,
    threads: { ...state.threads, [threadId]: updated },
  };

  if (thread.kind === 'scene' && thread.sceneId) {
    const speakers = collectSpeakersFromLines(
      updated.scriptLines,
      state.config.protagonistName,
    );
    next = {
      ...next,
      scenes: next.scenes.map((scene) =>
        scene.id === thread.sceneId
          ? { ...scene, presentCast: speakers }
          : scene,
      ),
      threads: {
        ...next.threads,
        [threadId]: { ...updated, participantNames: speakers },
      },
    };
  }

  return next;
}

export function updateThreadTurnMeta(
  state: StoryState,
  threadId: string,
  meta: { mood?: SceneMood },
): StoryState {
  const thread = state.threads[threadId];
  if (!thread) return state;

  const updated: ChatThread = {
    ...thread,
    mood: meta.mood ?? thread.mood,
    lastActiveAt: Date.now(),
  };

  return { ...state, threads: { ...state.threads, [threadId]: updated } };
}

function closeScene(state: StoryState, sceneId: string): StoryState {
  const scenes = state.scenes.map((scene) =>
    scene.id === sceneId ? { ...scene, status: 'closed' as const } : scene,
  );

  const scene = state.scenes.find((item) => item.id === sceneId);
  if (!scene) return { ...state, scenes };

  const groupThread = state.threads[scene.groupThreadId];
  const threads = groupThread
    ? {
        ...state.threads,
        [groupThread.id]: {
          ...groupThread,
          status: 'readonly' as const,
        },
      }
    : state.threads;

  return { ...state, scenes, threads };
}

export function patchSceneIntro(
  state: StoryState,
  sceneId: string,
  sceneText: string,
): StoryState {
  const intro = sceneText.trim();
  if (!intro) return state;

  return {
    ...state,
    scenes: state.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, sceneIntro: intro } : scene,
    ),
  };
}

export function splitScriptLinesAtSceneCut(lines: ScriptLine[]): {
  closingLines: ScriptLine[];
  openingLines: ScriptLine[];
} {
  const sceneIdx = lines.findIndex((line) => line.kind === 'scene');
  if (sceneIdx < 0) {
    return { closingLines: lines, openingLines: [] };
  }
  return {
    closingLines: lines.slice(0, sceneIdx),
    openingLines: lines.slice(sceneIdx),
  };
}

export function getPendingSceneThread(state: StoryState): ChatThread | undefined {
  const active = getActiveThread(state);
  if (!active?.sceneId || active.kind !== 'scene' || active.status !== 'readonly') {
    return undefined;
  }

  const currentScene = state.scenes.find((scene) => scene.id === active.sceneId);
  if (!currentScene) return undefined;

  const nextScene = state.scenes.find(
    (scene) => scene.order === currentScene.order + 1,
  );
  if (!nextScene) return undefined;

  return state.threads[nextScene.groupThreadId];
}

export function applySceneCut(
  state: StoryState,
  cut: SceneCutPayload,
): { state: StoryState; newThreadId: string; newSceneId: string } {
  let next = state;

  const activeScene = state.scenes.find((scene) => scene.status === 'active');
  if (cut.closePrevious && activeScene) {
    next = closeScene(next, activeScene.id);
  }

  const draft: SceneHeadDraft = {
    slugline: cut.slugline,
    placement: cut.placement,
    sceneIntro: cut.sceneIntro,
  };

  const { scene, thread } = createSceneFromHead(draft, next.scenes.length);
  return {
    state: {
      ...next,
      scenes: [...next.scenes, scene],
      threads: { ...next.threads, [thread.id]: thread },
    },
    newThreadId: thread.id,
    newSceneId: scene.id,
  };
}

export function bootstrapOpeningScene(
  state: StoryState,
  draft: SceneHeadDraft,
  openingLines: ScriptLine[],
): StoryState {
  const shellThread = getActiveThread(state);
  const { scene, thread } = createSceneFromHead(draft, 0);
  const threadId = shellThread?.id ?? thread.id;

  const speakers = collectSpeakersFromLines(
    openingLines,
    state.config.protagonistName,
  );
  const seededThread: ChatThread = {
    ...thread,
    id: threadId,
    scriptLines: openingLines,
    participantNames: speakers,
    lastActiveAt: Date.now(),
  };
  const seededScene: StoryScene = {
    ...scene,
    groupThreadId: threadId,
    presentCast: speakers,
  };

  return {
    ...state,
    scenes: [seededScene],
    threads: { [seededThread.id]: seededThread },
    activeThreadId: threadId,
  };
}

export function createInitialThreadShell(_config: StoryConfig): StoryState['threads'] {
  const thread = createEmptyThread('scene', '开场', [], {
    subtitle: '场景加载中…',
  });
  return { [thread.id]: thread };
}

export function inferSceneHeadFromLines(
  sceneText: string | undefined,
): SceneHeadDraft {
  return {
    slugline: 'INT. 未知地点 - DAY',
    placement: parseSlugline('INT. 未知地点 - DAY'),
    sceneIntro: sceneText?.trim() || '',
  };
}

export function patchActiveSceneIntro(
  state: StoryState,
  sceneText: string,
): StoryState {
  const intro = sceneText.trim();
  if (!intro) return state;

  const active = getActiveScene(state);
  if (!active) return state;

  return {
    ...state,
    scenes: state.scenes.map((scene) =>
      scene.id === active.id ? { ...scene, sceneIntro: intro } : scene,
    ),
  };
}

export function listPrivateThreadsForScene(
  state: StoryState,
  sceneId: string,
): ChatThread[] {
  return Object.values(state.threads)
    .filter(
      (thread) =>
        thread.kind === 'private' &&
        thread.sceneId === sceneId &&
        thread.scriptLines.length > 0,
    )
    .sort((a, b) => a.lastActiveAt - b.lastActiveAt);
}

export function collectScenePrivateChatContexts(
  state: StoryState,
  scene: StoryScene,
  protagonistName: string,
): ScenePrivateChatContext[] {
  const hero = protagonistName.trim();

  return listPrivateThreadsForScene(state, scene.id).map((thread) => {
    const npcName =
      thread.participantNames
        .find((name) => name.trim() !== hero && name.trim() !== '你')
        ?.trim() || thread.title.trim();

    return { npcName, lines: thread.scriptLines };
  });
}

export function getActiveMood(state: StoryState): SceneMood {
  return getActiveThread(state)?.mood ?? 'neutral';
}
