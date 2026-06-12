/** 开场引导行 — 与首次 completion 同流输出 */
export const GUIDE_LINE = 'GUIDE:';

export const GUIDE_FIELD = {
  TITLE: 'TITLE',
  PROLOGUE: 'PROLOGUE',
  /** 电影场景 heading：slugline（环境氛围仅 SCENE: 行） */
  SCENE_HEAD: 'SCENE_HEAD',
  /** 人物介绍：· 名字：身份/关系，换行分隔 */
  CAST: 'CAST',
} as const;

export type GuideFieldKey = (typeof GUIDE_FIELD)[keyof typeof GUIDE_FIELD];

export const GUIDE_LIMITS = {
  title: 24,
  /** 前情提要：一句入戏，禁止背景铺陈 */
  prologue: 56,
  /** 单人 CAST 条目上限（含暗线字段） */
  castPerEntry: 72,
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
