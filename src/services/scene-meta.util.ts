import type {
  IntExt,
  SceneCutPayload,
  SceneHeadDraft,
  ScenePlacement,
  SceneTimeLabel,
} from '../types/story-scene.types';

const TIME_LABELS: SceneTimeLabel[] = [
  'DAY',
  'NIGHT',
  'DAWN',
  'DUSK',
  'LATER',
  'CONTINUOUS',
  'SAME',
];

const TIME_ZH_MAP: Record<string, SceneTimeLabel> = {
  日: 'DAY',
  白天: 'DAY',
  夜: 'NIGHT',
  夜晚: 'NIGHT',
  凌晨: 'NIGHT',
  晨: 'DAWN',
  黎明: 'DAWN',
  黄昏: 'DUSK',
  傍晚: 'DUSK',
};

function normalizeIntExt(raw: string): IntExt {
  return raw.trim().toUpperCase().startsWith('EXT') ? 'EXT' : 'INT';
}

function parseTimeToken(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (TIME_LABELS.includes(upper as SceneTimeLabel)) return upper;
  return TIME_ZH_MAP[raw.trim()] ?? raw.trim();
}

/** 解析 slugline：INT. 南桥后巷 - 夜 */
export function parseSlugline(slugline: string): ScenePlacement {
  const trimmed = slugline.trim();
  const intExt = normalizeIntExt(trimmed);

  const body = trimmed.replace(/^(INT|EXT)\.?\s*/i, '').trim();
  const dashParts = body.split(/\s*-\s*/);

  if (dashParts.length >= 2) {
    const time = parseTimeToken(dashParts[dashParts.length - 1]);
    const locationPart = dashParts.slice(0, -1).join(' - ').trim();
    const commaParts = locationPart.split(/[,，]/).map((p) => p.trim()).filter(Boolean);
    if (commaParts.length >= 2) {
      return {
        intExt,
        location: commaParts[0],
        subLocation: commaParts.slice(1).join('，'),
        time,
      };
    }
    return { intExt, location: locationPart, time };
  }

  return { intExt, location: body || '未知地点', time: 'NIGHT' };
}

function splitSceneMetaFields(raw: string): string[] {
  return raw.split('|').map((part) => part.trim()).filter(Boolean);
}

/** GUIDE: SCENE_HEAD|slugline（兼容旧格式多余字段，忽略 intro） */
export function parseSceneHeadGuide(value: string): SceneHeadDraft | null {
  const parts = splitSceneMetaFields(value);
  if (parts.length < 1 || !parts[0]?.trim()) return null;

  const slugline = parts[0].trim();

  return {
    slugline,
    placement: parseSlugline(slugline),
    sceneIntro: '',
  };
}

/** META: CUT|slugline */
export function parseSceneCutMeta(raw: string): SceneCutPayload | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^META\s*[：:]\s*CUT\s*[|｜]\s*(.+)$/i);
  if (!match?.[1]) return null;

  const draft = parseSceneHeadGuide(match[1]);
  if (!draft) return null;

  return {
    ...draft,
    closePrevious: true,
  };
}

export function formatSlugline(placement: ScenePlacement): string {
  const loc = placement.subLocation
    ? `${placement.location}, ${placement.subLocation}`
    : placement.location;
  return `${placement.intExt}. ${loc} - ${placement.time}`;
}

export function sceneThreadTitle(draft: SceneHeadDraft): string {
  const loc = draft.placement.subLocation ?? draft.placement.location;
  return loc.length > 12 ? `${loc.slice(0, 11)}…` : loc;
}
