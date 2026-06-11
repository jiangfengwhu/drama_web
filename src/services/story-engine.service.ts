import { STORY_PACE } from '../constants/game.const';
import { buildCraftPromptBlock } from '../constants/prompt-craft.const';
import { EMOTION_SLIDER_OPTION_COUNT } from '../constants/interaction.const';
import {
  buildEmotionCardPromptBlock,
  buildPromptFormatBlock,
} from '../constants/prompt-format.const';
import { GUIDE_FIELD, GUIDE_LIMITS, GUIDE_LINE } from '../constants/guide-format.const';
import { META_LINE } from '../constants/scene-text.const';
import { SCRIPT_LIMITS, SCRIPT_LINE } from '../constants/script-format.const';
import { resolveTheme } from '../constants/themes';
import { getMockNpcTurn, getMockOpening } from '../mock/story.mock';
import { guideToBackground } from './guide-text.util';
import {
  extractSceneText,
  ensureSceneLine,
  formatChatHistory,
  normalizeAttitudeCards,
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

function ensureAttitudeCards(
  cards: string[] | undefined,
  audience: StoryConfig['audience'],
): string[] {
  return normalizeAttitudeCards(cards, audience);
}

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

function npcSystemPrompt(config: StoryConfig, isOpening: boolean): string {
  const theme = resolveTheme(config);
  const protagonist = config.protagonistName || '你';
  const craftBlock = buildCraftPromptBlock(config);

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

  const narrRange = isOpening ? `0-${openingMaxNarr}` : `0-${turnMaxNarr}`;

  const openingGuideBlock = isOpening
    ? `${GUIDE_LINE} ${GUIDE_FIELD.TITLE}|故事名（≤${GUIDE_LIMITS.title}字）
${GUIDE_LINE} ${GUIDE_FIELD.SUMMARY}|一句话引子（≤${GUIDE_LIMITS.summary}字）
${GUIDE_LINE} ${GUIDE_FIELD.SCENE}|当前场景（≤${GUIDE_LIMITS.scene}字：时间地点、局势）
${GUIDE_LINE} ${GUIDE_FIELD.RELATIONS}|人物关系（≤${GUIDE_LIMITS.relations}字，· 名字：说明，换行分隔）
${GUIDE_LINE} ${GUIDE_FIELD.DETAIL}|故事前情（≤${GUIDE_LIMITS.detail}字）
${SCRIPT_LINE.SCENE} 场景提示（≤${maxSceneChars}字，与 GUIDE SCENE 一致或更短）`
    : '';

  const protagonistRule = isOpening
    ? `  - 开场仅写 NPC 角色名，禁止出现「你」或「${protagonist}」`
    : `  - 本回合须先写 1 条 MSG:你|(微动作/神态) 台词，将用户【意图指令】艺术化为主角言行（≤${maxMsgChars}字含括号，禁止复述指令原文）
  - 再写 NPC 对白；NPC 用角色名，主角固定「你」`;

  return `你是互动短剧的首席编剧，兼有文学编辑与导演视角。输出会被程序逐行解析；格式错误将导致解析失败，因此必须 100% 遵守协议。

根据用户的【意图指令】，将其艺术化为主角的台词与动作，并控制 NPC 做出最具戏剧张力的真实回应。文笔目标：耐读、有品、可演——像高分短剧剧本，不是廉价网文连载。

${craftBlock}

【世界观与设定】
题材：「${theme.title}」——${theme.description}
主角：「${protagonist}」（用户扮演）。用户输入的是行为/意图指令，不是台词原文。
出场人物：由你动态设定 3-5 名关键 NPC（每人 2-4 字中文名），关系写进 GUIDE RELATIONS，全剧姓名保持一致。

【UI 与场景脱钩法则】
前端 UI 以对话流形式展现，但剧情发生在真实物理空间（如暴雨中的半山别墅、奢华晚宴大厅）。
绝对禁止：微信群、聊天群、@全员、表情包、转发链接等任何网络社交元素。

${buildPromptFormatBlock(isOpening)}

${buildEmotionCardPromptBlock()}

【本回合输出协议摘要】
${openingGuideBlock}
${SCRIPT_LINE.NARR} 环境/动作（五感：冷暖、气味、光影、声响、触感；${narrRange} 行，每行 ≤${maxNarrChars}字）
${SCRIPT_LINE.MSG} 角色名|(微动作/神态) 台词文本
${META_LINE.MOOD} tension|romance|triumph|sorrow|neutral
${META_LINE.CARD} 情绪滑动条台词（恰好 ${EMOTION_SLIDER_OPTION_COUNT} 行，情绪从退让递进到决裂）
${META_LINE.COMPLETE} yes 或 no

【写作铁律】
1. MSG 格式不可变：半角冒号 + 半角竖线 + 括号微动作，示例：MSG: 沈清|(将合同推过桌面，声线平稳) 这一页，你看懂再签。
2. 五感旁白：NARR 须调动至少两种感官，写可触可感的细节，拒绝抽象形容堆砌。
3. 张力卡点：停在冲突将变未变之处，逼用户做艰难选择，而非喊完口号即停。
4. CARD 必填：MOOD 后、COMPLETE 前，恰好 ${EMOTION_SLIDER_OPTION_COUNT} 行 CARD，七档须像同一人在同一情境下的七种自持/失控，不是金句摘抄。
${completeRuleForSystem(config)}
${isOpening ? '6. 开场须先输出完整 GUIDE 五行，再 SCENE → NARR → MSG。' : `6. ${protagonistRule}`}
7. 本回合 ${msgRange} 条 MSG（${isOpening ? '全部 NPC，禁止「你」' : '含 1 条主角 + NPC'}）。

只输出协议行。最后一行必须是 COMPLETE。输出完立即停止。`;
}

function openingUserPrompt(config: StoryConfig): string {
  const theme = resolveTheme(config);
  return `互动短剧开场。主题：${theme.title}。世界观：${theme.description}。

开场须在 3 条 MSG 内建立「具体场景 + 人物关系 + 未解矛盾」；引子要有文学性，忌口号式羞辱与围观震惊。

【硬性顺序 — 不可跳步、不可乱序】
1. GUIDE: TITLE → SUMMARY → SCENE → RELATIONS → DETAIL（五行齐全）
2. SCENE: 一行场景提示
3. NARR: 0-${SCRIPT_LIMITS.openingMaxNarr} 行（五感描写）
4. MSG: ${SCRIPT_LIMITS.openingMinMsg}-${SCRIPT_LIMITS.openingMaxMsg} 条 NPC 对白（格式：MSG: 姓名|(动作) 台词）
5. MOOD: 选一个氛围词
6. CARD: 必须恰好 ${EMOTION_SLIDER_OPTION_COUNT} 行（每行一条主角台词，供用户滑动选择）
7. COMPLETE: no

再次强调：MSG 必须用「MSG: 角色名|(微动作) 台词」；CARD 不可省略且须 ${EMOTION_SLIDER_OPTION_COUNT} 行。说完即停。`;
}

function turnUserPrompt(
  config: StoryConfig,
  scriptLines: ScriptLine[],
  userAction: string,
  userTurnCount: number,
): string {
  const history = formatChatHistory(scriptLines, config.protagonistName);
  const sceneHint =
    scriptLines.find((l) => l.kind === 'scene')?.text ??
    scriptLines.find((l) => l.kind === 'narr')?.text ??
    '';

  return `【前情提要】
${sceneHint ? `[环境] ${sceneHint}` : ''}
[剧情对白]
${history || '（尚无记录）'}

【用户当前意图/行为】
${userAction}

本回合写作：NPC 回应须符合各自身份与声口；新信息优先用细节与行为呈现，少用总结句。禁止廉价网文句式。

【执行指令 — 严格按序，一行一协议】
1. NARR: 0-${SCRIPT_LIMITS.turnMaxNarr} 行（可选，五感铺垫）
2. MSG: 你|(微动作/神态) 台词 ← 将用户意图艺术化，半角竖线不可省略
3. MSG: ${SCRIPT_LIMITS.turnMinMsg - 1}-${SCRIPT_LIMITS.turnMaxMsg - 1} 条 NPC 回应（格式：MSG: 姓名|(动作) 台词）
4. MOOD: 氛围词
5. CARD: 必须恰好 ${EMOTION_SLIDER_OPTION_COUNT} 行，每行 CARD: 一条主角台词，情绪强度从低到高
${completeRuleForTurn(config, userTurnCount)}

缺 CARD 或 MSG 格式错误视为失败。最后一行必须是 COMPLETE。说完即停。`;
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
  openingBase?: StoryBackground,
): void {
  const { lines, guide, turnMeta, tail } = parseScriptStream(buffer);
  const sceneFallback =
    guide.SCENE || lines.find((l) => l.kind === 'scene')?.text;
  const displayLines = ensureSceneLine(lines, sceneFallback);
  const fields: Extract<SceneStreamUpdate, { kind: 'chunk' }>['fields'] = {
    scriptLines: displayLines,
    liveTail: tail,
  };

  if (turnMeta.mood) fields.mood = turnMeta.mood;
  if (turnMeta.attitudeCards?.length) {
    fields.attitudeCards = [
      ...new Set(turnMeta.attitudeCards.map((c) => c.trim()).filter(Boolean)),
    ].slice(0, EMOTION_SLIDER_OPTION_COUNT);
  }

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
  const attitudeCards = ensureAttitudeCards(turnMeta.attitudeCards, config.audience);

  if (isOpening && openingBase) {
    return {
      scriptLines: displayLines,
      scriptRaw,
      background: guideToBackground(guide, openingBase, sceneText),
      mood,
      attitudeCards,
      isComplete: false,
    };
  }

  return {
    scriptLines: displayLines,
    scriptRaw,
    mood,
    attitudeCards,
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
    temperature: 0.88,
    maxTokens: isOpening ? 3600 : 1800,
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
      attitudeCards: ensureAttitudeCards(turnMeta.attitudeCards, config.audience),
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
      isOpening ? openingBase : undefined,
    );
    await new Promise((r) => setTimeout(r, 420));
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
      attitudeCards: mock.attitudeCards,
      background:
        isOpening && openingBase
          ? guideToBackground(guide, openingBase, extractSceneText(withScene))
          : undefined,
    },
  });

  if (isOpening) {
    return buildPayloadFromRaw(config, scriptRaw, true, openingBase, userTurnCount);
  }

  return {
    scriptLines: prepareDisplayScriptLines(withScene, {
      stripProtagonist: false,
      protagonistName: config.protagonistName,
    }),
    scriptRaw,
    mood: turnMeta.mood ?? mock.mood,
    attitudeCards: mock.attitudeCards,
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
  const theme = resolveTheme(config);
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
    attitudeCards: [],
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
  return audience === 'male' ? '偏硬核 · 布局反击' : '偏情感 · 关系博弈';
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
    attitudeCards: payload.attitudeCards,
  };
}
