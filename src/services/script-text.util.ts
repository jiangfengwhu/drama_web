import {
  ATTITUDE_CARD_COUNT_MAX,
  ATTITUDE_CARD_COUNT_MIN,
} from '../constants/interaction.const';
import { TURN_HISTORY_LINE_LIMIT } from '../constants/game.const';
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
import type { SceneMood } from '../types/story.types';
import type { StoryTimelineItem } from '../types/story-timeline.types';

const PROTOCOL_TAGS = ['SCENE', 'NARR', 'MSG', 'ROLE'] as const;
type ProtocolTag = (typeof PROTOCOL_TAGS)[number];

export interface TurnMetaSnapshot {
  mood?: SceneMood;
  isComplete?: boolean;
  attitudeCards?: string[];
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

  const cardText = parseCardLine(trimmed);
  if (cardText) return { attitudeCards: [cardText] };

  return null;
}

export function mergeTurnMetaSnapshots(
  base: TurnMetaSnapshot,
  patch: TurnMetaSnapshot,
): TurnMetaSnapshot {
  const attitudeCards =
    patch.attitudeCards !== undefined
      ? [...(base.attitudeCards ?? []), ...patch.attitudeCards]
      : base.attitudeCards;

  return {
    ...base,
    ...patch,
    attitudeCards,
  };
}

function appendAttitudeCard(
  turnMeta: TurnMetaSnapshot,
  text: string,
): TurnMetaSnapshot {
  const trimmed = text.trim();
  if (!trimmed) return turnMeta;
  return mergeTurnMetaSnapshots(turnMeta, { attitudeCards: [trimmed] });
}

function isCardBlockTerminator(trimmed: string): boolean {
  if (/^COMPLETE\s*[：:]/i.test(trimmed)) return true;
  if (matchProtocolTag(normalizeProtocolLine(trimmed))) return true;
  if (parseGuideLine(trimmed)) return true;
  return false;
}

/** 解析 CARD: 情绪滑动条台词行（不进入聊天展示） */
export function parseCardLine(raw: string): string | null {
  const trimmed = raw.trim().replace(/^[-*•]\s*/, '');
  const match = trimmed.match(/^CARD\s*[：:]\s*(.+)$/i);
  return match?.[1]?.trim() || null;
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

export function normalizeAttitudeCards(
  cards: string[] | undefined,
  _audience: 'male' | 'female' = 'male',
): string[] {
  const unique = [...new Set(cards?.map((c) => c.trim()).filter(Boolean) ?? [])];
  if (unique.length <= ATTITUDE_CARD_COUNT_MAX) return unique;

  return Array.from({ length: ATTITUDE_CARD_COUNT_MAX }, (_, i) => {
    const idx = Math.round((i / (ATTITUDE_CARD_COUNT_MAX - 1)) * (unique.length - 1));
    return unique[idx];
  });
}

export function isAttitudeCardCountValid(count: number): boolean {
  return count >= ATTITUDE_CARD_COUNT_MIN && count <= ATTITUDE_CARD_COUNT_MAX;
}

/** 从 MOOD 与 COMPLETE 之间兜底提取 CARD（须先出现 CARD: 行，后续裸行才可续行） */
export function extractAttitudeCardsFromRaw(scriptRaw: string): string[] {
  const rows = scriptRaw.split('\n');
  let afterMood = false;
  let inCardContinuation = false;
  const cards: string[] = [];

  for (const line of rows) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^MOOD\s*[：:]/i.test(trimmed)) {
      afterMood = true;
      inCardContinuation = false;
      continue;
    }
    if (/^COMPLETE\s*[：:]/i.test(trimmed)) break;
    if (!afterMood) continue;

    const cardFromPrefix = parseCardLine(trimmed);
    if (cardFromPrefix) {
      cards.push(cardFromPrefix);
      inCardContinuation = true;
      continue;
    }

    if (inCardContinuation && !isCardBlockTerminator(trimmed)) {
      cards.push(trimmed);
      continue;
    }

    inCardContinuation = false;
  }

  return normalizeAttitudeCards(cards);
}

/** 解析 + 兜底提取态度卡片 */
export function resolveAttitudeCards(
  scriptRaw: string,
  cards?: string[],
): string[] {
  const parsed = normalizeAttitudeCards(cards);
  if (parsed.length > 0) return parsed;
  return extractAttitudeCardsFromRaw(scriptRaw);
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
  /** 仅在一行 CARD: 出现之后，才将后续裸行视为 CARD 续行 */
  let inCardContinuation = false;

  for (const line of parts) {
    const trimmed = line.trim();
    if (!trimmed) {
      pendingGuideField = null;
      continue;
    }

    const guidePart = parseGuideLine(line);
    if (guidePart) {
      inCardContinuation = false;
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
      if (turnMetaPart.mood !== undefined) inCardContinuation = false;
      if (turnMetaPart.attitudeCards?.length) inCardContinuation = true;
      if (turnMetaPart.isComplete !== undefined) inCardContinuation = false;
      continue;
    }

    if (isCardBlockTerminator(trimmed)) {
      inCardContinuation = false;
    }

    if (inCardContinuation && !isCardBlockTerminator(trimmed)) {
      turnMeta = appendAttitudeCard(turnMeta, trimmed);
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
): StoryTimelineItem[] {
  return lines
    .map((line, index) => {
      const id = `tl-${idOffset + index}`;
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

/** 回合 prompt 用：仅保留最近若干行，避免上下文过长挤占 CARD 输出 */
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

function formatMsgLine(line: ScriptLine): string {
  return (line.message ?? '').trim();
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
  userAction: string,
): string {
  const recentMsgs = scriptLines.filter((l) => l.kind === 'msg').slice(-6);
  const lastProtagonist = [...recentMsgs]
    .reverse()
    .find((l) => isProtagonistSender(l.sender ?? '', protagonistName));
  const lastProtagonistLine = lastProtagonist
    ? formatMsgLine(lastProtagonist)
    : '';

  const intent = userAction.trim();
  const stagnation = detectConfrontationStagnation(scriptLines, protagonistName);
  const thirdForceRule = stagnation
    ? `⑤ 【强制】近 2 轮对峙无变局：本回合须先写 1 行 NARR 引入外部打断（闯入/来电/警报/物件落地/倒计时），再写 MSG:你|，禁止继续原地对骂。`
    : '⑤ NARR 仅在有外部打断或关键新画面时写 1 行；无则省略。';
  const recentBlock =
    recentMsgs.length > 0
      ? recentMsgs
          .map((line) => {
            const who = isProtagonistSender(line.sender ?? '', protagonistName)
              ? '你'
              : line.sender;
            return `· ${who}：${formatMsgLine(line)}`;
          })
          .join('\n')
      : '（尚无对白）';

  return `【本回合接戏锚点 — 违反则重写】
用户选中主角意图（态度滑块）：「${intent}」
${lastProtagonistLine ? `主角上一轮：「${lastProtagonistLine}」` : ''}
${stagnation ? '⚠ 检测到对峙僵持：本回合必须破局，禁止循环争吵。' : ''}

【反停滞三大铁律 — 本回合全部兑现】
1. 情绪行为化：MSG:你| 纯台词须让局面偏移（承诺、威胁、揭底、点名物件/时限），禁止纯放狠话与括号旁白。
2. NPC 泄密：首条或次条 NPC 须泄露具体秘密、抛恶毒交易或暴露软肋，禁止只对骂防御。
3. 第三方打断：${stagnation ? '已僵持，NARR 强制写 1 行外部变量打断。' : '若对白将陷入复读，用 NARR 引入局外变量。'}

执行顺序：
① ${stagnation ? 'NARR: 外部打断（1 行）→ ' : ''}MSG:你|… 艺术化上述意图为纯台词，保留核心名词/物件/立场，让玩家从话里脑补动作。
② 首条 NPC 当场接「你」——局势立刻偏移，须含信息增量（秘密/交易/软肋）。
③ ≥1 条 NPC↔NPC 交锋；最后一条 MSG 须制造下一档 CARD 钩子（新筹码/新危险）。
④ 禁止幻词反问；禁止「你等着」「别逼我」式空转；同回合不重复同一施压角度。
${thirdForceRule}

近期对白（接词不得矛盾，禁止复读）：
${recentBlock}`;
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
