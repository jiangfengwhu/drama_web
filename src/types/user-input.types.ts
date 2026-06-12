/** 用户单回合输入：台词 + 可选行为指令 */
export interface UserTurnInput {
  /** 原始输入 */
  raw: string;
  /** 台词正文（默认全部文字，已剔除 #() 行为段） */
  dialogue: string;
  /** #(...) / #（...） 中的行为描述 */
  behaviors: string[];
}
