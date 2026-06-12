export const CUSTOM_THEME_LIMITS = {
  descriptionMin: 10,
  descriptionMax: 5000,
} as const;

export const PROTAGONIST_NAME_LIMITS = {
  min: 2,
  max: 4,
} as const;

/** 从用户设定首行推导故事名（GUIDE TITLE / 展示用） */
export function deriveCustomStoryTitle(brief: string): string {
  const line =
    brief
      .split(/\r?\n/)
      .map((part) => part.trim())
      .find(Boolean) ?? '';
  if (!line) return '自定义故事';
  return line.length <= 20 ? line : `${line.slice(0, 20)}…`;
}
