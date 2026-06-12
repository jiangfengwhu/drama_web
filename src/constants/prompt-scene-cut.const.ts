/**
 * 电影转场（Scene Cut）导演语法 — 何时 META: CUT，何时留场。
 * 参考经典剪辑逻辑：场 = 同一时空内的连续戏剧动作；转场 = 节拍闭合后的剪辑点。
 */

export const SCENE_CUT_DIRECTOR_GRAMMAR = `【导演转场语法 — 专业剪辑逻辑】
「场」= 同一 slugline（时空单元）内不间断的戏剧动作。转场不是「聊久了就换」，而是本场功能兑现后的剪辑点。

■ 必须 META: CUT 的典型情境（任选其一即应转场）
1. 目标达成/失败（Beat 闭合）：情报到手、交易破裂、当众羞辱完成、秘密揭开、签字/拒签、被驱逐离场。
2. 空间不得不变：追出房间、赴约、被带走、转往新地点见关键人物、从 INT 到 EXT。
3. 时间跳切：同日稍后 / 当夜 / 隔日 — slugline 时间须变（LATER / NIGHT / DAWN / CONTINUOUS 慎用）。
4. 关键不在场人物须物理出现：老板、警察、第三方势力 — 须在其真实位置用新 slugline 开场，禁止同一空间凭空登场。
5. 高潮标点：激烈对峙后的「余波在场外」— 切走廊/电梯/车内/另一房间呈现后果。
6. 并联叙事：A 线结果已出，切 B 线加压（保留信息差，新场须承接筹码）。

■ 应留场（禁止 CUT）的情况
- 同一冲突的节拍未闭合：质问未答、条件未摊、胜负未分。
- 仅为回避对峙而无新 slugline 戏剧任务。
- 私聊 thread 内（私聊禁止 CUT）。

■ 输出格式（群聊 thread 内）
收束本场 1-3 条 MSG → META: CUT|INT/EXT. 地点 - 时间 → SCENE: 新环境一行 → MOOD → COMPLETE
新 slugline 须承接上场筹码/秘密/未了冲突，并给出新局面（新地点、新压力源、新人物或新时限）。`;

export interface SceneCutPromptInput {
  protagonistTurnsInScene: number;
  softCutAfter: number;
  forceCutAfter: number;
  suggestCut: boolean;
  forceCut: boolean;
  stagnation: boolean;
}

export function buildSceneCutPromptBlock(input: SceneCutPromptInput): string {
  const {
    protagonistTurnsInScene,
    softCutAfter,
    forceCutAfter,
    suggestCut,
    forceCut,
    stagnation,
  } = input;

  const counterLine = `【本场进度】主角已在当前 slugline 出手 ${protagonistTurnsInScene} 次（建议 ${softCutAfter} 次后优先考虑 CUT；${forceCutAfter} 次为硬上限）。`;

  if (forceCut) {
    return `${SCENE_CUT_DIRECTOR_GRAMMAR}

${counterLine}

⚠ 【强制转场 — 本回合硬兜底】
当前场次已超时${stagnation ? '且近 2 轮对峙无变局' : ''}。本回合须：
① 用 1-3 条 MSG 收束本场核心节拍（给出明确结果：成败/暴露/决裂/离场之一）；
② 紧接 META: CUT|新 slugline → SCENE: 新环境（均在 MOOD 之前）；
③ 新场须承接未了冲突与已暴露筹码，禁止无因果的空降地点。
禁止继续同一空间原地争执或复读。`;
  }

  if (suggestCut) {
    return `${SCENE_CUT_DIRECTOR_GRAMMAR}

${counterLine}

【建议转场】本场戏量已足${stagnation ? '，且近 2 轮无局面变化' : ''}。若本回合节拍可闭合，优先 META: CUT 换新 slugline；若仍须同场一搏，须用 NARR 引入不可逆外部变量（闯入/时限/证据落地），且下 1-2 回合内必须 CUT。`;
  }

  return `${SCENE_CUT_DIRECTOR_GRAMMAR}

${counterLine}
节拍闭合或出现「空间/时间/新关键人物」需求时，本回合执行 META: CUT，勿拖延。`;
}
