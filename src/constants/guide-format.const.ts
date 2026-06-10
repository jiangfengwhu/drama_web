/** 开场群引导行（与首次 completion 同流输出） */
export const GUIDE_LINE = 'GUIDE:';

export const GUIDE_FIELD = {
  TITLE: 'TITLE',
  SUMMARY: 'SUMMARY',
  SCENE: 'SCENE',
  RELATIONS: 'RELATIONS',
  DETAIL: 'DETAIL',
} as const;

export type GuideFieldKey = (typeof GUIDE_FIELD)[keyof typeof GUIDE_FIELD];

export const GUIDE_LIMITS = {
  title: 20,
  summary: 80,
  scene: 100,
  relations: 200,
  detail: 280,
} as const;
