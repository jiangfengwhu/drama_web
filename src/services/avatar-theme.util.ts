import {
  AVATAR_NAME_MAX_LEN,
  AVATAR_PALETTES,
  PROTAGONIST_AVATAR,
} from '../constants/avatar-theme.const';

export interface AvatarTheme {
  label: string;
  gradient: string;
  textColor: string;
  ring: string;
  accent: string;
  bubbleBg: string;
  bubbleBorder: string;
  bubbleDialogue: string;
  bubbleStage: string;
  bubbleStageAccent: string;
  bubbleShadow: string;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** 头像内展示：名字全称，最多四字 */
export function formatAvatarName(name: string, isProtagonist = false): string {
  const cleaned = name
    .replace(/[（(【\[][^）)\]】]*[）)\]】]?/g, '')
    .replace(/\s+/g, '')
    .trim();
  if (!cleaned) return '?';
  if (isProtagonist && cleaned === '你') return '我';
  return cleaned.slice(0, AVATAR_NAME_MAX_LEN);
}

function buildBubbleBg(from: string, to: string): string {
  return `linear-gradient(148deg, ${from} 0%, ${to} 100%)`;
}

function paletteTheme(
  palette: (typeof AVATAR_PALETTES)[number],
  label: string,
): AvatarTheme {
  return {
    label,
    gradient: buildBubbleBg(palette.from, palette.to),
    textColor: '#ffffff',
    ring: palette.ring,
    accent: palette.from,
    bubbleBg: buildBubbleBg(palette.bubbleFrom, palette.bubbleTo),
    bubbleBorder: palette.bubbleBorder,
    bubbleDialogue: palette.bubbleDialogue,
    bubbleStage: palette.bubbleStage,
    bubbleStageAccent: palette.bubbleStageAccent,
    bubbleShadow: palette.bubbleShadow,
  };
}

export function getAvatarTheme(
  name: string,
  isProtagonist = false,
): AvatarTheme {
  const label = formatAvatarName(name, isProtagonist);

  if (isProtagonist || name.trim() === '你') {
    const p = PROTAGONIST_AVATAR;
    return {
      label,
      gradient: buildBubbleBg(p.from, p.to),
      textColor: '#f5fff8',
      ring: p.ring,
      accent: p.from,
      bubbleBg: buildBubbleBg(p.bubbleFrom, p.bubbleTo),
      bubbleBorder: p.bubbleBorder,
      bubbleDialogue: p.bubbleDialogue,
      bubbleStage: p.bubbleStage,
      bubbleStageAccent: p.bubbleStageAccent,
      bubbleShadow: p.bubbleShadow,
    };
  }

  const normalized = name.replace(/[（(].*$/, '').trim() || name.trim() || '?';
  const palette = AVATAR_PALETTES[hashString(normalized) % AVATAR_PALETTES.length];
  return paletteTheme(palette, label);
}

/** @deprecated 使用 formatAvatarName */
export function avatarInitial(name: string, isProtagonist = false): string {
  return formatAvatarName(name, isProtagonist).slice(0, 1);
}
