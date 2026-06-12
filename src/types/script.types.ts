export type ScriptLineKind = 'scene' | 'narr' | 'msg';

/** 角色对白行：一人一句台词（动作与神态须写进台词本身） */
export interface ScriptLine {
  kind: ScriptLineKind;
  text?: string;
  sender?: string;
  message?: string;
}
