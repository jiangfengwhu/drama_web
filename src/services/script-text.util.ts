import type { UserTurnInput } from '../types/user-input.types';
import { TURN_HISTORY_LINE_LIMIT } from '../constants/game.const';
import { formatUserInputForPrompt } from './user-input.util';
import {
  SCRIPT_FIELD_SEP,
  SCRIPT_LINE,
} from '../constants/script-format.const';
import { VALID_MOODS } from '../constants/scene-text.const';
import {
  appendGuideField,
  mergeGuideSnapshots,
  parseGuideLine,
  parsePartialGuideLine,
  type GuideSnapshot,
} from './guide-text.util';
import type { ScriptLine } from '../types/script.types';
import type { SceneCutPayload } from '../types/story-scene.types';
import type { SceneMood } from '../types/story.types';
import type { StoryTimelineItem } from '../types/story-timeline.types';
import { parseSceneCutMeta } from './scene-meta.util';

const PROTOCOL_TAGS = ['SCENE', 'NARR', 'MSG', 'ROLE'] as const;
type ProtocolTag = (typeof PROTOCOL_TAGS)[number];

export interface TurnMetaSnapshot {
  mood?: SceneMood;
  isComplete?: boolean;
  sceneCut?: SceneCutPayload;
}

const META_PREFIXES = [
  'TITLE:',
  'ATMOSPHERE:',
  'MOOD:',
  'COMPLETE:',
  'CARD:',
  'IMAGE_PROMPT:',
  'INNER:',
  'CHARACTERS:',
  'CLIMAX:',
  'SUMMARY:',
  'SCENE_NOW:',
  'RELATIONS:',
  'BACKGROUND:',
  'DIALOGUE:',
];

const MSG_FIELD_SEPS = ['|', '｜', '丨'] as const;

function normalizeProtocolLine(raw: string): string {
  let line = raw.trim();
  if (!line) return line;

  line = line.replace(/^[`#*\s]+/, '').replace(/[`#*\s]+$/, '');

  for (const tag of PROTOCOL_TAGS) {
    const re = new RegExp(`^${tag}\\s*[：:]\\s*`, 'i');
    if (re.test(line)) {
      return `${tag}:${line.replace(re, '').trimStart()}`;
    }
  }

  return line;
}

function matchProtocolTag(line: string): ProtocolTag | null {
  for (const tag of PROTOCOL_TAGS) {
    if (line.toUpperCase().startsWith(`${tag}:`)) return tag;
  }
  return null;
}

function parseMood(raw: string): SceneMood {
  const v = raw.trim().toLowerCase();
  return (VALID_MOODS as readonly string[]).includes(v)
    ? (v as SceneMood)
    : 'neutral';
}

function parseYesNo(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === 'yes' || v === 'true' || v === '是';
}

/** 解析回合尾部的 MOOD / COMPLETE 行（不进入聊天展示） */
export function parseTurnMetaLine(raw: string): TurnMetaSnapshot | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const moodMatch = trimmed.match(/^MOOD\s*[：:]\s*(.+)$/i);
  if (moodMatch) return { mood: parseMood(moodMatch[1]) };

  const completeMatch = trimmed.match(/^COMPLETE\s*[：:]\s*(.+)$/i);
  if (completeMatch) return { isComplete: parseYesNo(completeMatch[1]) };

  const sceneCut = parseSceneCutMeta(trimmed);
  if (sceneCut) return { sceneCut };

  return null;
}

export function mergeTurnMetaSnapshots(
  base: TurnMetaSnapshot,
  patch: TurnMetaSnapshot,
): TurnMetaSnapshot {
  return {
    ...base,
    ...patch,
    sceneCut: patch.sceneCut ?? base.sceneCut,
  };
}

/** 剥离旧协议遗留的括号旁白，统一为纯台词展示 */
function normalizeMsgDialogue(message: string): string {
  const trimmed = message.trim();
  const legacy = trimmed.match(/^[（(]([^）)]*)[）)]\s*(.*)$/s);
  if (!legacy) return trimmed;
  const dialogue = legacy[2]?.trim() ?? '';
  if (dialogue) return dialogue;
  return legacy[1]?.trim() ?? trimmed;
}

function isMetaLine(trimmed: string): boolean {
  const upper = trimmed.toUpperCase();
  return META_PREFIXES.some((p) => upper.startsWith(p));
}

function buildMsgLine(sender: string, message: string): ScriptLine {
  return {
    kind: 'msg',
    sender,
    message: normalizeMsgDialogue(message),
  };
}

function parseMsgFields(body: string): { sender: string; message: string } | null {
  const normalized = body.trim().replace(/^["「『]|["」』]$/g, '');

  for (const sep of MSG_FIELD_SEPS) {
    const idx = normalized.indexOf(sep);
    if (idx <= 0) continue;
    const sender = normalized.slice(0, idx).trim();
    const message = normalized.slice(idx + sep.length).trim();
    if (sender && message) return { sender, message };
  }

  const nameParenMatch = normalized.match(
    /^([\u4e00-\u9fa5·]{1,10})\s*([（(].+)$/s,
  );
  if (nameParenMatch?.[2]?.trim()) {
    return { sender: nameParenMatch[1].trim(), message: nameParenMatch[2].trim() };
  }

  const colonMatch = normalized.match(/^([^：:|\s]{1,16})[：:]\s*(.+)$/);
  if (colonMatch) {
    const sender = colonMatch[1].trim();
    const message = colonMatch[2].trim();
    if (sender && message) return { sender, message };
  }

  return null;
}

function parseLegacyRole(body: string): ScriptLine | null {
  const parts = body.split(SCRIPT_FIELD_SEP).map((p) => p.trim());
  const sender = parts[0];
  if (!sender) return null;

  const message = parts.slice(1).filter(Boolean).join(' ').trim();
  if (!message) return null;

  return buildMsgLine(sender, message);
}

function parseBareDialogue(trimmed: string): ScriptLine | null {
  if (isMetaLine(trimmed)) return null;
  if (isGuideProtocolLine(trimmed)) return null;

  const msgPipe = trimmed.match(/^([\u4e00-\u9fa5·]{1,8})\s*\|\s*(.+)$/s);
  if (msgPipe?.[2]?.trim()) {
    const sender = msgPipe[1].trim();
    if (PROTOCOL_SPEAKER.test(sender)) return null;
    return buildMsgLine(sender, msgPipe[2].trim());
  }

  const bracket = trimmed.match(/^【([^】]{1,16})】\s*(.+)$/);
  if (bracket) {
    return buildMsgLine(bracket[1].trim(), bracket[2].trim());
  }

  const colon = trimmed.match(/^([^：:\s【】]{1,16})[：:]\s*(.+)$/);
  if (colon) {
    const sender = colon[1].trim();
    const message = colon[2].trim();
    if (PROTOCOL_SPEAKER.test(sender)) return null;
    if (sender && message && !/^\d/.test(sender)) {
      return buildMsgLine(sender, message);
    }
  }

  return null;
}

function parsePartialMsgFields(body: string): ScriptLine | null {
  for (const sep of MSG_FIELD_SEPS) {
    const idx = body.indexOf(sep);
    if (idx <= 0) continue;
    const sender = body.slice(0, idx).trim();
    const message = body.slice(idx + sep.length);
    if (sender) return { kind: 'msg', sender, message };
  }
  return null;
}

/** 解析流式尾部未换行的一行（GUIDE / SCENE / MSG 等） */
export function parsePartialTailScriptLine(tail: string): ScriptLine | null {
  const trimmed = tail.trim();
  if (!trimmed || /^GUIDE?\s*[：:]/i.test(trimmed)) return null;
  if (isMetaLine(trimmed) || parseTurnMetaLine(trimmed)) return null;

  const normalized = normalizeProtocolLine(trimmed);
  const tag = matchProtocolTag(normalized);

  if (tag === 'SCENE') {
    const text = normalized.slice('SCENE:'.length).trimStart();
    return text ? { kind: 'scene', text } : null;
  }

  if (tag === 'NARR') {
    const text = normalized.slice('NARR:'.length).trimStart();
    return text ? { kind: 'narr', text } : null;
  }

  if (tag === 'MSG') {
    const partial = parsePartialMsgFields(normalized.slice('MSG:'.length));
    if (!partial?.sender) return partial;
    return {
      kind: 'msg',
      sender: partial.sender,
      message: normalizeMsgDialogue(partial.message ?? ''),
    };
  }

  return null;
}

/** 将尾部未完成行合并进已解析行（同类型更新最后一项） */
export function mergePartialTailLine(
  lines: ScriptLine[],
  tail: string,
): ScriptLine[] {
  const partial = parsePartialTailScriptLine(tail);
  if (!partial) return lines;

  const last = lines[lines.length - 1];
  if (
    partial.kind === 'msg' &&
    last?.kind === 'msg' &&
    last.sender === partial.sender
  ) {
    return [...lines.slice(0, -1), partial];
  }
  if (partial.kind === 'scene' && last?.kind === 'scene') {
    return [...lines.slice(0, -1), partial];
  }
  if (partial.kind === 'narr' && last?.kind === 'narr') {
    return [...lines.slice(0, -1), partial];
  }

  return [...lines, partial];
}

const PROTOCOL_SPEAKER = /^(GUIDE?|TITLE|PROLOGUE|CAST|MOOD|CARD|COMPLETE|SCENE|NARR|MSG|ROLE)$/i;

function isGuideProtocolLine(trimmed: string): boolean {
  if (/^GUIDE?\s*[：:]/i.test(trimmed)) return true;
  if (/^(TITLE|PROLOGUE|CAST|DETAIL|SUMMARY|RELATIONS)\s*[：:|]/i.test(trimmed)) {
    return true;
  }
  return false;
}

function parseScriptLine(raw: string): ScriptLine | null {
  const trimmed = raw.trim();
  if (!trimmed || isMetaLine(trimmed)) return null;
  if (isGuideProtocolLine(trimmed)) return null;
  if (parseGuideLine(trimmed) || parsePartialGuideLine(trimmed)) return null;

  const normalized = normalizeProtocolLine(trimmed);
  const tag = matchProtocolTag(normalized);

  if (tag === 'SCENE') {
    const sceneText = normalized.slice('SCENE:'.length).trim();
    return sceneText ? { kind: 'scene', text: sceneText } : null;
  }

  if (tag === 'NARR') {
    const narrText = normalized.slice('NARR:'.length).trim();
    return narrText ? { kind: 'narr', text: narrText } : null;
  }

  if (tag === 'MSG') {
    const body = normalized.slice('MSG:'.length).trim();
    const fields = parseMsgFields(body);
    if (!fields) return null;
    return buildMsgLine(fields.sender, fields.message);
  }

  if (tag === 'ROLE') {
    const body = normalized.slice('ROLE:'.length).trim();
    return parseLegacyRole(body);
  }

  return parseBareDialogue(trimmed);
}

function matchProtocolTagLine(line: string): ProtocolTag | null {
  const normalized = normalizeProtocolLine(line.trim());
  return matchProtocolTag(normalized);
}

function isGuideContinuationField(
  field: keyof GuideSnapshot | null,
): field is 'PROLOGUE' | 'CAST' {
  return field === 'PROLOGUE' || field === 'CAST';
}

export function parseScriptStream(buffer: string): {
  lines: ScriptLine[];
  guide: GuideSnapshot;
  turnMeta: TurnMetaSnapshot;
  tail: string;
} {
  const parts = buffer.split('\n');
  const tail = parts.pop() ?? '';
  const lines: ScriptLine[] = [];
  let guide: GuideSnapshot = {};
  let turnMeta: TurnMetaSnapshot = {};
  let pendingGuideField: keyof GuideSnapshot | null = null;

  for (const line of parts) {
    const trimmed = line.trim();
    if (!trimmed) {
      pendingGuideField = null;
      continue;
    }

    const guidePart = parseGuideLine(line);
    if (guidePart) {
      const field = Object.keys(guidePart)[0] as keyof GuideSnapshot;
      if (field === 'CAST') {
        guide = appendGuideField(guide, 'CAST', guidePart.CAST ?? '');
      } else {
        guide = mergeGuideSnapshots(guide, guidePart);
      }
      pendingGuideField = isGuideContinuationField(field) ? field : null;
      continue;
    }

    if (pendingGuideField === 'PROLOGUE' || pendingGuideField === 'CAST') {
      if (
        parseTurnMetaLine(trimmed) ||
        matchProtocolTagLine(trimmed) ||
        parseGuideLine(trimmed)
      ) {
        pendingGuideField = null;
      } else {
        guide = appendGuideField(guide, pendingGuideField, trimmed);
        continue;
      }
    }

    pendingGuideField = null;

    const turnMetaPart = parseTurnMetaLine(line);
    if (turnMetaPart) {
      turnMeta = mergeTurnMetaSnapshots(turnMeta, turnMetaPart);
      continue;
    }

    const parsed = parseScriptLine(line);
    if (parsed) lines.push(parsed);
  }

  /* 未完成行不并入 guide，避免左侧概览逐字闪烁；整行换行后再展示 */
  return { lines, guide, turnMeta, tail };
}

export function parseScriptText(raw: string): ScriptLine[] {
  const lines: ScriptLine[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (parseGuideLine(trimmed)) continue;
    if (parseTurnMetaLine(trimmed)) continue;
    const parsed = parseScriptLine(line);
    if (parsed) lines.push(parsed);
  }
  return lines;
}

export function serializeScriptLines(lines: ScriptLine[]): string {
  return lines
    .map((line) => {
      if (line.kind === 'scene') return `${SCRIPT_LINE.SCENE} ${line.text ?? ''}`;
      if (line.kind === 'narr') return `${SCRIPT_LINE.NARR} ${line.text ?? ''}`;
      return `${SCRIPT_LINE.MSG} ${line.sender}${SCRIPT_FIELD_SEP}${line.message ?? ''}`;
    })
    .join('\n');
}

export function firstSceneLineText(lines: ScriptLine[]): string | undefined {
  return lines.find((l) => l.kind === 'scene')?.text;
}

export function isProtagonistSender(sender: string, protagonistName: string): boolean {
  const r = sender.trim();
  if (r === '你') return true;
  if (protagonistName && r === protagonistName) return true;
  if (r.includes('{{name}}')) return true;
  return false;
}

export function scriptLinesToTimeline(
  lines: ScriptLine[],
  protagonistName: string,
  idOffset = 0,
  threadKey = '',
): StoryTimelineItem[] {
  const idPrefix = threadKey ? `${threadKey}-` : '';
  return lines
    .map((line, index) => {
      const id = `${idPrefix}tl-${idOffset + index}`;
      if (line.kind === 'scene') {
        return { id, kind: 'scene' as const, text: line.text ?? '' };
      }
      if (line.kind === 'narr') {
        return { id, kind: 'narration' as const, text: line.text ?? '' };
      }
      const isProtagonist = isProtagonistSender(line.sender ?? '', protagonistName);
      return {
        id,
        kind: 'msg' as const,
        sender: isProtagonist ? protagonistName : (line.sender ?? '未知'),
        text: line.message ?? '',
        isProtagonist,
      };
    })
    .filter((item) => item.text.trim().length > 0);
}

export function trimTimelineByChars(
  items: StoryTimelineItem[],
  visibleChars: number,
): StoryTimelineItem[] {
  if (visibleChars <= 0 || items.length === 0) return [];

  let remaining = visibleChars;
  const result: StoryTimelineItem[] = [];

  for (const item of items) {
    if (remaining <= 0) break;
    const len = item.text.length;
    if (len <= remaining) {
      result.push(item);
      remaining -= len;
      continue;
    }
    result.push({ ...item, text: item.text.slice(0, remaining) });
    remaining = 0;
  }

  return result;
}

export function timelineVisibleLength(items: StoryTimelineItem[]): number {
  return items.reduce((sum, item) => sum + item.text.length, 0);
}

/** 概览区已展示 SCENE，对话区不再重复 */
export function stripSceneLines(lines: ScriptLine[]): ScriptLine[] {
  return lines.filter((line) => line.kind !== 'scene');
}

function isProtocolNoiseMsg(line: ScriptLine): boolean {
  if (line.kind !== 'msg') return false;
  const sender = line.sender?.trim() ?? '';
  if (!sender) return false;
  if (PROTOCOL_SPEAKER.test(sender)) return true;
  if (/^(TITLE|PROLOGUE|CAST)\s*[：:]/i.test(line.message ?? '')) return true;
  return false;
}

/** 剔除误解析进对话流的协议行 */
export function stripProtocolNoiseLines(lines: ScriptLine[]): ScriptLine[] {
  return lines.filter((line) => !isProtocolNoiseMsg(line));
}

export function stripProtagonistMsgs(
  lines: ScriptLine[],
  protagonistName: string,
): ScriptLine[] {
  return lines.filter((line) => {
    if (line.kind !== 'msg') return true;
    return !isProtagonistSender(line.sender ?? '', protagonistName);
  });
}

export interface PrepareDisplayOptions {
  stripProtagonist?: boolean;
  protagonistName?: string;
}

/** 转为可展示在聊天区的行（保留 SCENE 系统提示） */
export function prepareDisplayScriptLines(
  lines: ScriptLine[],
  options: PrepareDisplayOptions = {},
): ScriptLine[] {
  const { stripProtagonist = false, protagonistName = '你' } = options;
  const cleaned = stripProtocolNoiseLines(lines);
  if (!stripProtagonist) return cleaned;
  return stripProtagonistMsgs(cleaned, protagonistName);
}

/** @deprecated 使用 prepareDisplayScriptLines */
export function prepareNpcScriptLines(
  lines: ScriptLine[],
  protagonistName: string,
): ScriptLine[] {
  return prepareDisplayScriptLines(lines, {
    stripProtagonist: true,
    protagonistName,
  });
}

export function formatChatHistory(
  lines: ScriptLine[],
  protagonistName: string,
): string {
  return lines
    .map((line) => {
      if (line.kind === 'scene') return `[场景] ${line.text ?? ''}`;
      if (line.kind === 'narr') return `[系统] ${line.text ?? ''}`;
      const sender = isProtagonistSender(line.sender ?? '', protagonistName)
        ? '你'
        : line.sender;
      return `${sender}: ${line.message ?? ''}`;
    })
    .join('\n');
}

/** 回合 prompt 用：仅 MSG/NARR，不含 SCENE（场景已在 thread 头展示） */
export function formatRecentDialogueHistory(
  lines: ScriptLine[],
  protagonistName: string,
  lineLimit: number = TURN_HISTORY_LINE_LIMIT,
): string {
  const relevant = lines.filter(
    (line) => line.kind === 'msg' || line.kind === 'narr',
  );
  const recent =
    lineLimit > 0 && relevant.length > lineLimit
      ? relevant.slice(-lineLimit)
      : relevant;
  if (recent.length === 0) return '';
  const formatted = formatChatHistory(recent, protagonistName);
  if (lineLimit > 0 && relevant.length > lineLimit) {
    return `（摘录最近 ${lineLimit} 条）\n${formatted}`;
  }
  return formatted;
}

/** 回合 prompt 用：仅保留最近若干行，避免上下文过长 */
export function formatRecentChatHistory(
  lines: ScriptLine[],
  protagonistName: string,
  lineLimit: number = TURN_HISTORY_LINE_LIMIT,
): string {
  const relevant = lines.filter(
    (line) => line.kind === 'msg' || line.kind === 'narr' || line.kind === 'scene',
  );
  const recent =
    lineLimit > 0 && relevant.length > lineLimit
      ? relevant.slice(-lineLimit)
      : relevant;
  const formatted = formatChatHistory(recent, protagonistName);
  if (lineLimit > 0 && relevant.length > lineLimit) {
    return `（仅摘录最近 ${lineLimit} 行）\n${formatted}`;
  }
  return formatted;
}

/** 近 2 轮是否仅原地对峙、无 NARR/局面变化 — 触发第三力量强制打断 */
export function detectConfrontationStagnation(
  scriptLines: ScriptLine[],
  protagonistName: string,
): boolean {
  const msgs = scriptLines.filter((line) => line.kind === 'msg');
  const protagonistTurnStarts: number[] = [];
  msgs.forEach((line, index) => {
    if (isProtagonistSender(line.sender ?? '', protagonistName)) {
      protagonistTurnStarts.push(index);
    }
  });
  if (protagonistTurnStarts.length < 2) return false;

  const stallFromIdx = protagonistTurnStarts[protagonistTurnStarts.length - 2];
  const stallMsgs = msgs.slice(stallFromIdx);
  const npcSpeakers = new Set(
    stallMsgs
      .filter((line) => !isProtagonistSender(line.sender ?? '', protagonistName))
      .map((line) => line.sender?.trim())
      .filter(Boolean),
  );
  if (npcSpeakers.size > 2) return false;

  const anchorLine = msgs[stallFromIdx];
  const anchorIndex = scriptLines.indexOf(anchorLine);
  if (anchorIndex < 0) return false;

  const hasPlotAdvance = scriptLines
    .slice(anchorIndex)
    .some((line) => line.kind === 'narr' || line.kind === 'scene');
  return !hasPlotAdvance;
}

/** 回合 user prompt：接戏锚点，防止 NPC 幻词反问、各说各话 */
export function buildTurnContinuityPrompt(
  scriptLines: ScriptLine[],
  protagonistName: string,
  userInput: UserTurnInput,
): string {
  const stagnation = detectConfrontationStagnation(scriptLines, protagonistName);
  const thirdForceRule = stagnation
    ? `⑤ 【强制】近 2 轮对峙无变局：本回合须先写 1 行 NARR 引入外部打断（闯入/来电/警报/物件落地/倒计时），再写 MSG:你|，禁止继续原地对骂。`
    : '⑤ NARR 仅在有外部打断或关键新画面时写 1 行；无则省略。';

  const inputBlock = formatUserInputForPrompt(userInput);

  return `【本回合接戏 — 违反则重写】
${inputBlock}
${stagnation ? '⚠ 检测到对峙僵持：本回合必须破局，禁止循环争吵。' : ''}

【反停滞三大铁律 — 本回合全部兑现】
1. 情绪行为化：MSG:你| 以用户台词为主，行为指令写进 NARR 或他人反应，禁止括号旁白。
2. NPC 泄密：首条或次条 NPC 须泄露具体秘密、抛恶毒交易或暴露软肋，禁止只对骂防御。
3. 第三方打断：${stagnation ? '已僵持，NARR 强制写 1 行外部变量打断。' : '若对白将陷入复读，用 NARR 引入局外变量。'}

执行顺序：
① ${stagnation ? 'NARR: 外部打断（1 行）→ ' : ''}MSG:你|… 以用户台词为正文（可极轻微润色），行为指令勿写进括号。
② 首条 NPC 当场接「你」——局势立刻偏移，须含信息增量（秘密/交易/软肋）。
③ ≥1 条 NPC↔NPC 交锋；最后一条 MSG 须制造下一回合输入钩子（新筹码/新危险）。
④ 禁止幻词反问；禁止「你等着」「别逼我」式空转；同回合不重复同一施压角度。
${thirdForceRule}
⑤ 接词须与上方【近期对白】一致，禁止复读。`;
}

/** 私聊回合：承接场景群聊，双人密谈 */
export function buildPrivateTurnContinuityPrompt(
  _privateLines: ScriptLine[],
  _protagonistName: string,
  userInput: UserTurnInput,
  npcName: string,
): string {
  const inputBlock = formatUserInputForPrompt(userInput);

  return `【密谈接戏 — 须与场景群聊连贯】
${inputBlock}
密谈对象：${npcName}
说明：你们暂离群聊中心，但同一场景、同一时刻仍在进行；对白须能接回群聊里的筹码/对峙。

执行顺序：
① MSG:你|… 以用户台词为正文；行为指令体现于措辞或 NARR，勿写括号旁白。
② MSG: ${npcName}|… 1-3 条：更私密、更真实；须给出群聊里听不到的信息、条件或威胁。
③ 禁止 NARR 群戏、禁止第三人、禁止转场；最后一条须让玩家想继续密谈或回群聊出牌。
④ 接词须与上方对话记录一致，禁止复读。`;
}

export function extractSceneText(lines: ScriptLine[]): string | undefined {
  return lines.find((l) => l.kind === 'scene')?.text;
}

/** 若剧本无 SCENE 行，用 GUIDE/元数据中的场景文案补一条系统提示 */
export function ensureSceneLine(
  lines: ScriptLine[],
  sceneText?: string,
): ScriptLine[] {
  if (!sceneText?.trim()) return lines;
  if (lines.some((l) => l.kind === 'scene')) return lines;
  return [{ kind: 'scene', text: sceneText.trim() }, ...lines];
}
