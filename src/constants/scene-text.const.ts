/** 剧本流内元数据行前缀（MOOD / COMPLETE，不进入聊天展示） */
export const META_LINE = {
  TITLE: 'TITLE:',
  ATMOSPHERE: 'ATMOSPHERE:',
  MOOD: 'MOOD:',
  IMAGE_PROMPT: 'IMAGE_PROMPT:',
  INNER: 'INNER:',
  CHARACTERS: 'CHARACTERS:',
  CLIMAX: 'CLIMAX:',
  SUMMARY: 'SUMMARY:',
  SCENE_NOW: 'SCENE_NOW:',
  RELATIONS: 'RELATIONS:',
  BACKGROUND: 'BACKGROUND:',
  COMPLETE: 'COMPLETE:',
  CARD: 'CARD:',
  DIALOGUE: 'DIALOGUE:',
} as const;

export const VALID_MOODS = [
  'tension',
  'romance',
  'triumph',
  'sorrow',
  'neutral',
] as const;

export const TIMELINE_KIND_LABELS = {
  scene: '场景',
  narration: '旁白',
  role: '角色',
} as const;
