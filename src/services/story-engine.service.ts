import { STORY_PACE } from '../constants/game.const';
import { GUIDE_FIELD, GUIDE_LIMITS, GUIDE_LINE } from '../constants/guide-format.const';
import { META_LINE } from '../constants/scene-text.const';
import { SCRIPT_LIMITS, SCRIPT_LINE } from '../constants/script-format.const';
import { getThemeById } from '../constants/themes';
import { getMockNpcTurn, getMockOpening } from '../mock/story.mock';
import { guideToBackground } from './guide-text.util';
import {
  extractSceneText,
  ensureSceneLine,
  formatChatHistory,
  mergePartialTailLine,
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
import {
  chatCompletionStream,
  isAgnesConfigured,
} from './agnes-ai.service';

function npcSystemPrompt(config: StoryConfig, isOpening: boolean): string {
  const theme = getThemeById(config.themeId);
  const audienceGuide =
    config.audience === 'male'
      ? '男频：冲突、博弈、反击，NPC 语气可硬，像真人发微信。'
      : '女频：情感拉扯、留白、潜台词，像真人聊天。';

  const {
    maxSceneChars,
    maxNarrChars,
    maxMsgChars,
    openingMinMsg,
    openingMaxMsg,
    turnMinMsg,
    turnMaxMsg,
  } = SCRIPT_LIMITS;

  const msgRange = isOpening
    ? `${openingMinMsg}-${openingMaxMsg}`
    : `${turnMinMsg}-${turnMaxMsg}`;

  const openingRules = isOpening
    ? `${GUIDE_LINE} ${GUIDE_FIELD.TITLE}|群名/故事名（≤${GUIDE_LIMITS.title}字）
${GUIDE_LINE} ${GUIDE_FIELD.SUMMARY}|一句话引子（≤${GUIDE_LIMITS.summary}字）
${GUIDE_LINE} ${GUIDE_FIELD.SCENE}|当前场景（≤${GUIDE_LIMITS.scene}字：时间地点、局势）
${GUIDE_LINE} ${GUIDE_FIELD.RELATIONS}|人物关系（≤${GUIDE_LIMITS.relations}字，· 名字：说明，换行分隔）
${GUIDE_LINE} ${GUIDE_FIELD.DETAIL}|故事前情（≤${GUIDE_LIMITS.detail}字）
${SCRIPT_LINE.SCENE} 场景提示（≤${maxSceneChars}字，与 GUIDE SCENE 一致或更短，展示在聊天区）
${SCRIPT_LINE.NARR} 旁白（≤${maxNarrChars}字，0-1 行，可选）`
    : `${SCRIPT_LINE.NARR} 旁白（≤${maxNarrChars}字，0-1 行，可选，禁止写 SCENE）
${META_LINE.MOOD} tension|romance|triumph|sorrow|neutral（本回合氛围，MSG 之后输出）
${META_LINE.COMPLETE} yes 或 no（故事是否自然收束，MSG 之后输出）`;

  const protagonistRule = isOpening
    ? `  - 开场仅写 NPC 角色名，禁止出现「你」或「${config.protagonistName}」`
    : `  - 本回合须先写 1 条 MSG:你|... 将用户【行为指令】艺术化为主角在群里的发言（像真实微信，≤${maxMsgChars}字，禁止复述指令原文）
  - 再写 NPC 消息；NPC 用角色名，主角固定「你」
  - 最后输出 MOOD 与 COMPLETE 两行`;

  return `你是互动短剧编剧。剧情在【微信群聊】中进行。

只输出下列行协议，不要 JSON，不要 markdown，不要解释。输出完本回合消息后立即停止。

设定：主题「${theme.title}」。用户扮演主角「${config.protagonistName}」——用户输入的是行为/意图指令，不是群聊原文；${isOpening ? '开场须先输出完整 GUIDE 引导行，再写 SCENE 与 NPC 消息。' : '由你把指令转化为一条主角消息后，再写 NPC 回应。'}

行协议（每行一条，冒号用英文半角，发送者与正文用半角竖线分隔）：
${openingRules}
${SCRIPT_LINE.MSG} 发送者|消息正文
${protagonistRule}
  - 一行 = 一条微信，仅文字
  - 禁止写「内心」「动作」等标签；情绪融进措辞
  - 本回合 ${msgRange} 条 MSG（${isOpening ? '全部 NPC' : '含 1 条主角 + NPC'}）

${audienceGuide}
禁止输出协议以外的文字。`;
}

function openingUserPrompt(config: StoryConfig): string {
  const theme = getThemeById(config.themeId);
  const protagonist = config.protagonistName || '你';
  return `群聊开场。主题：${theme.title}。强钩子，立刻进冲突。

必须按顺序输出：
1. 全部 GUIDE 行（TITLE/SUMMARY/SCENE/RELATIONS/DETAIL，帮用户理解「${protagonist}是谁、在哪、和谁、发生什么」）
2. 一行 SCENE（与 GUIDE SCENE 呼应，用于聊天区系统提示）
3. ${SCRIPT_LIMITS.openingMinMsg}-${SCRIPT_LIMITS.openingMaxMsg} 条 NPC 的 MSG

说完即停，等用户行动。`;
}

function turnUserPrompt(
  config: StoryConfig,
  scriptLines: ScriptLine[],
  userAction: string,
  userTurnCount: number,
): string {
  const history = formatChatHistory(scriptLines, config.protagonistName);
  const minTurns = STORY_PACE[config.length].minTurns;
  const canComplete = userTurnCount >= minTurns;

  return `【至今群聊记录】
${history || '（尚无记录）'}

【用户行为指令】（描述主角想做什么/什么态度，不是群聊原文，不要原样复述）
${userAction}

请完成本回合：
1. MSG:你|... 将行为指令艺术化为主角在群里的可见发言（≤${SCRIPT_LIMITS.maxMsgChars}字）
2. ${SCRIPT_LIMITS.turnMinMsg}-${SCRIPT_LIMITS.turnMaxMsg} 条 NPC 的 MSG 回应
3. MOOD: 本回合氛围
4. COMPLETE: ${canComplete ? 'yes 或 no（仅当主线冲突已解决、情感线有落点时为 yes）' : 'no（用户发言不足，必须为 no）'}
可选 1 行 NARR。说完即停。`;
}

function resolveIsComplete(
  config: StoryConfig,
  userTurnCount: number,
  aiSaysComplete: boolean,
): boolean {
  const minTurns = STORY_PACE[config.length].minTurns;
  return userTurnCount >= minTurns && aiSaysComplete;
}

function emitScriptChunk(
  buffer: string,
  revision: number,
  onUpdate: (u: SceneStreamUpdate) => void,
  openingBase?: StoryBackground,
): void {
  const { lines, guide, turnMeta, tail } = parseScriptStream(buffer);
  const sceneFallback =
    guide.SCENE || lines.find((l) => l.kind === 'scene')?.text;
  const withTail = mergePartialTailLine(lines, tail);
  const displayLines = ensureSceneLine(withTail, sceneFallback);
  const fields: Extract<SceneStreamUpdate, { kind: 'chunk' }>['fields'] = {
    scriptLines: displayLines,
    liveTail: tail,
  };

  if (turnMeta.mood) fields.mood = turnMeta.mood;

  if (openingBase) {
    fields.background = guideToBackground(
      guide,
      openingBase,
      extractSceneText(displayLines),
    );
  }

  onUpdate({ kind: 'chunk', revision, fields });
}

function buildPayloadFromRaw(
  config: StoryConfig,
  scriptRaw: string,
  isOpening: boolean,
  openingBase: StoryBackground | undefined,
  userTurnCount: number,
): GeneratedTurnPayload {
  const { lines, guide, turnMeta } = parseScriptStream(`${scriptRaw}\n`);
  const sceneText = extractSceneText(lines) || guide.SCENE;
  const withScene = ensureSceneLine(lines, sceneText);
  const displayLines = prepareDisplayScriptLines(withScene, {
    stripProtagonist: isOpening,
    protagonistName: config.protagonistName,
  });
  const mood = turnMeta.mood ?? 'neutral';

  if (isOpening && openingBase) {
    return {
      scriptLines: displayLines,
      scriptRaw,
      background: guideToBackground(guide, openingBase, sceneText),
      mood,
      isComplete: false,
    };
  }

  return {
    scriptLines: displayLines,
    scriptRaw,
    mood,
    isComplete: resolveIsComplete(
      config,
      userTurnCount,
      turnMeta.isComplete ?? false,
    ),
  };
}

async function aiGenerateTurn(
  config: StoryConfig,
  isOpening: boolean,
  existingLines: GeneratedTurnPayload['scriptLines'],
  userTurnCount: number,
  userAction: string,
  openingBase: StoryBackground | undefined,
  onUpdate: (u: SceneStreamUpdate) => void,
): Promise<GeneratedTurnPayload> {
  let storyBuffer = '';
  let revision = 0;

  const userContent = isOpening
    ? openingUserPrompt(config)
    : turnUserPrompt(config, existingLines, userAction, userTurnCount);

  for await (const delta of chatCompletionStream({
    messages: [
      { role: 'system', content: npcSystemPrompt(config, isOpening) },
      { role: 'user', content: userContent },
    ],
    temperature: 0.82,
    maxTokens: isOpening ? 1800 : 900,
  })) {
    storyBuffer += delta;
    revision += 1;
    emitScriptChunk(
      storyBuffer,
      revision,
      onUpdate,
      isOpening ? openingBase : undefined,
    );
  }

  const scriptRaw = storyBuffer.trim();
  if (!scriptRaw) throw new Error('Empty script from AI');

  revision += 1;
  const { lines, guide, turnMeta } = parseScriptStream(`${scriptRaw}\n`);
  const sceneText = extractSceneText(lines) || guide.SCENE;
  const withScene = ensureSceneLine(lines, sceneText);
  onUpdate({
    kind: 'chunk',
    revision,
    fields: {
      lockedScript: scriptRaw,
      scriptLines: withScene,
      liveTail: '',
      mood: turnMeta.mood,
      background:
        isOpening && openingBase
          ? guideToBackground(guide, openingBase, extractSceneText(withScene))
          : undefined,
    },
  });

  return buildPayloadFromRaw(
    config,
    scriptRaw,
    isOpening,
    openingBase,
    userTurnCount,
  );
}

async function mockGenerateTurn(
  config: StoryConfig,
  isOpening: boolean,
  _existingLines: GeneratedTurnPayload['scriptLines'],
  userTurnCount: number,
  userAction: string,
  openingBase: StoryBackground | undefined,
  onUpdate: (u: SceneStreamUpdate) => void,
): Promise<GeneratedTurnPayload> {
  const mock = isOpening
    ? getMockOpening(config)
    : getMockNpcTurn(config, userTurnCount, userAction);

  const scriptRaw = mock.scriptRaw;
  let cursor = 0;
  let revision = 0;

  while (cursor < scriptRaw.length) {
    cursor = Math.min(cursor + 8, scriptRaw.length);
    revision += 1;
    emitScriptChunk(
      scriptRaw.slice(0, cursor),
      revision,
      onUpdate,
      isOpening ? openingBase : undefined,
    );
    await new Promise((r) => setTimeout(r, 8));
  }

  revision += 1;
  const { lines, guide, turnMeta } = parseScriptStream(`${scriptRaw}\n`);
  const sceneText = extractSceneText(lines) || guide.SCENE;
  const withScene = ensureSceneLine(lines, sceneText);
  onUpdate({
    kind: 'chunk',
    revision,
    fields: {
      lockedScript: scriptRaw,
      scriptLines: withScene,
      liveTail: '',
      mood: turnMeta.mood ?? mock.mood,
      background:
        isOpening && openingBase
          ? guideToBackground(guide, openingBase, extractSceneText(withScene))
          : undefined,
    },
  });

  if (isOpening) {
    return buildPayloadFromRaw(
      config,
      scriptRaw,
      true,
      openingBase,
      userTurnCount,
    );
  }

  return {
    scriptLines: prepareDisplayScriptLines(withScene, {
      stripProtagonist: false,
      protagonistName: config.protagonistName,
    }),
    scriptRaw,
    mood: turnMeta.mood ?? mock.mood,
    isComplete: mock.isComplete,
  };
}

async function generateTurnStreaming(
  config: StoryConfig,
  isOpening: boolean,
  existingLines: GeneratedTurnPayload['scriptLines'],
  userTurnCount: number,
  userAction: string,
  openingBase: StoryBackground | undefined,
  onUpdate: (u: SceneStreamUpdate) => void,
): Promise<GeneratedTurnPayload> {
  if (isAgnesConfigured()) {
    try {
      return await aiGenerateTurn(
        config,
        isOpening,
        existingLines,
        userTurnCount,
        userAction,
        openingBase,
        onUpdate,
      );
    } catch (err) {
      console.warn('[Story Engine] AI failed, fallback mock', err);
    }
  }

  return mockGenerateTurn(
    config,
    isOpening,
    existingLines,
    userTurnCount,
    userAction,
    openingBase,
    onUpdate,
  );
}

export function createStoryState(config: StoryConfig): StoryState {
  const theme = getThemeById(config.themeId);
  return {
    config,
    turnIndex: 0,
    scriptLines: [],
    background: {
      title: '',
      summary: '',
      sceneNow: '',
      relationships: '',
      detail: '',
      atmosphere: theme.subtitle,
    },
    mood: 'neutral',
    actionHistory: [],
  };
}

export async function generateOpeningStreaming(
  config: StoryConfig,
  openingBase: StoryBackground,
  onUpdate: (u: SceneStreamUpdate) => void,
): Promise<GeneratedTurnPayload> {
  const payload = await generateTurnStreaming(
    config,
    true,
    [],
    0,
    '',
    openingBase,
    onUpdate,
  );

  onUpdate({ kind: 'turn_complete', payload, isOpening: true });
  return payload;
}

export async function generateNpcTurnStreaming(
  config: StoryConfig,
  scriptLines: GeneratedTurnPayload['scriptLines'],
  userTurnCount: number,
  userAction: string,
  onUpdate: (u: SceneStreamUpdate) => void,
): Promise<GeneratedTurnPayload> {
  const payload = await generateTurnStreaming(
    config,
    false,
    scriptLines,
    userTurnCount,
    userAction,
    undefined,
    onUpdate,
  );

  onUpdate({ kind: 'turn_complete', payload, isOpening: false });
  return payload;
}

export function toPlayerAction(text: string) {
  return { text: text.trim() };
}

export function getAudienceLabel(audience: AudienceType): string {
  return audience === 'male' ? '男频 · 爽文逆袭' : '女频 · 情感纠葛';
}

export function createInitialStreamState(turnIndex: number): SceneStreamState {
  return {
    turnIndex,
    scriptLines: [],
    liveTail: '',
    isStreaming: true,
    streamRevision: 0,
  };
}

export function recordUserAction(state: StoryState, text: string): StoryState {
  const action = toPlayerAction(text);
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
  return {
    ...state,
    scriptLines: [...state.scriptLines, ...payload.scriptLines],
    background: isOpening && payload.background
      ? payload.background
      : state.background,
    mood: payload.mood,
  };
}
