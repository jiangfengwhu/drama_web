/** 开场引导行 — 与首次 completion 同流输出 */
export const GUIDE_LINE = 'GUIDE:';

export const GUIDE_FIELD = {
  TITLE: 'TITLE',
  PROLOGUE: 'PROLOGUE',
  /** 人物介绍：· 名字：身份/关系，换行分隔 */
  CAST: 'CAST',
} as const;

export type GuideFieldKey = (typeof GUIDE_FIELD)[keyof typeof GUIDE_FIELD];

export const GUIDE_LIMITS = {
  title: 24,
  /** 前情提要：一两句话，快速入戏 */
  prologue: 96,
  /** 单人 CAST 条目上限 */
  castPerEntry: 48,
  /** @deprecated 开场不再批量输出 */
  cast: 280,
} as const;

/** @deprecated 旧协议字段，解析时兼容 */
export const LEGACY_GUIDE_FIELD = {
  DETAIL: 'DETAIL',
  SUMMARY: 'SUMMARY',
  SCENE: 'SCENE',
  RELATIONS: 'RELATIONS',
} as const;
