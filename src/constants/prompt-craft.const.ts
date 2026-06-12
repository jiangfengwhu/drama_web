import type { StoryConfig } from '../types/story.types';
import { buildAntiPredictabilityBlock } from './prompt-anti-predictability.const';
import { ANTI_STAGNATION_BLOCK } from './prompt-advancement.const';
import {
  ENGAGEMENT_FIRST_PRINCIPLES_BLOCK,
  OPENING_HOOK_BLOCK,
  TURN_PAYOFF_BLOCK,
  buildAudienceEngagementOverlay,
} from './prompt-engagement.const';

const UNIVERSAL_CRAFT_BLOCK = `【文学底线 — 快而不俗】
1. 展示而非告知：用对白里的物件、称谓、承诺变化呈现地位与情绪，禁止形容词堆砌与括号旁白。
2. 对白有刀口：短句、潜台词、每人一种声口；动作神态让玩家从台词自行脑补，不靠 stageDirection。
3. 冲突是两难：体面/利益/情感/道义，让用户输入时有真实代价感。
4. 命名与场景落地：人名好记、空间可感；忌空泛「豪门」「顶级」。
5. 接戏不墨迹：NPC 先接上一句再推进；禁止幻词反问；群戏须有 NPC↔NPC。
6. 快 ≠ 廉价：禁止咆哮羞辱、围观震惊、系统体、霸总宣告体。`;

/** 注入 system：写作准则（故事蓝图见 Story Bible） */
export const DIALOGUE_CONTINUITY_BLOCK = `【对话连贯铁律 — 每回合 NPC 必守】
1. 先接后推：每条 NPC 须接上一句（主角或 NPC）；接完立刻推进局势，禁止同义复读。
2. 禁幻词反问：不得用「XX？」起句，除非 XX 已在本回合或上一轮对白/NARR 中出现。
3. 群戏非审讯：至少 1 条 MSG 为 NPC↔NPC；禁止人人只对主角喊话。
4. 多人因果链：2 名以上 NPC 时，后句接前句人物或立场，形成交锋；禁止罐头独白。
5. 每回合一个主钩子：至多 1 个新筹码/秘密/威胁，其余对白用于当场施压、拆台、让利或翻脸——不要信息堆砌。
6. 写前自检：首条 NPC 是否接了主角？是否有 NPC↔NPC？最后一条是否让人想立刻输入？`;

export const OPENING_ENSEMBLE_BLOCK = `【开场群戏 — 主角未发言前】
1. 开场 MSG 全部写 NPC，禁止「你」或主角名。
2. 至少 2 名 NPC 对白，其中 ≥1 条 NPC↔NPC；前 2 条内须把核心冲突亮出来。
3. 推荐节奏：A 与 B 当场交锋 → C 插话或把矛头引向主角 → 压力到位，停。
4. 主角应感到「被扔进一场已经在烧的局」，不是排队听训话。`;

export function buildCraftPromptBlock(
  config: StoryConfig,
  isOpening = false,
): string {
  return `${ENGAGEMENT_FIRST_PRINCIPLES_BLOCK}
${isOpening ? `\n${OPENING_HOOK_BLOCK}\n` : `\n${TURN_PAYOFF_BLOCK}\n`}

${buildAntiPredictabilityBlock(isOpening)}
${isOpening ? '' : `\n${ANTI_STAGNATION_BLOCK}\n`}

${UNIVERSAL_CRAFT_BLOCK}

${DIALOGUE_CONTINUITY_BLOCK}
${isOpening ? `\n${OPENING_ENSEMBLE_BLOCK}\n` : ''}
${buildAudienceEngagementOverlay(config.audience)}`;
}
