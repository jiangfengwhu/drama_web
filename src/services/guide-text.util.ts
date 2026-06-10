import { GUIDE_FIELD, GUIDE_LINE } from '../constants/guide-format.const';
import type { StoryBackground } from '../types/story.types';

export type GuideSnapshot = Partial<Record<keyof typeof GUIDE_FIELD, string>>;

function normalizeGuideLine(raw: string): string {
  let line = raw.trim();
  const re = /^GUIDE\s*[：:]\s*/i;
  if (re.test(line)) {
    return `${GUIDE_LINE}${line.replace(re, '').trimStart()}`;
  }
  return line;
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
  const sep = body.indexOf('|');
  if (sep <= 0) return null;

  const fieldRaw = body.slice(0, sep).trim().toUpperCase();
  const value = body.slice(sep + 1);

  switch (fieldRaw) {
    case GUIDE_FIELD.TITLE:
      return { TITLE: value };
    case GUIDE_FIELD.SUMMARY:
      return { SUMMARY: value };
    case GUIDE_FIELD.SCENE:
      return { SCENE: value };
    case GUIDE_FIELD.RELATIONS:
      return { RELATIONS: value };
    case GUIDE_FIELD.DETAIL:
      return { DETAIL: value };
    default:
      return null;
  }
}

export function mergeGuideSnapshots(
  base: GuideSnapshot,
  patch: GuideSnapshot,
): GuideSnapshot {
  return { ...base, ...patch };
}

const RELATION_BULLET_LINE = /^[·•\-]\s+.+/;

export function isRelationBulletLine(line: string): boolean {
  return RELATION_BULLET_LINE.test(line.trim());
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

export function guideToBackground(
  guide: GuideSnapshot,
  base: StoryBackground,
  sceneLineText?: string,
): StoryBackground {
  const sceneNow =
    'SCENE' in guide
      ? (guide.SCENE ?? '')
      : sceneLineText || base.sceneNow;
  return {
    title: guideField(guide, 'TITLE', base.title),
    summary: guideField(guide, 'SUMMARY', base.summary),
    sceneNow,
    relationships: guideField(guide, 'RELATIONS', base.relationships),
    detail: guideField(guide, 'DETAIL', base.detail),
    atmosphere: sceneLineText || guide.SCENE || base.atmosphere,
  };
}

export function mergeBackground(
  base: StoryBackground,
  patch: Partial<StoryBackground>,
): StoryBackground {
  return {
    title: patch.title || base.title,
    summary: patch.summary || base.summary,
    sceneNow: patch.sceneNow || base.sceneNow,
    relationships: patch.relationships || base.relationships,
    detail: patch.detail || base.detail,
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
    rows.push(`${GUIDE_LINE}${field}|${lines[0]}`);
    for (let i = 1; i < lines.length; i += 1) {
      rows.push(lines[i]);
    }
  };

  pushSingle('TITLE', guide.TITLE);
  pushSingle('SUMMARY', guide.SUMMARY);
  pushSingle('SCENE', guide.SCENE);
  pushMultilineField('RELATIONS', guide.RELATIONS);
  pushMultilineField('DETAIL', guide.DETAIL);
  return rows;
}
