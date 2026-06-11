import { AI_COMPLETION_MAX_TOKENS, STORY_PACE } from '../constants/game.const';
import { buildCraftPromptBlock } from '../constants/prompt-craft.const';
import { EMOTION_SLIDER_OPTION_COUNT } from '../constants/interaction.const';
import {
  buildCardPlotBindingBlock,
  buildEmotionCardPromptBlock,
  buildPromptFormatBlock,
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
  formatRecentChatHistory,
  buildTurnContinuityPrompt,
  resolveAttitudeCards,
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
  scriptRaw: string,
  cards: string[] | undefined,
): string[] {
  return resolveAttitudeCards(scriptRaw, cards);
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
  const protagonist = config.protagonistName.trim();
  const craftBlock = buildCraftPromptBlock(config, isOpening);
  const castBlock = buildCastRevealRulesBlock(protagonist);

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
${GUIDE_LINE} ${GUIDE_FIELD.PROLOGUE}|前情提要（≤${GUIDE_LIMITS.prologue}字，一两句话：此刻处境与核心矛盾，忌长篇铺陈）
${SCRIPT_LINE.SCENE} 场景提示（≤${maxSceneChars}字：时间地点、此刻局势）`
    : `${GUIDE_LINE} ${GUIDE_FIELD.CAST}|（仅本回合首次登场的新角色，每人一行，紧挨其首条 MSG 之前）`;

  const protagonistRule = isOpening
    ? `  - 开场仅写 NPC 角色名，禁止出现「你」或「${protagonist}」
  - 开场 MSG 须构成群戏：≥2 名 NPC，且 ≥1 条为 NPC 互相对话（见开场群戏法则）`
    : `  - 本回合须先写 1 条 MSG:你|(微动作/神态) 台词，将用户【意图指令】艺术化为主角言行（≤${maxMsgChars}字含括号，禁止复述指令原文）
  - 再写 ${turnMinMsg - 1}-${turnMaxMsg - 1} 条 NPC 对白：首条须接「你」本句；其后至少 1 条须接前一位 NPC 或当面与另一 NPC 交锋（群戏，非人人只对主角）
  - NPC 用角色名，主角固定「你」`;

  return `你是互动短剧的首席编剧，兼有文学编辑与导演视角。输出会被程序逐行解析；格式错误将导致解析失败，因此必须 100% 遵守协议。

根据用户的【意图指令】，将其艺术化为主角的台词与动作，并调度 NPC 群戏：彼此角力、互相拆台，也回应主角。文笔目标：耐读、有品、可演——像高分短剧剧本，不是廉价网文连载。

${craftBlock}

【世界观与设定】
题材：「${theme.title}」——${theme.description}
主角：「${protagonist}」（用户扮演）。用户输入的是行为/意图指令，不是台词原文。
出场人物：随剧情逐步登场；每人首次开口前用 GUIDE: CAST 登记，勿在开场预写全员。

${castBlock}

【UI 与场景脱钩法则】
前端 UI 以对话流形式展现，但剧情发生在真实物理空间（如暴雨中的半山别墅、奢华晚宴大厅）。
绝对禁止：微信群、聊天群、@全员、表情包、转发链接等任何网络社交元素。

${buildPromptFormatBlock()}

${buildEmotionCardPromptBlock(protagonist)}

【本回合输出协议摘要】
${openingGuideBlock}
${SCRIPT_LINE.NARR} 环境/动作（五感：冷暖、气味、光影、声响、触感；${narrRange} 行，每行 ≤${maxNarrChars}字）
${SCRIPT_LINE.MSG} 角色名|(微动作/神态) 台词文本
${META_LINE.MOOD} tension|romance|triumph|sorrow|neutral
${META_LINE.CARD} 情绪滑动条台词（恰好 ${EMOTION_SLIDER_OPTION_COUNT} 行，情绪从退让递进到决裂）
${META_LINE.COMPLETE} yes 或 no

【写作铁律】
1. MSG 格式不可变：半角冒号 + 半角竖线 + 括号微动作，格式为 MSG: 角色名|(微动作/神态) 台词。
2. 五感旁白：NARR 须调动至少两种感官，写可触可感的细节，拒绝抽象形容堆砌。
3. 张力卡点：停在冲突将变未变之处，逼用户做艰难选择，而非喊完口号即停。
4. 接戏优先：每条 NPC 须接上一句（主角或 NPC）；禁止幻词反问（见对话连贯铁律）。
5. 群戏必填：禁止所有 NPC 只对主角说话；每回合至少 1 条 NPC↔NPC 对白。
6. CARD 必填：MOOD 后、COMPLETE 前，恰好 ${EMOTION_SLIDER_OPTION_COUNT} 行 CARD；七条须绑定本回合 MSG/NARR 的情境与人物，禁止套话。
${completeRuleForSystem(config)}
${isOpening ? '7. 开场须严格按序：GUIDE TITLE → PROLOGUE → SCENE → NARR → MSG；禁止开场批量 CAST；每个首次开口 NPC 须先 GUIDE: CAST 再 MSG；开场 MSG 须有 NPC 互相对话。' : `7. ${protagonistRule}`}
8. 本回合 ${msgRange} 条 MSG（${isOpening ? '全部 NPC，禁止「你」，须含 NPC↔NPC' : '含 1 条主角 + NPC 群戏'}）。
${isOpening ? '' : `9. 回合尾部顺序固定：全部 MSG 写完后 → MOOD → ${EMOTION_SLIDER_OPTION_COUNT} 行 CARD: → COMPLETE；禁止在 NPC MSG 未写完时提前输出 MOOD/CARD。`}

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

开场须在 MSG 段呈现「已在进行的群戏」：至少 2 名 NPC，且不少于 1 条 NPC 互相对话；再自然把压力引向主角。忌人人排队对人主角训话。

【硬性顺序 — 不可跳步、不可乱序】
1. GUIDE: TITLE → PROLOGUE（仅两行，不含 CAST）
2. SCENE: 一行场景提示
3. NARR: 0-${SCRIPT_LIMITS.openingMaxNarr} 行（五感描写）
4. 对每个首次开口的 NPC：先 GUIDE: CAST|· 姓名：身份/关系，再 MSG（≥2 名 NPC，≥1 条 NPC↔NPC）
5. MOOD: 选一个氛围词
6. CARD: 必须恰好 ${EMOTION_SLIDER_OPTION_COUNT} 行（每行一条主角台词，须绑定本回合 MSG 情境，禁止套话）
7. COMPLETE: no

${buildCardPlotBindingBlock()}

再次强调：禁止开场写全 CAST；每个新 NPC 仅在其首条 MSG 前登记一行 CAST；主角禁止 CAST。CARD 不可省略。说完即停。${castSuffix}`;
}

function turnUserPrompt(
  config: StoryConfig,
  scriptLines: ScriptLine[],
  userAction: string,
  userTurnCount: number,
  storyBackground?: StoryBackground,
): string {
  const protagonist = config.protagonistName.trim();
  const history = formatRecentChatHistory(scriptLines, protagonist);
  const sceneHint =
    scriptLines.find((l) => l.kind === 'scene')?.text ??
    scriptLines.find((l) => l.kind === 'narr')?.text ??
    '';
  const castSuffix = buildRegisteredCastUserSuffix(
    storyBackground?.characters ?? '',
    protagonist,
  );

  return `【前情提要】
${sceneHint ? `[环境] ${sceneHint}` : ''}
[剧情对白]
${history || '（尚无记录）'}

${buildTurnContinuityPrompt(scriptLines, protagonist, userAction)}

【执行指令 — 严格按序，一行一协议】
1. NARR: 0-${SCRIPT_LIMITS.turnMaxNarr} 行（可选，五感铺垫）
2. MSG: 你|(微动作/神态) 台词 ← 艺术化上方「用户选中主角意图」，半角竖线不可省略
3. 对每个本回合首次登场的新 NPC：先 GUIDE: CAST|· 姓名：身份，再 MSG
4. MSG: ${SCRIPT_LIMITS.turnMinMsg - 1}-${SCRIPT_LIMITS.turnMaxMsg - 1} 条 NPC 群戏（首条接「你」；其后至少 1 条 NPC↔NPC）
5. MOOD: 氛围词 ← 须在第 4 步全部 MSG 写完之后才能输出，禁止在 NPC 对白未写完时提前 MOOD
6. CARD: 必须恰好 ${EMOTION_SLIDER_OPTION_COUNT} 行，每行均以 CARD: 开头，情绪强度从低到高，且须绑定本回合 MSG/NARR
${completeRuleForTurn(config, userTurnCount)}

${buildCardPlotBindingBlock()}

缺 CARD、CARD 与本回合无关、MSG 格式错误、首条 NPC 未接主角、或对已登记角色重复 CAST → 视为失败。
【收尾强制 — 每回合必出，不可省略】MOOD: → 连续 ${EMOTION_SLIDER_OPTION_COUNT} 行 CARD: → COMPLETE:；禁止在 CARD 之前结束输出。说完即停。${castSuffix}`;
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
  const cards = resolveAttitudeCards(buffer, turnMeta.attitudeCards);
  if (cards.length > 0) fields.attitudeCards = cards;

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
  attitudeCardsOverride?: string[],
): GeneratedTurnPayload {
  const { lines, guide, turnMeta } = parseScriptStream(`${scriptRaw}\n`);
  const sceneText = extractSceneText(lines);
  const withScene = ensureSceneLine(lines, sceneText);
  const displayLines = prepareDisplayScriptLines(withScene, {
    stripProtagonist: isOpening,
    protagonistName: config.protagonistName,
  });
  const mood = turnMeta.mood ?? 'neutral';
  const attitudeCards =
    attitudeCardsOverride ??
    ensureAttitudeCards(scriptRaw, turnMeta.attitudeCards);
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
    attitudeCards,
    isComplete: isOpening
      ? false
      : resolveIsComplete(
          config,
          userTurnCount,
          turnMeta.isComplete ?? false,
        ),
  };
}

async function requestCardTailRepair(
  config: StoryConfig,
  scriptRaw: string,
  isOpening: boolean,
): Promise<string[]> {
  let repairBuffer = '';
  for await (const delta of chatCompletionStream({
    messages: [
      { role: 'system', content: npcSystemPrompt(config, isOpening) },
      { role: 'assistant', content: scriptRaw },
      {
        role: 'user',
        content: `上述回合输出缺少 CARD 态度滑动条（每回合必填）。请仅续写，不要重复已有 MSG/NARR：
MOOD: 选一个氛围词
随后恰好 ${EMOTION_SLIDER_OPTION_COUNT} 行 CARD:（每行主角台词，须绑定上文情境与 NPC）
COMPLETE: no`,
      },
    ],
    temperature: 0.75,
    maxTokens: 900,
  })) {
    repairBuffer += delta;
  }

  const repairRaw = repairBuffer.trim();
  if (!repairRaw) return [];
  const { turnMeta } = parseScriptStream(`${repairRaw}\n`);
  return resolveAttitudeCards(repairRaw, turnMeta.attitudeCards);
}

async function aiGenerateTurn(
  config: StoryConfig,
  isOpening: boolean,
  existingLines: GeneratedTurnPayload['scriptLines'],
  userTurnCount: number,
  userAction: string,
  storyBackground: StoryBackground | undefined,
  onUpdate: (u: SceneStreamUpdate) => void,
): Promise<GeneratedTurnPayload> {
  let storyBuffer = '';
  let revision = 0;

  const userContent = isOpening
    ? openingUserPrompt(config, storyBackground)
    : turnUserPrompt(
        config,
        existingLines,
        userAction,
        userTurnCount,
        storyBackground,
      );

  for await (const delta of chatCompletionStream({
    messages: [
      {
        role: 'system',
        content: npcSystemPrompt(config, isOpening),
      },
      { role: 'user', content: userContent },
    ],
    temperature: 0.88,
    maxTokens: isOpening
      ? AI_COMPLETION_MAX_TOKENS.opening
      : AI_COMPLETION_MAX_TOKENS.turn,
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

  let { lines, guide, turnMeta } = parseScriptStream(`${scriptRaw}\n`);
  let attitudeCards = ensureAttitudeCards(scriptRaw, turnMeta.attitudeCards);

  if (attitudeCards.length === 0) {
    console.warn('[Story Engine] missing CARD, requesting tail repair');
    const repaired = await requestCardTailRepair(config, scriptRaw, isOpening);
    if (repaired.length > 0) {
      attitudeCards = repaired;
      const repairMeta = parseScriptStream(
        `${scriptRaw}\n${repaired.map((c) => `CARD: ${c}`).join('\n')}\n`,
      );
      turnMeta = {
        ...turnMeta,
        ...repairMeta.turnMeta,
        attitudeCards: repaired,
      };
      lines = repairMeta.lines.length > lines.length ? repairMeta.lines : lines;
      guide = repairMeta.guide;
    }
  }

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
      attitudeCards,
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
    attitudeCards,
  );
}

async function mockGenerateTurn(
  config: StoryConfig,
  isOpening: boolean,
  _existingLines: GeneratedTurnPayload['scriptLines'],
  userTurnCount: number,
  userAction: string,
  storyBackground: StoryBackground | undefined,
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
      attitudeCards: mock.attitudeCards,
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
      prologue: '',
      characters: '',
      sceneNow: '',
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
  storyBackground: StoryBackground,
  onUpdate: (u: SceneStreamUpdate) => void,
): Promise<GeneratedTurnPayload> {
  const payload = await generateTurnStreaming(
    config,
    false,
    scriptLines,
    userTurnCount,
    userAction,
    storyBackground,
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
  _isOpening: boolean,
): StoryState {
  return {
    ...state,
    scriptLines: [...state.scriptLines, ...payload.scriptLines],
    background: payload.background ?? state.background,
    mood: payload.mood,
    attitudeCards: payload.attitudeCards,
  };
}
