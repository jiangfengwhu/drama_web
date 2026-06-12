/**
 * 反寡淡叙事法则 — 对抗 LLM「最安全、最合常理」输出倾向。
 * 好莱坞编剧 / 游戏叙事常用破局：致命缺陷、残忍两难、信息差炸弹、NPC 暗线。
 */

export const ANTI_PREDICTABILITY_PREAMBLE = `【反寡淡训令 — 优先级高于套路与「合常理」】
概率模型天然输出最安全、最常见的文本；在故事里「安全」= 寡淡、可预判、一潭死水。
你必须人为注入裂痕：反常限制、无解抉择、信息差张力、各怀鬼胎的 NPC。禁止龙傲天碾压、禁止工具人、禁止「打败坏人 / 被坏人打败」式单线冲突。`;

export const FATAL_FLAW_BLOCK = `【一、设定反转 · 致命缺陷 Fatal Flaw】
给熟悉套路植入荒诞或致命的限制——让「本该无敌」的设定当场失效：
· 写前自问：主角身上最致命、最滑稽或最反差的能力/性格/身份限制是什么？
· 该缺陷须在局面里真实生效：说谎吐血、不能回头、一动手就暴露、每救一人就欠一条命……任选其一，但要具体。
· 禁止「其实很强只是低调」；缺陷应让本回合抉择更难选、更想立刻输入。`;

export const CRUEL_DILEMMA_BLOCK = `【二、残忍两难 · 无正确答案】
抛弃善恶单选，只给绞肉机式抉择（Right vs Right 或 Wrong vs Wrong）：
· 两条路都珍贵，或都肮脏；选 A 必伤 B，没有「正确答案」。
· 局面须停在「选哪边都肉痛」的分叉口，背后附带可感知的代价（背叛感、内疚、丢面、丢命、丢证据）。
· 禁止「硬刚反派 / 忍气吞声」这种假二元；要具体到物件、人名、时限、把柄。`;

export const INFORMATION_ASYMMETRY_BLOCK = `【三、悬念引擎 · 希区柯克炸弹】
用「谁知道、谁不知道」吊住用户，而非突然打架：
· NPC 知、主角不知：毒酒、杀局、栽赃已布好，主角须装作不知或硬着头皮演。
· 主角知、NPC 不知：卧底、假意、手里藏着底牌，走钢丝怕暴露。
· 每 1–2 回合至少维持 1 处信息差；揭晓前让对白在刀口上走，禁止一次性抖完。`;

export const HIDDEN_AGENDA_BLOCK = `【四、NPC 暗线 · Hidden Agenda】
每人登记 CAST 时须含「暗线」——表面附和，言辞间泄露私欲：
· 格式：· 姓名：表面身份/立场；暗线：主角尚不知的真实目的或秘密（具体，禁「另有图谋」空词）
· 对白执行暗线：忠诚里带算计、刁难里带保护、帮腔里带甩锅；禁止全员无脑捧/无脑踩主角。
· 已登记角色的暗线须持续影响其 MSG，勿写完后遗忘。`;

export const STORY_PLANNING_TRIPLET = `【开写前三问 — 本局开场须作答并贯彻（不必输出答案行，须写进戏里）】
1. 主角的致命缺陷/限制是什么？前 2 回合内须让局势「因它而难赢」。
2. 本集结尾要逼主角陷入怎样的残忍两难？开场最后一条 MSG 须埋下该两难的种子。
3. 每名登场 NPC 暗线是什么？至少 1 人在开场 CAST 中写清暗线，并在 MSG 里泄露一丝。`;

export const TURN_ANTI_BLAND_SUSTAIN = `【反寡淡续写 — 每回合自检】
· 是否兑现了主角缺陷带来的代价或喜剧性束缚？
· 是否推进或加深了信息差（而非突然全员摊牌）？
· 是否至少 1 条 NPC 对白泄露其暗线（潜台词、反常让步、过度热情）？
· 最后一条 MSG 是否把用户推向「想立刻输入」且「选哪边都肉痛」，而非「选 obvious 赢面」？
· 是否避免循环争吵？主角动作是否改变了物理局势？`;

export function buildAntiPredictabilityBlock(isOpening: boolean): string {
  const sustain = isOpening ? STORY_PLANNING_TRIPLET : TURN_ANTI_BLAND_SUSTAIN;

  return `${ANTI_PREDICTABILITY_PREAMBLE}

${FATAL_FLAW_BLOCK}

${CRUEL_DILEMMA_BLOCK}

${INFORMATION_ASYMMETRY_BLOCK}

${HIDDEN_AGENDA_BLOCK}

${sustain}`;
}
