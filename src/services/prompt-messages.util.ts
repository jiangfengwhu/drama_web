import { STORY_PACE, PRIVATE_SCENE_CONTEXT_LINE_LIMIT, SCENE_PRIVATE_CONTEXT_LINE_LIMIT, SCENE_FORCE_CUT_TURNS, SCENE_SOFT_CUT_TURNS } from '../constants/game.const';
import { buildCastRevealRulesBlock, buildRegisteredCastUserSuffix } from '../constants/cast-reveal.const';
import { buildCraftPromptBlock } from '../constants/prompt-craft.const';
import { GUIDE_FIELD, GUIDE_LIMITS, GUIDE_LINE } from '../constants/guide-format.const';
import { buildPromptFormatBlock } from '../constants/prompt-format.const';
import { buildSceneArchitecturePromptBlock } from '../constants/prompt-scene.const';
import { buildSceneCutPromptBlock } from '../constants/prompt-scene-cut.const';
import { META_CUT_PREFIX } from '../constants/scene-heading.const';
import { META_LINE } from '../constants/scene-text.const';
import { SCRIPT_LIMITS, SCRIPT_LINE } from '../constants/script-format.const';
import type { ChatThread, ScenePrivateChatContext, StoryScene } from '../types/story-scene.types';
import type { StoryBackground, StoryConfig } from '../types/story.types';
import type { UserTurnInput } from '../types/user-input.types';
import { buildStoryBiblePromptBlock, resolveStoryBible } from './story-bible.util';
import {
  buildPrivateTurnContinuityPrompt,
  buildTurnContinuityPrompt,
  formatRecentDialogueHistory,
  formatScenePrivateChatHistory,
  resolveSceneCutPressure,
} from './script-text.util';
import type { ScriptLine } from '../types/script.types';

export interface TurnPromptContext {
  threadLines: ScriptLine[];
  groupLines?: ScriptLine[];
  privateChats?: ScenePrivateChatContext[];
  scene?: StoryScene;
}

function minTurnsFor(config: StoryConfig): number {
  return STORY_PACE[config.length].minTurns;
}

function completeRuleForSystem(config: StoryConfig): string {
  const min = minTurnsFor(config);
  return `用户主动选择满 ${min} 次之前，COMPLETE 必须为 no；满 ${min} 次后，仅当主线冲突已解决、情感线有落点、本回合可自然收束时才可 yes。`;
}

function completeRuleForTurn(config: StoryConfig, userTurnCount: number): string {
  const min = minTurnsFor(config);
  if (userTurnCount < min) {
    return `COMPLETE: 必须为 no（已选 ${userTurnCount}/${min} 次，未达篇幅下限）`;
  }
  return `COMPLETE: yes 或 no（已选 ${userTurnCount} 次，仅主线闭环且本回合可收束时用 yes）`;
}

/**
 * System：稳定身份、故事蓝图、写作法则、协议格式、CAST 规则。
 * 不含：本回合对白记录、用户输入、执行顺序、转场计数等动态信息。
 */
export function buildNpcSystemPrompt(
  config: StoryConfig,
  isOpening: boolean,
  thread?: ChatThread,
): string {
  const protagonist = config.protagonistName.trim();
  const isPrivate = thread?.kind === 'private';
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

  const modeRule = isOpening
    ? `开场模式：GUIDE(TITLE→PROLOGUE→SCENE_HEAD) → SCENE → NARR(可选) → 每个首次开口 NPC 须 GUIDE:CAST 后 MSG；禁止主角 MSG。`
    : isPrivate
      ? `私聊模式：仅主角「你」与一名 NPC 可 MSG；禁止第三人、NARR 群戏、META: CUT。`
      : `群聊模式：含 1 条 MSG:你| + NPC 群戏；新 NPC 须 GUIDE:CAST；换场用 META: CUT + SCENE。`;

  return `你是互动短剧首席编剧。只输出可被程序逐行解析的协议行，禁止 Markdown、JSON 或解释性散文。

${buildStoryBiblePromptBlock(config)}

${buildCraftPromptBlock(config, isOpening)}

${buildSceneArchitecturePromptBlock(isPrivate)}

${buildPromptFormatBlock()}

【角色与输入约定】
主角：「${protagonist}」（用户扮演）。
用户输入默认为台词原文 → MSG:你|；#(...) / #（...）为行为指令，非对白，须写进 NARR 或他人反应。
支持 @成员名 点名在场 NPC。

${buildCastRevealRulesBlock(protagonist)}

【输出类型与篇幅】
${modeRule}
NARR：${narrRange} 行，每行 ≤${maxNarrChars} 字，无新信息则省略。
MSG：本回合 ${msgRange} 条，单条 ≤${maxMsgChars} 字。
SCENE：≤${maxSceneChars} 字（开场或 CUT 后）。
尾部固定：${META_LINE.MOOD} → ${META_LINE.COMPLETE}。
${completeRuleForSystem(config)}
最后一行必须是 COMPLETE，输出完立即停止。`;
}

/** User（开场）：本回合任务与执行顺序；故事设定已在 system 的 Story Bible 中。 */
export function buildOpeningUserPrompt(
  config: StoryConfig,
  storyBackground?: StoryBackground,
): string {
  const bible = resolveStoryBible(config);
  const castSuffix = buildRegisteredCastUserSuffix(
    storyBackground?.characters ?? '',
    config.protagonistName,
  );
  const establish = bible.hookMechanics.openingMustEstablish
    .map((item) => `· ${item}`)
    .join('\n');

  return `【本回合任务｜开场】
写「${bible.meta.title}」的第一场戏。30 秒内让用户想输入行动。

【本场须建立】
${establish}

【执行顺序 — 不可跳步】
1. ${GUIDE_LINE} ${GUIDE_FIELD.TITLE}|故事名（≤${GUIDE_LIMITS.title}字）
2. ${GUIDE_LINE} ${GUIDE_FIELD.PROLOGUE}|前情提要（≤${GUIDE_LIMITS.prologue}字，仅 1 句）
3. ${GUIDE_LINE} ${GUIDE_FIELD.SCENE_HEAD}|slugline（INT/EXT. 地点 - 时间）
4. ${SCRIPT_LINE.SCENE} 环境氛围（一行）
5. ${SCRIPT_LINE.NARR} 0-${SCRIPT_LIMITS.openingMaxNarr} 行（可省略）
6. 每个首次开口 NPC：${GUIDE_LINE} ${GUIDE_FIELD.CAST} → ${SCRIPT_LINE.MSG}（共 ${SCRIPT_LIMITS.openingMinMsg}-${SCRIPT_LIMITS.openingMaxMsg} 条，≥1 条 NPC↔NPC）
7. ${META_LINE.MOOD} → ${META_LINE.COMPLETE}: no

禁止开场批量 CAST。最后一条 MSG 须让用户想立刻输入。${castSuffix}`;
}

/** User（回合）：动态上下文 + 用户输入 + 本回合执行顺序。 */
export function buildTurnUserPrompt(
  config: StoryConfig,
  ctx: TurnPromptContext,
  userInput: UserTurnInput,
  userTurnCount: number,
  storyBackground: StoryBackground | undefined,
  thread?: ChatThread,
): string {
  const { threadLines, groupLines, privateChats, scene } = ctx;
  const protagonist = config.protagonistName.trim();
  const castSuffix = buildRegisteredCastUserSuffix(
    storyBackground?.characters ?? '',
    protagonist,
  );

  if (thread?.kind === 'private') {
    return buildPrivateTurnUserPrompt(
      config,
      ctx,
      userInput,
      userTurnCount,
      thread,
      castSuffix,
      protagonist,
      groupLines,
      scene,
      threadLines,
    );
  }

  return buildSceneTurnUserPrompt(
    config,
    userInput,
    userTurnCount,
    thread,
    castSuffix,
    protagonist,
    threadLines,
    privateChats,
    scene,
  );
}

function buildPrivateTurnUserPrompt(
  config: StoryConfig,
  _ctx: TurnPromptContext,
  userInput: UserTurnInput,
  userTurnCount: number,
  thread: ChatThread,
  castSuffix: string,
  protagonist: string,
  groupLines: ScriptLine[] | undefined,
  scene: StoryScene | undefined,
  threadLines: ScriptLine[],
): string {
  const npcName =
    thread.participantNames.find(
      (name) => name !== protagonist && name !== '你',
    ) ?? thread.title;

  const groupHistory = groupLines?.length
    ? formatRecentDialogueHistory(
        groupLines,
        protagonist,
        PRIVATE_SCENE_CONTEXT_LINE_LIMIT,
      )
    : '';
  const privateHistory = formatRecentDialogueHistory(threadLines, protagonist);
  const sceneAnchor = scene?.slugline?.trim() || '当前场景';

  return `【本回合任务｜密谈｜第 ${userTurnCount} 次选择后】
场景：${sceneAnchor}
密谈对象：${npcName}

【场景群聊近况】
${groupHistory || '（尚无群聊记录）'}

【本次密谈记录】
${privateHistory || '（首次开口）'}

${buildPrivateTurnContinuityPrompt(
    threadLines,
    protagonist,
    userInput,
    npcName,
  )}

【本回合执行顺序】
1. MSG: 你|台词（承接用户输入）
2. MSG: ${npcName}|…（1-3 条）
3. ${META_LINE.MOOD} → ${completeRuleForTurn(config, userTurnCount)}

须推进密谈信息/关系，并暗示如何影响群聊。禁止转场、禁止第三人。${castSuffix}`;
}

function buildSceneTurnUserPrompt(
  config: StoryConfig,
  userInput: UserTurnInput,
  userTurnCount: number,
  thread: ChatThread | undefined,
  castSuffix: string,
  protagonist: string,
  threadLines: ScriptLine[],
  privateChats: ScenePrivateChatContext[] | undefined,
  scene: StoryScene | undefined,
): string {
  const sceneAnchor =
    scene?.slugline?.trim() || thread?.title?.trim() || '当前场景';
  const dialogueHistory = formatRecentDialogueHistory(threadLines, protagonist);

  const privateHistory = privateChats?.length
    ? formatScenePrivateChatHistory(
        privateChats,
        protagonist,
        SCENE_PRIVATE_CONTEXT_LINE_LIMIT,
      )
    : '';

  const softCutAfter = SCENE_SOFT_CUT_TURNS[config.length];
  const forceCutAfter = SCENE_FORCE_CUT_TURNS[config.length];
  const cutPressure = resolveSceneCutPressure(
    threadLines,
    protagonist,
    softCutAfter,
    forceCutAfter,
  );

  const cutExecStep = cutPressure.forceCut
    ? `4. 【强制转场】2-4 条 MSG 收束 → ${META_CUT_PREFIX}|slugline → ${SCRIPT_LINE.SCENE} → MOOD`
    : cutPressure.suggestCut
      ? `4. Beat 可闭合时优先 ${META_CUT_PREFIX}|slugline + ${SCRIPT_LINE.SCENE}；否则 NARR 不可逆破局`
      : `4. 需转场时：${META_CUT_PREFIX}|slugline + ${SCRIPT_LINE.SCENE}（MOOD 前）`;

  const privateSection = privateHistory
    ? `【本场密谈纪要 — 群聊须承接】
${privateHistory}

仅参与者知情；未参与者不得凭空引用；主角公开后全员方可接话。`
    : '';

  const sceneCutBlock = buildSceneCutPromptBlock({
    protagonistTurnsInScene: cutPressure.protagonistTurnsInScene,
    softCutAfter,
    forceCutAfter,
    suggestCut: cutPressure.suggestCut,
    forceCut: cutPressure.forceCut,
    stagnation: cutPressure.stagnation,
  });

  const presentCast =
    thread?.participantNames.filter(Boolean).join('、') || '渐进登场';

  return `【本回合任务｜群聊｜第 ${userTurnCount} 次选择后】
场景：${sceneAnchor}
已在场 NPC：${presentCast}

【近期对白】
${dialogueHistory || '（尚无记录）'}
${privateSection ? `\n${privateSection}\n` : ''}
${sceneCutBlock}

${buildTurnContinuityPrompt(threadLines, protagonist, userInput, {
    hasPrivateContext: Boolean(privateHistory),
    cutPressure,
  })}

【本回合执行顺序】
1. ${cutPressure.stagnation && !cutPressure.forceCut ? 'NARR: 外部打断 → ' : ''}MSG: 你|台词
2. 新 NPC：${GUIDE_LINE} ${GUIDE_FIELD.CAST} → MSG
3. MSG: ${SCRIPT_LIMITS.turnMinMsg - 1}-${SCRIPT_LIMITS.turnMaxMsg - 1} 条（含 NPC↔NPC）
${cutExecStep}
5. ${META_LINE.MOOD} → ${completeRuleForTurn(config, userTurnCount)}

本回合须推进局面${privateHistory ? '并兑现密谈后果' : ''}${cutPressure.forceCut ? '，并执行强制转场' : ''}。${castSuffix}`;
}
