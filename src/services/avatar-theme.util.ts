import {
  AVATAR_NAME_LINE_CHARS,
  AVATAR_NAME_MAX_LEN,
  AVATAR_NAME_MAX_LINES,
  AVATAR_PALETTES,
  PROTAGONIST_AVATAR,
} from '../constants/avatar-theme.const';

export interface AvatarTheme {
  label: string;
  labelLines: readonly string[];
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
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function normalizeCharacterKey(name: string): string {
  return name.replace(/[（(].*$/, '').replace(/\s+/g, '').trim() || '?';
}

/** 头像内展示：每行最多两字，最多两行 */
export function formatAvatarNameLines(
  name: string,
  isProtagonist = false,
): string[] {
  const cleaned = name
    .replace(/[（(【\[][^）)\]】]*[）)\]】]?/g, '')
    .replace(/\s+/g, '')
    .trim();
  if (!cleaned) return ['?'];
  const display =
    isProtagonist && cleaned === '你' ? '我' : cleaned.slice(0, AVATAR_NAME_MAX_LEN);
  const chars = [...display];
  if (chars.length <= AVATAR_NAME_LINE_CHARS) {
    return [display];
  }

  const lines: string[] = [];
  for (
    let i = 0;
    i < chars.length && lines.length < AVATAR_NAME_MAX_LINES;
    i += AVATAR_NAME_LINE_CHARS
  ) {
    lines.push(chars.slice(i, i + AVATAR_NAME_LINE_CHARS).join(''));
  }
  return lines;
}

export function formatAvatarName(name: string, isProtagonist = false): string {
  return formatAvatarNameLines(name, isProtagonist).join('');
}

function buildAvatarLabel(name: string, isProtagonist: boolean): {
  label: string;
  labelLines: readonly string[];
} {
  const labelLines = formatAvatarNameLines(name, isProtagonist);
  return { label: labelLines.join(''), labelLines };
}

function buildBubbleBg(from: string, to: string): string {
  return `linear-gradient(148deg, ${from} 0%, ${to} 100%)`;
}

function buildProtagonistTheme(name: string, isProtagonist: boolean): AvatarTheme {
  const { label, labelLines } = buildAvatarLabel(name, isProtagonist);
  const p = PROTAGONIST_AVATAR;
  return {
    label,
    labelLines,
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

function paletteTheme(
  palette: (typeof AVATAR_PALETTES)[number],
  name: string,
  isProtagonist: boolean,
): AvatarTheme {
  const { label, labelLines } = buildAvatarLabel(name, isProtagonist);
  return {
    label,
    labelLines,
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

function isProtagonistSpeaker(
  name: string,
  protagonistName: string,
  isProtagonist = false,
): boolean {
  if (isProtagonist) return true;
  const trimmed = name.trim();
  return trimmed === '你' || trimmed === protagonistName.trim();
}

/** 同场角色配色登记：优先为不同 NPC 分配不同色板，减少撞色 */
export class AvatarThemeRegistry {
  private readonly assignments = new Map<string, number>();
  private readonly usedPaletteIndices = new Set<number>();
  private readonly protagonistName: string;

  constructor(protagonistName: string) {
    this.protagonistName = protagonistName;
  }

  registerCast(names: Iterable<string>): this {
    for (const name of names) {
      this.resolveTheme(name);
    }
    return this;
  }

  resolveTheme(name: string, isProtagonist = false): AvatarTheme {
    const isPro = isProtagonistSpeaker(name, this.protagonistName, isProtagonist);

    if (isPro) {
      return buildProtagonistTheme(name, true);
    }

    const key = normalizeCharacterKey(name);
    if (!this.assignments.has(key)) {
      this.assignments.set(key, this.allocatePaletteIndex(key));
    }

    const paletteIndex = this.assignments.get(key)!;
    return paletteTheme(AVATAR_PALETTES[paletteIndex], name, false);
  }

  private allocatePaletteIndex(key: string): number {
    const preferred = hashString(key) % AVATAR_PALETTES.length;
    if (!this.usedPaletteIndices.has(preferred)) {
      this.usedPaletteIndices.add(preferred);
      return preferred;
    }

    for (let offset = 1; offset < AVATAR_PALETTES.length; offset += 1) {
      const index = (preferred + offset) % AVATAR_PALETTES.length;
      if (!this.usedPaletteIndices.has(index)) {
        this.usedPaletteIndices.add(index);
        return index;
      }
    }

    return preferred;
  }
}

export function buildCastThemeRegistry(
  protagonistName: string,
  castNames: string[],
): AvatarThemeRegistry {
  return new AvatarThemeRegistry(protagonistName).registerCast(castNames);
}

export function collectCastNamesInOrder(
  castNames: Iterable<string>,
  protagonistName: string,
): string[] {
  const order: string[] = [];
  const seen = new Set<string>();

  const add = (name: string, isProtagonist = false) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const key = isProtagonistSpeaker(trimmed, protagonistName, isProtagonist)
      ? '__protagonist__'
      : normalizeCharacterKey(trimmed);
    if (seen.has(key)) return;

    seen.add(key);
    order.push(trimmed);
  };

  for (const name of castNames) {
    add(name, name.trim() === protagonistName.trim());
  }

  return order;
}

export function getAvatarTheme(
  name: string,
  isProtagonist = false,
  registry?: AvatarThemeRegistry,
): AvatarTheme {
  if (registry) {
    return registry.resolveTheme(name, isProtagonist);
  }

  if (isProtagonist || name.trim() === '你') {
    return buildProtagonistTheme(name, true);
  }

  const normalized = normalizeCharacterKey(name);
  const palette = AVATAR_PALETTES[hashString(normalized) % AVATAR_PALETTES.length];
  return paletteTheme(palette, name, false);
}

/** @deprecated 使用 formatAvatarName */
export function avatarInitial(name: string, isProtagonist = false): string {
  return formatAvatarName(name, isProtagonist).slice(0, 1);
}
