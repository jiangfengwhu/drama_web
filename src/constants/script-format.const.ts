/** 微信聊天剧本行协议 */
export const SCRIPT_LINE = {
  SCENE: 'SCENE:',
  NARR: 'NARR:',
  MSG: 'MSG:',
  /** @deprecated 兼容旧格式 */
  ROLE: 'ROLE:',
} as const;

export const SCRIPT_FIELD_SEP = '|';

export const SCRIPT_LIMITS = {
  maxSceneChars: 40,
  maxNarrChars: 40,
  maxMsgChars: 72,
  openingMinMsg: 4,
  openingMaxMsg: 8,
  turnMinMsg: 2,
  turnMaxMsg: 5,
} as const;
