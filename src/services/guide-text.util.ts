import { GUIDE_FIELD, GUIDE_LINE } from '../constants/guide-format.const';
import {
  isProtagonistCastName,
  parseRelationLines,
} from './story-brief.util';
import type { StoryBackground } from '../types/story.types';

export type GuideSnapshot = Partial<Record<keyof typeof GUIDE_FIELD, string>>;

function normalizeGuideLine(raw: string): string {
  let line = raw.trim();
  const re = /^GUIDE?\s*[：:]\s*/i;
  if (re.test(line)) {
    return `${GUIDE_LINE}${line.replace(re, '').trimStart()}`;
  }
  return line;
}

function parseGuideBody(body: string): GuideSnapshot | null {
  const pipeIdx = body.indexOf('|');
  if (pipeIdx > 0) {
    const fieldRaw = body.slice(0, pipeIdx).trim().toUpperCase();
    const value = body.slice(pipeIdx + 1);
    const field = resolveGuideField(fieldRaw);
    if (!field) return null;
    return { [field]: value };
  }

  const colonMatch = body.match(/^([A-Z_]+)\s*[：:]\s*(.+)$/i);
  if (!colonMatch?.[2]?.trim()) return null;
  const field = resolveGuideField(colonMatch[1].trim().toUpperCase());
  if (!field) return null;
  return { [field]: colonMatch[2] };
}

function resolveGuideField(fieldRaw: string): keyof GuideSnapshot | null {
  switch (fieldRaw) {
    case GUIDE_FIELD.TITLE:
      return 'TITLE';
    case GUIDE_FIELD.PROLOGUE:
    case 'DETAIL':
    case 'SUMMARY':
      return 'PROLOGUE';
    case GUIDE_FIELD.CAST:
    case 'RELATIONS':
      return 'CAST';
    case GUIDE_FIELD.SCENE_HEAD:
    case 'SCENE_HEAD':
      return 'SCENE_HEAD';
    default:
      return null;
  }
}

/** 解析单行 GUIDE: FIELD|内容（须完整一行且内容非空） */
export function parseGuideLine(raw: string): GuideSnapshot | null {
  const partial = parsePartialGuideLine(raw);
  if (!partial) return null;
  const key = Object.keys(partial)[0] as keyof GuideSnapshot;
  if (!partial[key]?.trim()) return null;
  return partial;
}

/** 解析未换行的 GUIDE 行，支持 FIELD| 后的部分内容 */
export function parsePartialGuideLine(raw: string): GuideSnapshot | null {
  const normalized = normalizeGuideLine(raw.trim());
  if (!normalized.toUpperCase().startsWith(GUIDE_LINE)) return null;

  const body = normalized.slice(GUIDE_LINE.length).trim();
  return parseGuideBody(body);
}

export function mergeGuideSnapshots(
  base: GuideSnapshot,
  patch: GuideSnapshot,
): GuideSnapshot {
  return { ...base, ...patch };
}

export function appendGuideField(
  guide: GuideSnapshot,
  field: keyof GuideSnapshot,
  fragment: string,
): GuideSnapshot {
  const trimmed = fragment.trim();
  if (!trimmed) return guide;
  const prev = guide[field] ?? '';
  const next = prev ? `${prev}\n${trimmed}` : trimmed;
  return mergeGuideSnapshots(guide, { [field]: next });
}

function guideField(
  guide: GuideSnapshot,
  key: keyof GuideSnapshot,
  fallback: string,
): string {
  return key in guide ? (guide[key] ?? '') : fallback;
}

function formatCastRow(name: string, raw: string, item: {
  headline: string;
  description: string;
}): string {
  const trimmedRaw = raw.trim();
  if (trimmedRaw.startsWith('·') || trimmedRaw.startsWith('•') || trimmedRaw.startsWith('-')) {
    return trimmedRaw;
  }
  const detail = [item.headline, item.description].filter(Boolean).join('，');
  return detail ? `· ${name}：${detail}` : `· ${name}`;
}

/** 剔除主角 CAST，并按姓名去重 */
export function sanitizeCastRegistry(
  characters: string,
  protagonistName?: string,
): string {
  const seen = new Set<string>();
  const rows: string[] = [];

  for (const item of parseRelationLines(characters, protagonistName)) {
    const name = item.name.trim();
    if (!name || seen.has(name)) continue;
    if (isProtagonistCastName(name, protagonistName)) continue;
    seen.add(name);
    rows.push(formatCastRow(name, item.raw, item));
  }

  return rows.join('\n');
}

/** 合并 CAST 条目，按姓名去重（保留先登场的描述） */
export function mergeCastEntries(
  base: string,
  patch: string,
  protagonistName?: string,
): string {
  const sanitizedBase = sanitizeCastRegistry(base, protagonistName);
  const patchTrimmed = patch.trim();
  if (!patchTrimmed) return sanitizedBase;

  const knownNames = new Set(
    parseRelationLines(sanitizedBase, protagonistName).map((item) =>
      item.name.trim(),
    ),
  );
  const incoming = parseRelationLines(patchTrimmed, protagonistName);
  const newRows: string[] = [];

  for (const item of incoming) {
    const name = item.name.trim();
    if (!name || knownNames.has(name)) continue;
    if (isProtagonistCastName(name, protagonistName)) continue;
    knownNames.add(name);
    newRows.push(formatCastRow(name, item.raw, item));
  }

  if (newRows.length === 0) return sanitizedBase;
  return sanitizedBase
    ? `${sanitizedBase}\n${newRows.join('\n')}`
    : newRows.join('\n');
}

/** 将流式 GUIDE 快照合并进剧本背景（CAST 追加，不覆盖已有角色） */
export function applyGuideStreamPatch(
  guide: GuideSnapshot,
  base: StoryBackground,
  sceneLineText?: string,
  protagonistName?: string,
): StoryBackground {
  const sceneNow = sceneLineText?.trim() || base.sceneNow;
  const castPatch = guide.CAST?.trim();
  const characters = castPatch
    ? mergeCastEntries(base.characters, castPatch, protagonistName)
    : sanitizeCastRegistry(base.characters, protagonistName);
  return {
    title: guideField(guide, 'TITLE', base.title),
    prologue: guideField(guide, 'PROLOGUE', base.prologue),
    characters,
    sceneNow,
    atmosphere: sceneNow || base.atmosphere,
  };
}

/** @deprecated 使用 applyGuideStreamPatch */
export function guideToBackground(
  guide: GuideSnapshot,
  base: StoryBackground,
  sceneLineText?: string,
): StoryBackground {
  return applyGuideStreamPatch(guide, base, sceneLineText);
}

export function mergeBackground(
  base: StoryBackground,
  patch: Partial<StoryBackground>,
  protagonistName?: string,
): StoryBackground {
  return {
    title: patch.title || base.title,
    prologue: patch.prologue || base.prologue,
    characters: patch.characters
      ? mergeCastEntries(base.characters, patch.characters, protagonistName)
      : sanitizeCastRegistry(base.characters, protagonistName),
    sceneNow: patch.sceneNow || base.sceneNow,
    atmosphere: patch.atmosphere || base.atmosphere,
  };
}

export function serializeGuideLines(guide: GuideSnapshot): string[] {
  const rows: string[] = [];
  const pushSingle = (field: keyof typeof GUIDE_FIELD, value?: string) => {
    if (value?.trim()) rows.push(`${GUIDE_LINE}${field}|${value.trim()}`);
  };
  const pushMultilineField = (
    field: keyof typeof GUIDE_FIELD,
    value?: string,
  ) => {
    if (!value?.trim()) return;
    const lines = value
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    for (const line of lines) {
      rows.push(`${GUIDE_LINE}${field}|${line}`);
    }
  };

  pushSingle('TITLE', guide.TITLE);
  pushMultilineField('PROLOGUE', guide.PROLOGUE);
  pushMultilineField('CAST', guide.CAST);
  return rows;
}

/** CAST 续行：以 · • - 开头的条目 */
export function isRelationBulletLine(line: string): boolean {
  return /^[·•\-]\s*\S/.test(line.trim());
}
