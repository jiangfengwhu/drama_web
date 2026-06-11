export type ScriptLineKind = 'scene' | 'narr' | 'msg';

/** 角色对白行：一人一句台词，可选括号内微动作/神态 */
export interface ScriptLine {
  kind: ScriptLineKind;
  text?: string;
  sender?: string;
  message?: string;
  stageDirection?: string;
}
