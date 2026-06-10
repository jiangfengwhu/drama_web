import {
  SCRIPT_FIELD_SEP,
  SCRIPT_LINE,
} from '../constants/script-format.const';
import { VALID_MOODS } from '../constants/scene-text.const';
import {
  appendGuideField,
  isRelationBulletLine,
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
}

const META_PREFIXES = [
  'TITLE:',
  'ATMOSPHERE:',
  'MOOD:',
  'COMPLETE:',
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

  return null;
}

export function mergeTurnMetaSnapshots(
  base: TurnMetaSnapshot,
  patch: TurnMetaSnapshot,
): TurnMetaSnapshot {
  return { ...base, ...patch };
}

function isMetaLine(trimmed: string): boolean {
  const upper = trimmed.toUpperCase();
  return META_PREFIXES.some((p) => upper.startsWith(p));
}

function parseMsgFields(body: string): { sender: string; message: string } | null {
  for (const sep of MSG_FIELD_SEPS) {
    const idx = body.indexOf(sep);
    if (idx <= 0) continue;
    const sender = body.slice(0, idx).trim();
    const message = body.slice(idx + sep.length).trim();
    if (sender && message) return { sender, message };
  }

  const colonMatch = body.match(/^([^：:|\s]{1,16})[：:]\s*(.+)$/);
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

  return { kind: 'msg', sender, message };
}

function parseBareDialogue(trimmed: string): ScriptLine | null {
  if (isMetaLine(trimmed)) return null;

  const bracket = trimmed.match(/^【([^】]{1,16})】\s*(.+)$/);
  if (bracket) {
    return { kind: 'msg', sender: bracket[1].trim(), message: bracket[2].trim() };
  }

  const colon = trimmed.match(/^([^：:\s【】]{1,16})[：:]\s*(.+)$/);
  if (colon) {
    const sender = colon[1].trim();
    const message = colon[2].trim();
    if (sender && message && !/^\d/.test(sender)) {
      return { kind: 'msg', sender, message };
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
  if (!trimmed || /^GUIDE\s*[：:]/i.test(trimmed)) return null;
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
    return parsePartialMsgFields(normalized.slice('MSG:'.length));
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

function parseScriptLine(raw: string): ScriptLine | null {
  const trimmed = raw.trim();
  if (!trimmed || isMetaLine(trimmed)) return null;
  if (parseGuideLine(trimmed)) return null;

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
    return { kind: 'msg', sender: fields.sender, message: fields.message };
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
): field is keyof GuideSnapshot {
  return field === 'RELATIONS' || field === 'DETAIL';
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
      guide = mergeGuideSnapshots(guide, guidePart);
      const field = Object.keys(guidePart)[0] as keyof GuideSnapshot;
      pendingGuideField = isGuideContinuationField(field) ? field : null;
      continue;
    }

    if (
      pendingGuideField === 'RELATIONS' &&
      isRelationBulletLine(trimmed)
    ) {
      guide = appendGuideField(guide, 'RELATIONS', trimmed);
      continue;
    }

    if (pendingGuideField === 'DETAIL') {
      if (
        parseTurnMetaLine(trimmed) ||
        matchProtocolTagLine(trimmed) ||
        parseGuideLine(trimmed)
      ) {
        pendingGuideField = null;
      } else {
        guide = appendGuideField(guide, 'DETAIL', trimmed);
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

  const tailGuide = parsePartialGuideLine(tail);
  if (tailGuide) guide = mergeGuideSnapshots(guide, tailGuide);

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

/** 群公告已展示 SCENE，聊天区不再重复 */
export function stripSceneLines(lines: ScriptLine[]): ScriptLine[] {
  return lines.filter((line) => line.kind !== 'scene');
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
  if (!stripProtagonist) return lines;
  return stripProtagonistMsgs(lines, protagonistName);
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
