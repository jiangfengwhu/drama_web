import { STORY_PACE } from '../constants/game.const';
import { buildCraftPromptBlock } from '../constants/prompt-craft.const';
import { ATTITUDE_CARD_COUNT_RANGE_LABEL } from '../constants/interaction.const';
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
  detectConfrontationStagnation,
  isAttitudeCardCountValid,
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
  isAiConfigured,
} from './ai-chat.service';

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
${GUIDE_LINE} ${GUIDE_FIELD.PROLOGUE}|前情提要（≤${GUIDE_LIMITS.prologue}字，仅 1 句：此刻最要命的一件事，禁止背景年表）
${SCRIPT_LINE.SCENE} 场景提示（≤${maxSceneChars}字：时间地点 + 当前局势，一句入戏）`
    : `${GUIDE_LINE} ${GUIDE_FIELD.CAST}|（仅本回合首次登场的新角色，每人一行，紧挨其首条 MSG 之前）`;

  const protagonistRule = isOpening
    ? `  - 开场仅写 NPC 角色名，禁止出现「你」或「${protagonist}」
  - 开场 MSG 须构成群戏：≥2 名 NPC，且 ≥1 条为 NPC 互相对话（见开场群戏法则）`
    : `  - 本回合须先写 1 条 MSG:你|台词，将用户【意图指令】艺术化为主角对白（≤${maxMsgChars}字，禁止复述指令原文，禁止括号旁白）
  - 台词须改变局势或立场，动作与神态融进措辞，让玩家从话里脑补画面（见 MSG 台词法则）
  - 再写 ${turnMinMsg - 1}-${turnMaxMsg - 1} 条 NPC 对白：首条须接「你」并含信息增量（泄密/交易/软肋）；≥1 条 NPC↔NPC；禁止循环对骂
  - 僵持时须 NARR 引入第三方打断；NPC 用角色名，主角固定「你」`;

  return `你是互动短剧的首席编剧。输出会被程序逐行解析，格式错误即失败。

核心目标（见互动爽感第一性原理）：30 秒内抓住用户，每回合让用户感到「我的选择立刻改变了局面」。快、准、有钩子；禁止散文式铺垫与重复施压。

根据用户【意图指令】艺术化为主角言行，并调度 NPC 群戏：当场接招、当场变局。文笔像高分短剧剧本，不是慢热网文连载。

${craftBlock}

【世界观与设定】
题材：「${theme.title}」——${theme.description}
主角：「${protagonist}」（用户扮演）。用户输入的是行为/意图指令，不是台词原文。
出场人物：随剧情逐步登场；每人首次开口前用 GUIDE: CAST 登记，勿在开场预写全员。

${castBlock}

${buildPromptFormatBlock()}

${buildEmotionCardPromptBlock(protagonist)}

【本回合输出协议摘要】
${openingGuideBlock}
${SCRIPT_LINE.NARR} 关键画面（${narrRange} 行，可省略；每行 ≤${maxNarrChars}字，须带新信息，禁止空描）
${SCRIPT_LINE.MSG} 角色名|台词正文
${META_LINE.MOOD} tension|romance|triumph|sorrow|neutral
${META_LINE.CARD} 情绪滑动条台词（${ATTITUDE_CARD_COUNT_RANGE_LABEL} 行，情绪从退让递进到决裂）
${META_LINE.COMPLETE} yes 或 no

【写作铁律】
1. MSG 格式不可变：MSG: 角色名|纯台词；禁止括号旁白；台词宜短，单条 ≤${maxMsgChars} 字，须精心设计。
2. 反墨迹：NARR 最多 ${narrRange} 行；无新信息则省略；禁止用旁白代替对白推进。
3. 即时反馈：主角/用户意图须在 NPC 首条对白中得到当场回应，局势同回合物理偏移（动作+泄密/交易，禁止只对骂）。
4. 反停滞：禁止循环争吵与纯情绪宣泄；僵持 2 轮须 NARR 第三方打断（见推进法则）。
5. 回合钩子：MOOD 前最后一条 MSG 须制造「想选 CARD」的抉择压力（见情绪卡点法则）。
6. 接戏 + 群戏：NPC 接上一句；至少 1 条 NPC↔NPC；禁止幻词反问。
7. CARD 必填：MOOD 后、COMPLETE 前，${ATTITUDE_CARD_COUNT_RANGE_LABEL} 行 CARD，须为可执行动作意图，绑定本回合情境。
${completeRuleForSystem(config)}
${isOpening ? '8. 开场须严格按序：GUIDE TITLE → PROLOGUE → SCENE → NARR → MSG；禁止开场批量 CAST；每个首次开口 NPC 须先 GUIDE: CAST 再 MSG；开场 MSG 须有 NPC 互相对话。' : `8. ${protagonistRule}`}
9. 本回合 ${msgRange} 条 MSG（${isOpening ? '全部 NPC，禁止「你」，须含 NPC↔NPC' : '含 1 条主角 + NPC 群戏'}）。
${isOpening ? '' : `10. 回合尾部顺序固定：全部 MSG 写完后 → MOOD → ${ATTITUDE_CARD_COUNT_RANGE_LABEL} 行 CARD: → COMPLETE；禁止在 NPC MSG 未写完时提前输出 MOOD/CARD。`}

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

【开场目标】30 秒内让用户想滑动 CARD：冲突具体、局面已烧、主角被卷入，且感到「选哪边都肉痛」。

【反寡淡 — 开场必须Establish】
· 主角一项致命缺陷/限制（说谎失效、不能露身份、欠人情必还等），须在 PROLOGUE 或局面里可感
· 至少 1 名 NPC 的 CAST 含具体「暗线」，MSG 里泄露一丝潜台词
· 一处信息差炸弹：一方已知危险，另一方尚不知情
· 最后一条 MSG 埋下本集「残忍两难」的种子（Right vs Right 或 Wrong vs Wrong）

开场 MSG 段：≥2 名 NPC，≥1 条 NPC↔NPC；前 2 条对白内亮出核心矛盾。禁止排队训主角、禁止先铺世界观。

【硬性顺序 — 不可跳步】
1. GUIDE: TITLE → PROLOGUE（仅 1 句，不含 CAST）
2. SCENE: 一行入戏
3. NARR: 0-${SCRIPT_LIMITS.openingMaxNarr} 行（可省略；有则必须带新信息）
4. 每个首次开口 NPC：GUIDE: CAST（含暗线）→ MSG（共 ${SCRIPT_LIMITS.openingMinMsg}-${SCRIPT_LIMITS.openingMaxMsg} 条 MSG，短句快切）
5. MOOD → CARD（${ATTITUDE_CARD_COUNT_RANGE_LABEL} 行，各档附带不同代价）→ COMPLETE: no

${buildCardPlotBindingBlock()}

禁止开场批量 CAST；CARD 不可省略。最后一条 MSG 须让用户想立刻选一句。说完即停。${castSuffix}`;
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
1. ${detectConfrontationStagnation(scriptLines, protagonist) ? 'NARR: 1 行外部打断（强制）→ ' : 'NARR: 0-1 行（僵持时强制打断；否则默认省略）→ '}
2. MSG: 你|台词 ← 艺术化「用户选中主角意图」，纯对白，局势须从台词可推知变化
3. 新 NPC：GUIDE: CAST → MSG
4. MSG: ${SCRIPT_LIMITS.turnMinMsg - 1}-${SCRIPT_LIMITS.turnMaxMsg - 1} 条 NPC（首条接「你」且须泄密/交易/软肋；≥1 条 NPC↔NPC；禁止循环对骂；最后一条 CARD 钩子）
5. MOOD → CARD（${ATTITUDE_CARD_COUNT_RANGE_LABEL} 行，纯台词，各档精心打磨）→ COMPLETE
${completeRuleForTurn(config, userTurnCount)}

${buildCardPlotBindingBlock()}

本回合须让用户感到「局面因我的选择变了」，且 CARD 无 obvious 正确答案。缺 CARD、首条 NPC 不接主角、最后一条无钩子 → 失败。说完即停。${castSuffix}`;
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
随后 ${ATTITUDE_CARD_COUNT_RANGE_LABEL} 行 CARD:（每行主角台词，须绑定上文情境与 NPC；场面简用 3 条，标准 4 条，对峙多用 5 条）
COMPLETE: no`,
      },
    ],
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

  if (!isAttitudeCardCountValid(attitudeCards.length)) {
    console.warn('[Story Engine] invalid CARD count, requesting tail repair');
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
  if (isAiConfigured()) {
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
