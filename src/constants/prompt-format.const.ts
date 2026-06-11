import { EMOTION_SLIDER_OPTION_COUNT } from './interaction.const';
import { GUIDE_FIELD, GUIDE_LINE } from './guide-format.const';
import { META_LINE } from './scene-text.const';
import { SCRIPT_LINE } from './script-format.const';

const EMOTION_CARD_EXAMPLE = `${META_LINE.CARD} ……今天的事，算我失礼。我先走。
${META_LINE.CARD} 给我三分钟，把合同条款讲完，再决定也不迟。
${META_LINE.CARD} 各位都在，我把话放在桌面上：这桩交易，还可以谈。
${META_LINE.CARD} 我不争输赢，但这份签字，今晚不会落在你指定的位置。
${META_LINE.CARD} 你们若坚持这个价，那从明天起，各自守各自的线。
${META_LINE.CARD} 话说到这一步，就不必再留余地了。
${META_LINE.CARD} 门在那边。今晚走出这间的，不会是我。`;

/** 注入 system prompt 的格式样例与自检清单 */
export function buildPromptFormatBlock(isOpening: boolean): string {
  const openingExample = `${GUIDE_LINE} ${GUIDE_FIELD.TITLE}|雨夜退婚
${GUIDE_LINE} ${GUIDE_FIELD.SUMMARY}|订婚宴上，一份股权协议被推到主角面前
${GUIDE_LINE} ${GUIDE_FIELD.SCENE}|凌晨一点，城西会所顶层，订婚宴尚未散场
${GUIDE_LINE} ${GUIDE_FIELD.RELATIONS}|· 林婉：未婚妻，林家实际话事人的侄女
· 周启：林家法务顾问，从不笑
${GUIDE_LINE} ${GUIDE_FIELD.DETAIL}|主角刚回国，尚未在股东名册上露面
${SCRIPT_LINE.SCENE} 城西会所·顶层订婚宴·雨夜
${SCRIPT_LINE.NARR} 香槟塔在冷光里折出细线，窗外雨把霓虹揉成一团，空气里是柑橘香与潮衣料混在一起的味道。
${SCRIPT_LINE.MSG} 林婉|(将文件夹推过大理石台面，声线平稳) 条款你看过，没有异议的话，今晚把字签了。
${SCRIPT_LINE.MSG} 周启|(站在半步之外，目光不落在你脸上) 林小姐还等着。别让她为难。`;

  const turnExample = `${SCRIPT_LINE.NARR} 会场音乐停了半拍，侍应生从侧门鱼贯而入，托盘上的冰已化了一半。
${SCRIPT_LINE.MSG} 你|(把文件夹合上，推回桌心) 这字，今晚不签。
${SCRIPT_LINE.MSG} 林婉|(指尖在杯沿停了一瞬) ……你确定？
${SCRIPT_LINE.MSG} 周启|(终于抬眼) 那明天，就不是这份条款了。`;

  const tailExample = `${META_LINE.MOOD} tension
${EMOTION_CARD_EXAMPLE}
${META_LINE.COMPLETE} no`;

  const example = isOpening
    ? `${openingExample}\n${tailExample}`
    : `${turnExample}\n${tailExample}`;

  return `【格式样例 — 必须逐行模仿，一行一条协议】
${example}

【硬性格式规则】
1. 每行以协议前缀开头：GUIDE/SCENE/NARR/MSG/MOOD/CARD/COMPLETE，后接英文半角冒号「:」（禁止中文冒号「：」）
2. MSG 唯一合法格式：MSG: 角色名|(微动作/神态) 台词
   - 角色名：2-4 个汉字的真实人名，或「你」指主角；禁止「旁白」「内心」「系统」
   - 竖线必须是半角「|」；微动作必须用中文或英文括号包裹
3. CARD 是情绪滑动条专用：MOOD 之后、COMPLETE 之前，必须恰好连续输出 ${EMOTION_SLIDER_OPTION_COUNT} 行 CARD，一行一条主角台词，按情绪强度从低到高排列，不可合并、不可省略
4. 禁止 Markdown（#、*、\`\`\`）、禁止 JSON、禁止编号列表代替协议行
5. 禁止「角色：台词」裸对话行；所有对白必须走 MSG 协议
6. 同一 NPC 姓名本回合与历史回合须保持一致，勿突然改名

【输出前自检 — 缺一项即视为失败】
□ 所有 MSG 均含半角竖线与括号微动作
□ 已输出 MOOD 行
□ 已恰好输出 ${EMOTION_SLIDER_OPTION_COUNT} 行 CARD（第1行退让 → 第${EMOTION_SLIDER_OPTION_COUNT}行决裂）
□ 最后一行是 COMPLETE: yes 或 COMPLETE: no
□ 无协议前缀以外的解释性文字`;
}

/** CARD 兜底：7 档递进台词（左端退让 → 右端决裂） */
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

export function buildEmotionCardPromptBlock(): string {
  return `【CARD 协议 — 情绪滑动条 ${EMOTION_SLIDER_OPTION_COUNT} 档】
前端以滑动条呈现：左端退让 → 右端决裂。用户拖动预览台词，选中后发送。
你必须恰好输出 ${EMOTION_SLIDER_OPTION_COUNT} 行 CARD，按情绪强度严格递增：
- 第 1 行：体面退让、保留余地（仍符合人物身份）
- 第 2-3 行：克制周旋、以理试探
- 第 4 行：不卑不亢、亮出底线
- 第 5-6 行：锋芒渐露、反制施压
- 第 7 行：决裂/摊牌（仍须像「这个人会说的话」，不是网文咆哮）
每行 CARD 只写主角将说出口的台词（≤45 字）；须与当回合情境、身份、题材调性一致，七条连贯递进。`;
}
