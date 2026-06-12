import { STORY_PACE } from '../constants/game.const';
import { resolveTheme } from '../constants/themes';
import { getMockNpcTurn, getMockOpening } from '../mock/story.mock';
import { applyGuideStreamPatch } from './guide-text.util';
import {
  extractSceneText,
  ensureSceneLine,
  parseScriptStream,
  prepareDisplayScriptLines,
  stripLeadingProtagonistEcho,
} from './script-text.util';
import {
  buildNpcSystemPrompt,
  buildOpeningUserPrompt,
  buildTurnUserPrompt,
  type TurnPromptContext,
} from './prompt-messages.util';
import type {
  AudienceType,
  GeneratedTurnPayload,
  SceneStreamState,
  SceneStreamUpdate,
  StoryBackground,
  StoryConfig,
  StoryState,
} from '../types/story.types';
import type { ScriptLine } from '../types/script.types';
import { parseSceneHeadGuide } from './scene-meta.util';
import {
  appendThreadLines,
  applySceneCut,
  bootstrapOpeningScene,
  collectScenePrivateChatContexts,
  createInitialThreadShell,
  getActiveThread,
  getSceneForThread,
  getSceneGroupThreadLines,
  getThreadLines,
  inferSceneHeadFromLines,
  patchActiveSceneIntro,
  patchSceneIntro,
  splitScriptLinesAtSceneCut,
  updateThreadTurnMeta,
} from './story-thread.util';
import type { ChatThread, SceneHeadDraft, ScenePrivateChatContext, StoryScene } from '../types/story-scene.types';
import {
  toPlayerAction,
  buildUserScriptLine,
} from './user-input.util';
import type { UserTurnInput } from '../types/user-input.types';
import {
  chatCompletionStream,
  isAiConfigured,
} from './ai-chat.service';

function minTurnsFor(config: StoryConfig): number {
  return STORY_PACE[config.length].minTurns;
}

function resolveIsComplete(
  config: StoryConfig,
  userTurnCount: number,
  aiSaysComplete: boolean,
): boolean {
  return userTurnCount >= minTurnsFor(config) && aiSaysComplete;
}

function emitScriptChunk(
  buffer: string,
  revision: number,
  onUpdate: (u: SceneStreamUpdate) => void,
  storyBackground: StoryBackground | undefined,
  protagonistName: string,
): void {
  const { lines, guide, turnMeta, tail } = parseScriptStream(buffer);
  const sceneFallback = lines.find((l) => l.kind === 'scene')?.text;
  const displayLines = prepareDisplayScriptLines(
    ensureSceneLine(lines, sceneFallback),
    { stripProtagonist: false, protagonistName },
  );
  const fields: Extract<SceneStreamUpdate, { kind: 'chunk' }>['fields'] = {
    scriptLines: displayLines,
    liveTail: tail,
  };

  if (turnMeta.mood) fields.mood = turnMeta.mood;
  if (turnMeta.sceneCut) fields.sceneCut = turnMeta.sceneCut;

  if (storyBackground) {
    fields.background = applyGuideStreamPatch(
      guide,
      storyBackground,
      extractSceneText(displayLines),
      protagonistName,
    );
  }

  onUpdate({ kind: 'chunk', revision, fields });
}

function buildPayloadFromRaw(
  config: StoryConfig,
  scriptRaw: string,
  isOpening: boolean,
  storyBackground: StoryBackground | undefined,
  userTurnCount: number,
): GeneratedTurnPayload {
  const { lines, guide, turnMeta } = parseScriptStream(`${scriptRaw}\n`);
  const sceneText = extractSceneText(lines);
  const withScene = ensureSceneLine(lines, sceneText);
  const displayLines = prepareDisplayScriptLines(withScene, {
    stripProtagonist: isOpening,
    protagonistName: config.protagonistName,
  });
  const mood = turnMeta.mood ?? 'neutral';
  const background = storyBackground
    ? applyGuideStreamPatch(
        guide,
        storyBackground,
        sceneText,
        config.protagonistName,
      )
    : undefined;

  return {
    scriptLines: displayLines,
    scriptRaw,
    background,
    mood,
    isComplete: isOpening
      ? false
      : resolveIsComplete(
          config,
          userTurnCount,
          turnMeta.isComplete ?? false,
        ),
    sceneCut: turnMeta.sceneCut,
    sceneHeadRaw: guide.SCENE_HEAD,
  };
}

async function aiGenerateTurn(
  config: StoryConfig,
  isOpening: boolean,
  promptCtx: TurnPromptContext,
  userTurnCount: number,
  userInput: UserTurnInput,
  storyBackground: StoryBackground | undefined,
  thread: ChatThread | undefined,
  onUpdate: (u: SceneStreamUpdate) => void,
): Promise<GeneratedTurnPayload> {
  let storyBuffer = '';
  let revision = 0;

  const userContent = isOpening
    ? buildOpeningUserPrompt(config, storyBackground)
    : buildTurnUserPrompt(
        config,
        promptCtx,
        userInput,
        userTurnCount,
        storyBackground,
        thread,
      );

  for await (const delta of chatCompletionStream({
    messages: [
      {
        role: 'system',
        content: buildNpcSystemPrompt(config, isOpening, thread),
      },
      { role: 'user', content: userContent },
    ],
  })) {
    storyBuffer += delta;
    revision += 1;
    emitScriptChunk(
      storyBuffer,
      revision,
      onUpdate,
      storyBackground,
      config.protagonistName,
    );
  }

  const scriptRaw = storyBuffer.trim();
  if (!scriptRaw) throw new Error('Empty script from AI');

  const { lines, guide, turnMeta } = parseScriptStream(`${scriptRaw}\n`);

  revision += 1;
  const sceneText = extractSceneText(lines);
  const withScene = ensureSceneLine(lines, sceneText);
  onUpdate({
    kind: 'chunk',
    revision,
    fields: {
      lockedScript: scriptRaw,
      scriptLines: withScene,
      liveTail: '',
      mood: turnMeta.mood,
      background: storyBackground
        ? applyGuideStreamPatch(
            guide,
            storyBackground,
            extractSceneText(withScene),
            config.protagonistName,
          )
        : undefined,
    },
  });

  return buildPayloadFromRaw(
    config,
    scriptRaw,
    isOpening,
    storyBackground,
    userTurnCount,
  );
}

async function mockGenerateTurn(
  config: StoryConfig,
  isOpening: boolean,
  _existingLines: GeneratedTurnPayload['scriptLines'],
  userTurnCount: number,
  userInput: UserTurnInput,
  storyBackground: StoryBackground | undefined,
  onUpdate: (u: SceneStreamUpdate) => void,
): Promise<GeneratedTurnPayload> {
  const mock = isOpening
    ? getMockOpening(config)
    : getMockNpcTurn(config, userTurnCount, userInput.raw);

  const scriptRaw = mock.scriptRaw;
  const rawLines = scriptRaw.split('\n');
  let buffer = '';
  let revision = 0;

  for (const line of rawLines) {
    buffer = buffer ? `${buffer}\n${line}` : line;
    revision += 1;
    emitScriptChunk(
      buffer,
      revision,
      onUpdate,
      storyBackground,
      config.protagonistName,
    );
    await new Promise((r) => setTimeout(r, 420));
  }

  revision += 1;
  const { lines, guide, turnMeta } = parseScriptStream(`${scriptRaw}\n`);
  const sceneText = extractSceneText(lines);
  const withScene = ensureSceneLine(lines, sceneText);
  onUpdate({
    kind: 'chunk',
    revision,
    fields: {
      lockedScript: scriptRaw,
      scriptLines: withScene,
      liveTail: '',
      mood: turnMeta.mood ?? mock.mood,
      background: storyBackground
        ? applyGuideStreamPatch(
            guide,
            storyBackground,
            extractSceneText(withScene),
            config.protagonistName,
          )
        : undefined,
    },
  });

  return buildPayloadFromRaw(
    config,
    scriptRaw,
    isOpening,
    storyBackground,
    userTurnCount,
  );
}

async function generateTurnStreaming(
  config: StoryConfig,
  isOpening: boolean,
  promptCtx: TurnPromptContext,
  userTurnCount: number,
  userInput: UserTurnInput,
  openingBase: StoryBackground | undefined,
  thread: ChatThread | undefined,
  onUpdate: (u: SceneStreamUpdate) => void,
): Promise<GeneratedTurnPayload> {
  if (isAiConfigured()) {
    try {
      return await aiGenerateTurn(
        config,
        isOpening,
        promptCtx,
        userTurnCount,
        userInput,
        openingBase,
        thread,
        onUpdate,
      );
    } catch (err) {
      console.warn('[Story Engine] AI failed, fallback mock', err);
    }
  }

  return mockGenerateTurn(
    config,
    isOpening,
    promptCtx.threadLines,
    userTurnCount,
    userInput,
    openingBase,
    onUpdate,
  );
}

export function createStoryState(config: StoryConfig): StoryState {
  const theme = resolveTheme(config);
  const threads = createInitialThreadShell(config);
  const activeThreadId = Object.keys(threads)[0];

  return {
    config,
    turnIndex: 0,
    background: {
      title: '',
      prologue: '',
      characters: '',
      sceneNow: '',
      atmosphere: theme.subtitle,
    },
    scenes: [],
    threads,
    activeThreadId,
    actionHistory: [],
  };
}

export async function generateOpeningStreaming(
  config: StoryConfig,
  openingBase: StoryBackground,
  _activeThreadId: string,
  onUpdate: (u: SceneStreamUpdate) => void,
): Promise<GeneratedTurnPayload> {
  const payload = await generateTurnStreaming(
    config,
    true,
    { threadLines: [] },
    0,
    { raw: '', dialogue: '', behaviors: [] },
    openingBase,
    undefined,
    onUpdate,
  );

  onUpdate({ kind: 'turn_complete', payload, isOpening: true });
  return payload;
}

export async function generateNpcTurnStreaming(
  state: StoryState,
  userInput: UserTurnInput,
  onUpdate: (u: SceneStreamUpdate) => void,
): Promise<GeneratedTurnPayload> {
  const thread = getActiveThread(state);
  const threadLines = getThreadLines(state, state.activeThreadId);

  let scene: StoryScene | undefined;
  let groupLines: ScriptLine[] | undefined;
  let privateChats: ScenePrivateChatContext[] | undefined;

  if (thread?.kind === 'private') {
    scene = thread.sceneId
      ? getSceneForThread(state, thread)
      : undefined;
    if (scene) {
      groupLines = getSceneGroupThreadLines(state, scene);
    }
  } else if (thread?.sceneId) {
    scene = getSceneForThread(state, thread);
    if (scene) {
      privateChats = collectScenePrivateChatContexts(
        state,
        scene,
        state.config.protagonistName,
      );
    }
  }

  const payload = await generateTurnStreaming(
    state.config,
    false,
    { threadLines, groupLines, privateChats, scene },
    state.actionHistory.length,
    userInput,
    state.background,
    thread,
    onUpdate,
  );

  onUpdate({ kind: 'turn_complete', payload, isOpening: false });
  return payload;
}

export function getAudienceLabel(audience: AudienceType): string {
  return audience === 'male' ? '偏硬核 · 布局反击' : '偏情感 · 关系博弈';
}

export function createInitialStreamState(
  turnIndex: number,
  threadId: string,
): SceneStreamState {
  return {
    turnIndex,
    threadId,
    scriptLines: [],
    liveTail: '',
    isStreaming: true,
    streamRevision: 0,
  };
}

export function recordUserAction(
  state: StoryState,
  userInput: UserTurnInput,
): StoryState {
  const action = toPlayerAction(userInput.raw);
  let next: StoryState = {
    ...state,
    turnIndex: state.turnIndex + 1,
    actionHistory: [
      ...state.actionHistory,
      { turnIndex: state.turnIndex, action },
    ],
  };

  const userLine = buildUserScriptLine(userInput, state.config.protagonistName);
  if (userLine) {
    next = appendThreadLines(next, next.activeThreadId, [userLine]);
  }

  return next;
}

export function mergeTurnResult(
  state: StoryState,
  payload: GeneratedTurnPayload,
  isOpening: boolean,
): StoryState {
  let next: StoryState = payload.background
    ? { ...state, background: payload.background }
    : state;

  if (isOpening) {
    const head = payload.sceneHeadRaw
      ? parseSceneHeadGuide(payload.sceneHeadRaw)
      : null;
    const draft =
      head ??
      inferSceneHeadFromLines(extractSceneText(payload.scriptLines));
    const sceneText = extractSceneText(payload.scriptLines);
    const finalized: SceneHeadDraft = {
      ...draft,
      sceneIntro: draft.sceneIntro?.trim() || sceneText || '',
    };
    next = bootstrapOpeningScene(next, finalized, payload.scriptLines);
    return updateThreadTurnMeta(next, next.activeThreadId, {
      mood: payload.mood,
    });
  }

  const threadId = next.activeThreadId;
  const activeBeforeCut = getActiveThread(next);
  const sceneText = extractSceneText(payload.scriptLines);

  const protagonistName = next.config.protagonistName;
  const incomingLines = stripLeadingProtagonistEcho(
    payload.scriptLines,
    protagonistName,
  );

  if (payload.sceneCut && activeBeforeCut?.kind !== 'private') {
    const { closingLines, openingLines } = splitScriptLinesAtSceneCut(
      incomingLines,
    );
    const previousThreadId = next.activeThreadId;
    const cutResult = applySceneCut(next, payload.sceneCut);
    next = cutResult.state;

    if (closingLines.length > 0) {
      next = appendThreadLines(next, previousThreadId, closingLines);
    }
    if (openingLines.length > 0) {
      next = appendThreadLines(next, cutResult.newThreadId, openingLines);
      const openingSceneText = extractSceneText(openingLines);
      if (openingSceneText) {
        next = patchSceneIntro(next, cutResult.newSceneId, openingSceneText);
      }
    }

    next = updateThreadTurnMeta(next, previousThreadId, {
      mood: payload.mood,
    });
    return next;
  }

  next = appendThreadLines(next, threadId, incomingLines);
  if (sceneText && activeBeforeCut?.kind === 'scene') {
    next = patchActiveSceneIntro(next, sceneText);
  }

  return updateThreadTurnMeta(next, next.activeThreadId, {
    mood: payload.mood,
  });
}
