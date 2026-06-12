import { STORY_PACE, PRIVATE_SCENE_CONTEXT_LINE_LIMIT } from '../constants/game.const';
import { buildCraftPromptBlock } from '../constants/prompt-craft.const';
import {
  buildPromptFormatBlock,
  buildUserInputTurnBlock,
} from '../constants/prompt-format.const';
import {
  buildCastRevealRulesBlock,
  buildRegisteredCastUserSuffix,
} from '../constants/cast-reveal.const';
import { GUIDE_FIELD, GUIDE_LIMITS, GUIDE_LINE } from '../constants/guide-format.const';
import { META_LINE } from '../constants/scene-text.const';
import { SCRIPT_LIMITS, SCRIPT_LINE } from '../constants/script-format.const';
import { resolveTheme } from '../constants/themes';
import { getMockNpcTurn, getMockOpening } from '../mock/story.mock';
import { applyGuideStreamPatch } from './guide-text.util';
import {
  extractSceneText,
  ensureSceneLine,
  formatRecentDialogueHistory,
  buildTurnContinuityPrompt,
  buildPrivateTurnContinuityPrompt,
  detectConfrontationStagnation,
  parseScriptStream,
  prepareDisplayScriptLines,
} from './script-text.util';
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
import { buildSceneArchitecturePromptBlock } from '../constants/prompt-scene.const';
import { META_CUT_PREFIX } from '../constants/scene-heading.const';
import { parseSceneHeadGuide } from './scene-meta.util';
import {
  appendThreadLines,
  applySceneCut,
  bootstrapOpeningScene,
  createInitialThreadShell,
  getActiveThread,
  getSceneForThread,
  getSceneGroupThreadLines,
  getThreadLines,
  inferSceneHeadFromLines,
  patchActiveSceneIntro,
  updateThreadTurnMeta,
} from './story-thread.util';
import type { ChatThread, SceneHeadDraft, StoryScene } from '../types/story-scene.types';
import {
  toPlayerAction,
} from './user-input.util';
import type { UserTurnInput } from '../types/user-input.types';
import {
  chatCompletionStream,
  isAiConfigured,
} from './ai-chat.service';

function minTurnsFor(config: StoryConfig): number {
  return STORY_PACE[config.length].minTurns;
}

function completeRuleForSystem(config: StoryConfig): string {
  const min = minTurnsFor(config);
  return `5. 完结判定：用户主动选择满 ${min} 次之前，COMPLETE 必须为 no。满 ${min} 次后，仅当主线冲突已解决、情感线有落点、本回合可自然收束时才可 yes；否则 no。禁止首轮或冲突升温期输出 yes。`;
}

function completeRuleForTurn(config: StoryConfig, userTurnCount: number): string {
  const min = minTurnsFor(config);
  if (userTurnCount < min) {
    return `6. COMPLETE: 必须为 no（用户仅选择 ${userTurnCount}/${min} 次，未达篇幅下限，严禁 yes）`;
  }
  return `6. COMPLETE: yes 或 no（已选 ${userTurnCount} 次，仅主线真正闭环且本回合可收束时用 yes）`;
}

function npcSystemPrompt(
  config: StoryConfig,
  isOpening: boolean,
  thread?: ChatThread,
): string {
  const theme = resolveTheme(config);
  const protagonist = config.protagonistName.trim();
  const isPrivate = thread?.kind === 'private';
  const craftBlock = buildCraftPromptBlock(config, isOpening);
  const castBlock = buildCastRevealRulesBlock(protagonist);
  const sceneBlock = buildSceneArchitecturePromptBlock(isPrivate);

  const {
    maxSceneChars,
    maxNarrChars,
    maxMsgChars,
    openingMinMsg,
    openingMaxMsg,
    openingMaxNarr,
    turnMinMsg,
    turnMaxMsg,
    turnMaxNarr,
  } = SCRIPT_LIMITS;

  const msgRange = isOpening
    ? `${openingMinMsg}-${openingMaxMsg}`
    : `${turnMinMsg}-${turnMaxMsg}`;

  const narrRange = isOpening
    ? `0-${openingMaxNarr}`
    : isPrivate
      ? '0'
      : `0-${turnMaxNarr}`;

  const openingGuideBlock = isOpening
    ? `${GUIDE_LINE} ${GUIDE_FIELD.TITLE}|故事名（≤${GUIDE_LIMITS.title}字）
${GUIDE_LINE} ${GUIDE_FIELD.PROLOGUE}|前情提要（≤${GUIDE_LIMITS.prologue}字，仅 1 句：此刻最要命的一件事，禁止背景年表）
${GUIDE_LINE} ${GUIDE_FIELD.SCENE_HEAD}|slugline（INT/EXT. 地点 - 时间，禁止附带氛围）
${SCRIPT_LINE.SCENE} 环境氛围（≤${maxSceneChars}字，一行，让玩家代入）`
    : `${GUIDE_LINE} ${GUIDE_FIELD.CAST}|（仅本回合首次登场的新角色，每人一行，紧挨其首条 MSG 之前）`;

  const protagonistRule = isOpening
    ? `  - 开场仅写 NPC 角色名，禁止出现「你」或「${protagonist}」
  - 开场 MSG 须构成群戏：≥2 名 NPC 开口，且 ≥1 条 NPC 互相对话；每人首次开口前 GUIDE: CAST`
    : isPrivate
      ? `  - 本回合为私聊：仅主角「你」与 ${thread?.participantNames.find((n) => n !== protagonist && n !== '你') ?? '该 NPC'} 可 MSG
  - 先写 1 条 MSG:你|台词，再写 1-3 条 NPC 回复；禁止第三人插话、禁止群戏`
      : `  - 本回合为场景群聊：仅已在对话中出现的 NPC 可 MSG（${thread?.participantNames.join('、') || '渐进登场'}）
  - 先写 1 条 MSG:你|台词，再写 ${turnMinMsg - 1}-${turnMaxMsg - 1} 条 NPC；首条须接「你」；≥1 条 NPC↔NPC
  - 若需换场：${META_CUT_PREFIX}|slugline，并输出 ${SCRIPT_LINE.SCENE} 新环境`;

  const engagementRules = isPrivate
    ? `4. 密谈承接场景：对白须回应群聊里刚发生的事；禁止换场、禁止第三人 MSG。
5. 回合钩子：MOOD 前最后一条须让玩家想继续密谈或回群聊出牌。
6. 仅双人 MSG：禁止 NARR 群戏、禁止 META: CUT；NPC 须给出群聊里听不到的信息。`
    : `4. 反停滞：禁止循环争吵与纯情绪宣泄；僵持 2 轮须 NARR 第三方打断（见推进法则）。
5. 回合钩子：MOOD 前最后一条 MSG 须让玩家想立刻输入下一行动（筹码/危险/秘密露头）。
6. 接戏 + 群戏：NPC 接上一句；至少 1 条 NPC↔NPC（私聊除外）；禁止幻词反问。`;

  return `你是互动短剧的首席编剧。输出会被程序逐行解析，格式错误即失败。

核心目标（见互动爽感第一性原理）：30 秒内抓住用户，每回合让用户感到「我的选择立刻改变了局面」。快、准、有钩子；禁止散文式铺垫与重复施压。

根据用户【台词与行为】续写：台词进 MSG:你|，行为进 NARR/他人反应，并调度 NPC 群戏。

${craftBlock}

${sceneBlock}

【世界观与设定】
题材：「${theme.title}」——${theme.description}
主角：「${protagonist}」（用户扮演）。用户默认输入台词原文；#() 内为行为指令，非对白。
出场人物：随剧情逐步登场；每人首次开口前用 GUIDE: CAST 登记，勿在开场预写全员。

${castBlock}

${buildPromptFormatBlock()}

${buildUserInputTurnBlock()}

【本回合输出协议摘要】
${openingGuideBlock}
${SCRIPT_LINE.NARR} 关键画面（${narrRange} 行，可省略；每行 ≤${maxNarrChars}字，须带新信息，禁止空描）
${SCRIPT_LINE.MSG} 角色名|台词正文
${META_LINE.MOOD} tension|romance|triumph|sorrow|neutral
${META_LINE.COMPLETE} yes 或 no

【写作铁律】
1. MSG 格式不可变：MSG: 角色名|纯台词；禁止括号旁白；台词宜短，单条 ≤${maxMsgChars} 字，须精心设计。
2. 反墨迹：NARR 最多 ${narrRange} 行；无新信息则省略；禁止用旁白代替对白推进。
3. 即时反馈：用户台词/行为须在 NPC 首条对白中得到当场回应，局势同回合偏移。
${engagementRules}
7. 禁止输出 CARD 或任何备选台词列表；回合尾部：全部 MSG → MOOD → COMPLETE。
${completeRuleForSystem(config)}
${isOpening ? '8. 开场须严格按序：GUIDE TITLE → PROLOGUE → SCENE_HEAD → SCENE → NARR → MSG；每个首次开口 NPC 须先 GUIDE: CAST 再 MSG。' : `8. ${protagonistRule}`}
9. 本回合 ${msgRange} 条 MSG（${isOpening ? '全部 NPC，禁止「你」，须含 NPC↔NPC' : '含 1 条主角 + NPC 群戏'}）。

只输出协议行。最后一行必须是 COMPLETE。输出完立即停止。`;
}

function openingUserPrompt(
  config: StoryConfig,
  storyBackground?: StoryBackground,
): string {
  const theme = resolveTheme(config);
  const castSuffix = buildRegisteredCastUserSuffix(
    storyBackground?.characters ?? '',
    config.protagonistName,
  );

  return `互动短剧开场。主题：${theme.title}。世界观：${theme.description}。

【开场目标】30 秒内让用户想输入行动：冲突具体、局面已烧、主角被卷入。

【反寡淡 — 开场必须 Establish】
· 主角一项致命缺陷/限制，须在 PROLOGUE 或局面里可感
· 至少 1 名 NPC 的 CAST 含具体「暗线」
· 一处信息差炸弹
· 最后一条 MSG 埋下本集两难种子

开场 MSG 段：≥2 名 NPC，≥1 条 NPC↔NPC；前 2 条对白内亮出核心矛盾。

【硬性顺序 — 不可跳步】
1. GUIDE: TITLE → PROLOGUE → SCENE_HEAD（仅 slugline）
2. SCENE: 一行环境氛围
3. NARR: 0-${SCRIPT_LIMITS.openingMaxNarr} 行（可省略）
4. 每个首次开口 NPC：GUIDE: CAST → MSG（共 ${SCRIPT_LIMITS.openingMinMsg}-${SCRIPT_LIMITS.openingMaxMsg} 条）
5. MOOD → COMPLETE: no

禁止开场批量 CAST。最后一条 MSG 须让用户想立刻输入。说完即停。${castSuffix}`;
}

export interface TurnPromptContext {
  threadLines: ScriptLine[];
  groupLines?: ScriptLine[];
  scene?: StoryScene;
}

function turnUserPrompt(
  config: StoryConfig,
  ctx: TurnPromptContext,
  userInput: UserTurnInput,
  userTurnCount: number,
  storyBackground: StoryBackground | undefined,
  thread?: ChatThread,
): string {
  const { threadLines, groupLines, scene } = ctx;
  const protagonist = config.protagonistName.trim();
  const castSuffix = buildRegisteredCastUserSuffix(
    storyBackground?.characters ?? '',
    protagonist,
  );

  const isPrivate = thread?.kind === 'private';
  const npcName = thread?.participantNames.find(
    (name) => name !== protagonist && name !== '你',
  );

  if (isPrivate) {
    const groupHistory = groupLines?.length
      ? formatRecentDialogueHistory(
          groupLines,
          protagonist,
          PRIVATE_SCENE_CONTEXT_LINE_LIMIT,
        )
      : '';
    const privateHistory = formatRecentDialogueHistory(threadLines, protagonist);
    const sceneAnchor = scene?.slugline?.trim() || '';
    const sceneBlock = sceneAnchor || '见下方群聊记录';

    const groupSection = groupHistory
      ? `【场景群聊近况】\n${groupHistory}`
      : '【场景群聊近况】（尚无群聊记录）';
    const privateSection = privateHistory
      ? `【本次密谈】\n${privateHistory}`
      : '【本次密谈】（首次开口）';

    return `${sceneBlock}

${groupSection}

${privateSection}

${buildPrivateTurnContinuityPrompt(
  threadLines,
  protagonist,
  userInput,
  npcName ?? 'NPC',
)}

【执行指令 — 严格按序】
1. MSG: 你|台词 → 2. MSG: ${npcName ?? 'NPC'}|…（1-3 条）→ 3. MOOD → COMPLETE
${completeRuleForTurn(config, userTurnCount)}

本回合须推进密谈信息/关系，并暗示如何影响当前场景。禁止转场、禁止第三人。说完即停。${castSuffix}`;
  }

  const sceneAnchor =
    scene?.slugline?.trim() ||
    thread?.title?.trim() ||
    '当前场景';
  const dialogueHistory = formatRecentDialogueHistory(threadLines, protagonist);
  const dialogueSection = dialogueHistory
    ? `【近期对白】\n${dialogueHistory}`
    : '【近期对白】（尚无记录）';

  return `${sceneAnchor}

${dialogueSection}

${buildTurnContinuityPrompt(threadLines, protagonist, userInput)}

【执行指令 — 严格按序】
1. ${detectConfrontationStagnation(threadLines, protagonist) ? 'NARR: 外部打断 → ' : ''}MSG: 你|台词
2. 新 NPC：GUIDE: CAST → MSG
3. MSG: ${SCRIPT_LIMITS.turnMinMsg - 1}-${SCRIPT_LIMITS.turnMaxMsg - 1} 条已登场 NPC
4. 需转场时：${META_CUT_PREFIX}|slugline + ${SCRIPT_LINE.SCENE} 新环境（在 MOOD 之前）
5. MOOD → COMPLETE
${completeRuleForTurn(config, userTurnCount)}

本回合须推进当前场景局面。说完即停。${castSuffix}`;
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
    ? openingUserPrompt(config, storyBackground)
    : turnUserPrompt(
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
        content: npcSystemPrompt(config, isOpening, thread),
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

  if (thread?.kind === 'private') {
    scene = thread.sceneId
      ? getSceneForThread(state, thread)
      : undefined;
    if (scene) {
      groupLines = getSceneGroupThreadLines(state, scene);
    }
  } else if (thread?.sceneId) {
    scene = getSceneForThread(state, thread);
  }

  const payload = await generateTurnStreaming(
    state.config,
    false,
    { threadLines, groupLines, scene },
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
  return {
    ...state,
    turnIndex: state.turnIndex + 1,
    actionHistory: [
      ...state.actionHistory,
      { turnIndex: state.turnIndex, action },
    ],
  };
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

  if (payload.sceneCut && activeBeforeCut?.kind !== 'private') {
    next = applySceneCut(next, payload.sceneCut);
    next = appendThreadLines(next, next.activeThreadId, payload.scriptLines);
    if (sceneText) {
      next = patchActiveSceneIntro(next, sceneText);
    }
  } else {
    next = appendThreadLines(next, threadId, payload.scriptLines);
    if (sceneText && activeBeforeCut?.kind === 'scene') {
      next = patchActiveSceneIntro(next, sceneText);
    }
  }

  next = updateThreadTurnMeta(next, next.activeThreadId, {
    mood: payload.mood,
  });

  return next;
}
