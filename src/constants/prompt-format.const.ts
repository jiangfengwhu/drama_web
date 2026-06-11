import { EMOTION_SLIDER_OPTION_COUNT } from './interaction.const';

/** 注入 system prompt 的格式规则（不含样例，避免 one-shot 偏置） */
export function buildPromptFormatBlock(): string {
  return `【协议格式 — 仅规则，无样例】
【硬性格式规则】
1. 每行以协议前缀开头：GUIDE/SCENE/NARR/MSG/MOOD/CARD/COMPLETE，后接英文半角冒号「:」（禁止中文冒号「：」）
2. MSG 唯一合法格式：MSG: 角色名|(微动作/神态) 台词
   - 角色名：2-4 个汉字的真实人名，或「你」指主角；禁止「旁白」「内心」「系统」
   - 竖线必须是半角「|」；微动作必须用中文或英文括号包裹
3. CARD 是情绪滑动条专用：MOOD 之后、COMPLETE 之前，必须恰好连续输出 ${EMOTION_SLIDER_OPTION_COUNT} 行 CARD，每行均以 CARD: 开头，一行一条主角台词，按情绪强度从低到高排列，不可合并、不可省略（禁止仅首行带 CARD: 前缀）
4. 禁止 Markdown（#、*、\`\`\`）、禁止 JSON、禁止编号列表代替协议行
5. 禁止「角色：台词」裸对话行；所有对白必须走 MSG 协议
6. 同一 NPC 姓名本回合与历史回合须保持一致，勿突然改名
7. 群戏：每回合至少 1 条 MSG 为 NPC 对 NPC（接前一位 NPC 或当面交锋），禁止所有 NPC 只对主角独白

【输出前自检 — 缺一项即视为失败】
□ 所有 MSG 均含半角竖线与括号微动作
□ 至少 1 条 NPC↔NPC 对白（开场与每回合均须）
□ 已输出 MOOD 行
□ 已恰好输出 ${EMOTION_SLIDER_OPTION_COUNT} 行 CARD，且七条均绑定本回合刚写完的剧情（见 CARD 协议）
□ 最后一行是 COMPLETE: yes 或 COMPLETE: no
□ 无协议前缀以外的解释性文字`;
}

/** CARD 剧情绑定规则（system + user 共用） */
export function buildCardPlotBindingBlock(): string {
  return `【CARD 剧情绑定 — 必须与当回合 MSG/NARR 同场】
1. 七条 CARD 是「本回合戏写到此刻」主角会出口的台词，不是可复用的万能金句或模板句。
2. 至少 3 条须点名或呼应本回合已出现的 NPC 姓名/称谓、物件、要求、威胁、地点细节。
3. 禁止出现本回合尚未建立的意象（未提及的合同/签字/门/各位/条款等，不得凭空写入 CARD）。
4. 七条同一时空、同一抉择点，情绪从退让递进到决裂，像一条思路的七个切面；禁止七条互不相关。
5. 每条 ≤45 字，只写台词正文；禁止抄用与当前题材无关的商战/豪门/签约套话，除非本回合 MSG 已建立该语境。`;
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

export function buildEmotionCardPromptBlock(protagonistName: string): string {
  const protagonist = protagonistName.trim();
  return `【CARD 协议 — 情绪滑动条 ${EMOTION_SLIDER_OPTION_COUNT} 档】
前端以滑动条呈现：左端退让 → 右端决裂。用户拖动预览台词，选中后作为主角下一回合意图发送。
你必须恰好输出 ${EMOTION_SLIDER_OPTION_COUNT} 行 CARD，每行独立且均以 CARD: 开头（共 ${EMOTION_SLIDER_OPTION_COUNT} 行 CARD:，禁止仅首行带前缀、后续裸行）；按情绪强度严格递增；主角名「${protagonist}」，CARD 中写其将说出口的台词。

${buildCardPlotBindingBlock()}

强度梯度（须全部落在本回合情境内）：
- 第 1 行：体面退让、保留余地
- 第 2-3 行：克制周旋、以理试探
- 第 4 行：不卑不亢、亮出底线
- 第 5-6 行：锋芒渐露、反制施压
- 第 7 行：决裂/摊牌（仍须像此人在此刻会说的话）`;
}
