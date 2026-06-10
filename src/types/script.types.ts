export type ScriptLineKind = 'scene' | 'narr' | 'msg';

/** 微信消息行：一人一条，仅文字 */
export interface ScriptLine {
  kind: ScriptLineKind;
  text?: string;
  sender?: string;
  message?: string;
}
