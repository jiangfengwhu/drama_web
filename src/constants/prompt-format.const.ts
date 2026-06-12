import { buildCardAdvancementBlock } from './prompt-advancement.const';
import {
  ATTITUDE_CARD_COUNT_MAX,
  ATTITUDE_CARD_COUNT_MIN,
  ATTITUDE_CARD_COUNT_RANGE_LABEL,
} from './interaction.const';

/** MSG 台词打磨 — 动作神态须融进对白，禁止括号旁白 */
export const MSG_DIALOGUE_CRAFT_BLOCK = `【MSG 台词法则 — 纯对白，禁止 stageDirection】
1. 格式：MSG: 角色名|台词正文（竖线后只写台词，禁止「(微动作)」「（神态）」等括号旁白）。
2. 展示即台词：玩家只看气泡内文字；动作、表情、压迫感应由措辞、节奏、称谓、留白让玩家自行脑补。
3. 台词须精心设计：短句、有刀口、每人一种声口；激烈处更短；用具体物件/人名/数字替代空泛形容词。
4. 行为化对白：局势变化须从台词可推知（如「这杯酒我泼了，电话我现在打」而非「(摔杯) 你等着」）。
5. NARR 只写环境/外部打断，不写角色微表情；角色一切表达走 MSG。`;

/** 注入 system prompt 的格式规则（不含样例，避免 one-shot 偏置） */
export function buildPromptFormatBlock(): string {
  return `【协议格式 — 仅规则，无样例】
【硬性格式规则】
1. 每行以协议前缀开头：GUIDE/SCENE/NARR/MSG/MOOD/CARD/COMPLETE，后接英文半角冒号「:」（禁止中文冒号「：」）
2. MSG 唯一合法格式：MSG: 角色名|台词正文
   - 角色名：2-4 个汉字的真实人名，或「你」指主角；禁止「旁白」「内心」「系统」
   - 竖线后只写台词，禁止括号包裹的微动作/神态/旁白
3. CARD 是情绪滑动条专用：MOOD 之后、COMPLETE 之前，连续输出 ${ATTITUDE_CARD_COUNT_RANGE_LABEL} 行 CARD（按本回合张力择条数，见 CARD 协议），每行 CARD: 后为纯台词，按情绪强度从低到高排列，不可合并（禁止仅首行带 CARD: 前缀）
4. 禁止 Markdown（#、*、\`\`\`）、禁止 JSON、禁止编号列表代替协议行
5. 禁止「角色：台词」裸对话行；所有对白必须走 MSG 协议
6. 同一 NPC 姓名本回合与历史回合须保持一致，勿突然改名
7. 群戏：每回合至少 1 条 MSG 为 NPC 对 NPC（接前一位 NPC 或当面交锋），禁止所有 NPC 只对主角独白

${MSG_DIALOGUE_CRAFT_BLOCK}

【输出前自检 — 缺一项即视为失败】
□ 所有 MSG/CARD 均为纯台词，无括号旁白
□ 至少 1 条 NPC↔NPC 对白（开场与每回合均须）
□ 已输出 MOOD 行
□ 已输出 ${ATTITUDE_CARD_COUNT_RANGE_LABEL} 行 CARD，且每条均绑定本回合刚写完的剧情（见 CARD 协议）
□ 最后一行是 COMPLETE: yes 或 COMPLETE: no
□ 无协议前缀以外的解释性文字`;
}

/** CARD 剧情绑定规则（system + user 共用） */
export function buildCardPlotBindingBlock(): string {
  return `【CARD 剧情绑定 — 必须与当回合 MSG/NARR 同场】
1. 各条 CARD 是「本回合戏写到此刻」主角下一步台词意图，不是可复用的万能金句。
2. 纯台词正文：动作与决心须写进措辞（如「字我不签，门我先锁」），禁止括号旁白。
3. 至少 2 条须点名或呼应本回合已出现的 NPC 姓名/称谓、物件、要求、威胁、地点细节。
4. 禁止出现本回合尚未建立的意象（未提及的合同/签字/门/各位/条款等，不得凭空写入 CARD）。
5. 各条同一时空、同一抉择点，情绪从退让递进到决裂；各档破局方向须不同（泄密/交易/掀桌/离场/亮底牌等）。
6. 各档背后须有不同的可感代价；禁止 obvious 赢面档与可循环争吵档。
7. 每条 ≤45 字；禁止「你等着」「别逼我」等空转模板句。`;
}

/** mock 兜底用（不注入 AI prompt） */
export const DEFAULT_EMOTION_LINES = {
  male: [
    '……今天的事，算我失礼。我先走。',
    '给我三分钟，把条款讲完，再决定也不迟。',
    '我不争输赢，但这字，今晚不会落在这里。',
    '价可以谈，线不能越。各位心里有数。',
    '你们若坚持，那从明天起，各走各的路。',
    '话说到这一步，就不必再留余地了。',
    '门在那边。今晚走出这间的，不会是我。',
  ],
  female: [
    '……是我说重了。你先消消气。',
    '让我把话说完，再决定也不迟。',
    '我可以退一步，但请你尊重我的底线。',
    '我不想把场面弄僵，我们各让一步。',
    '你若执意如此，我也不会再委曲求全。',
    '从今天起，我不会再为这件事退让。',
    '你想把话说绝，那我们就按最绝的方式办。',
  ],
} as const;

/** @deprecated 使用 DEFAULT_EMOTION_LINES */
export const DEFAULT_ATTITUDE_CARDS = DEFAULT_EMOTION_LINES;

export function pickDefaultEmotionLines(
  audience: 'male' | 'female',
  count = ATTITUDE_CARD_COUNT_MAX,
): string[] {
  const pool = [...DEFAULT_EMOTION_LINES[audience]];
  const target = Math.max(
    ATTITUDE_CARD_COUNT_MIN,
    Math.min(ATTITUDE_CARD_COUNT_MAX, count),
  );
  if (pool.length <= target) return pool.slice(0, target);

  return Array.from({ length: target }, (_, i) => {
    const idx = Math.round((i / (target - 1)) * (pool.length - 1));
    return pool[idx];
  });
}

export function buildEmotionCardPromptBlock(protagonistName: string): string {
  const protagonist = protagonistName.trim();
  return `【CARD 协议 — 情绪滑动条 ${ATTITUDE_CARD_COUNT_RANGE_LABEL} 档】
前端以滑动条呈现：左端退让 → 右端决裂。用户拖动预览台词，选中后作为主角下一回合意图发送。
你必须输出 ${ATTITUDE_CARD_COUNT_RANGE_LABEL} 行 CARD（每行独立且均以 CARD: 开头），按情绪强度严格递增；主角「${protagonist}」的下一步行动意图。

条数择取（须在本回合内自洽）：
- 3 条：场面较简（退让 → 试探 → 摊牌台词）
- 4 条：标准回合（退让 → 试探 → 亮底 → 决裂）
- 5 条：多人对峙（退让 → 周旋 → 逼交易 → 逼泄密 → 切断退路）

${buildCardPlotBindingBlock()}

${buildCardAdvancementBlock()}

强度须全部落在本回合情境内；CARD 为精心打磨的纯台词，须能驱动下一回合局面变化，禁止套话与纯情绪复读。`;
}
