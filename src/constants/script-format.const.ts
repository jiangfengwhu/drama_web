/** 短剧剧本行协议（MSG 为角色对白，由前端以对话流展示） */
export const SCRIPT_LINE = {
  SCENE: 'SCENE:',
  NARR: 'NARR:',
  MSG: 'MSG:',
  /** @deprecated 兼容旧格式 */
  ROLE: 'ROLE:',
} as const;

export const SCRIPT_FIELD_SEP = '|';

export const SCRIPT_LINE_META = {
  CARD: 'CARD:',
} as const;

export const SCRIPT_LIMITS = {
  maxSceneChars: 48,
  maxNarrChars: 120,
  maxMsgChars: 96,
  openingMinMsg: 4,
  openingMaxMsg: 8,
  openingMaxNarr: 2,
  turnMinMsg: 3,
  turnMaxMsg: 6,
  turnMaxNarr: 2,
} as const;
