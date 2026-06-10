import {
  AVATAR_PALETTES,
  PROTAGONIST_AVATAR,
} from '../constants/avatar-theme.const';

export interface AvatarTheme {
  initial: string;
  gradient: string;
  textColor: string;
  ring: string;
  accent: string;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function avatarInitial(name: string, isProtagonist = false): string {
  if (isProtagonist || name.trim() === '你') return '我';
  const cleaned = name.replace(/[（(].*$/, '').trim();
  return cleaned.slice(0, 1) || '?';
}

export function getAvatarTheme(
  name: string,
  isProtagonist = false,
): AvatarTheme {
  if (isProtagonist || name.trim() === '你') {
    return {
      initial: '我',
      gradient: `linear-gradient(145deg, ${PROTAGONIST_AVATAR.from}, ${PROTAGONIST_AVATAR.to})`,
      textColor: '#f5fff8',
      ring: PROTAGONIST_AVATAR.ring,
      accent: PROTAGONIST_AVATAR.from,
    };
  }

  const normalized = name.replace(/[（(].*$/, '').trim() || name.trim() || '?';
  const palette = AVATAR_PALETTES[hashString(normalized) % AVATAR_PALETTES.length];

  return {
    initial: avatarInitial(name),
    gradient: `linear-gradient(145deg, ${palette.from}, ${palette.to})`,
    textColor: '#ffffff',
    ring: palette.ring,
    accent: palette.from,
  };
}
