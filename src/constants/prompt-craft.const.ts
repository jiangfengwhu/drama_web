import type { AudienceType, StoryConfig, ThemeId } from '../types/story.types';
import { resolveTheme } from './themes';

/** 网文廉价感高频词 — 出现即降格，须主动回避 */
export const BANNED_CHEAP_PHRASES = [
  '你配吗',
  '信不信我',
  '蝼蚁',
  '废物',
  '垃圾',
  '冷哼',
  '邪魅',
  '薄唇',
  '凤眸',
  '倒吸一口凉气',
  '全场震惊',
  '全场哗然',
  '瞬间石化',
  '霸气侧漏',
  '女人/男人，你在玩火',
  '很好，你成功引起了',
  '天凉王破',
  '本少爷',
  '本小姐',
  '叮！',
  '系统奖励',
  '开挂',
  '碾压',
  '秒杀',
  '手撕',
  '白莲花',
  '绿茶',
  '疯批',
  '打脸',
  '逆袭',
  '龙王',
  '战神',
  '赘婿',
] as const;

const UNIVERSAL_CRAFT_BLOCK = `【好文共通法则 — 互动短剧亦适用】
1. 展示而非告知：用具体物件、职业细节、微动作传达地位与情绪，禁止形容词堆砌（「绝美」「尊贵」「恐怖如斯」）。
2. 对白有潜台词：人物很少把真实动机说满；冲突藏在停顿、称谓变化、话题转移里。
3. 每人一种声口：老者惜字、商人绕弯、少年逞强、母亲打岔——同一场戏里说话方式须可辨。
4. 冲突是两难：让主角在「体面/利益/情感/道义」间取舍，而非简单的善恶对峙。
5. 节制即高级：越激烈的场面，台词越短、越冷；暴怒少用感叹号连用，羞辱不用粗鄙堆砌。
6. 命名与场景要落地：人物用常见但好记的中文名；场景写可感的空间（材质、光线、距离），忌空泛「豪门」「顶级」。
7. CARD 台词亦须入戏：七档情绪是同一人物在同一情境下的七种自持/失控方式，不是网文金句摘抄。`;

interface ThemeCraftProfile {
  anchors: string;
  tone: string;
  dialogue: string;
  taboo: string;
}

const THEME_CRAFT: Record<Exclude<ThemeId, 'custom'>, ThemeCraftProfile> = {
  'business-war': {
    anchors:
      '参照阿耐《大江大河》的务实与人性灰度、周梅森《人民的名义》的权力话术、亦舒都市小说的克制冷峻。',
    tone: '资本场像棋局：表面寒暄，底下是条款、股权、人情债。胜在算路，不在吼叫。',
    dialogue:
      '多用行业术语与模糊承诺（「回头聊」「另约」「走流程」）；威胁常包装成「为你好」；地位用座次、敬称、谁先开口体现。',
    taboo: '禁止「吞并资产」「商业帝国」空喊；禁止反派智商下线只为送脸。',
  },
  'urban-system': {
    anchors:
      '参照东野圭吾的规则严谨、刘慈欣对「设定即约束」的尊重；系统应是命运隐喻，不是抽奖机。',
    tone: '都市日常里的异常：规则、倒计时、不可说破的代价。惊奇来自逻辑，不是数值刷屏。',
    dialogue:
      '系统信息若出现，须短、冷、像判决；人物对异象的反应应恐惧或怀疑，而非立刻「赚大了」。',
    taboo: '禁止「叮！恭喜宿主」、禁止属性面板式独白、禁止一键翻盘。',
  },
  'master-descends': {
    anchors:
      '参照古龙：面、留白、短句；王家卫对白：情感大于事件；金庸：人情世故比武功更致命。',
    tone: '高手入城，冲突先发生在礼数与眼色里；真正出手时，往往已经无话。',
    dialogue:
      '句子宜短；问话多于断言；羞辱用「您」字与沉默完成，不用辱骂。',
    taboo: '禁止「一招秒杀全场」叙述；禁止师父名字排比炫耀。',
  },
  'urban-martial': {
    anchors:
      '参照猫腻《庆余年》庙堂与烟火并置、路遥式的底层质感；异能是权力的延伸，不是炫技。',
    tone: '现代都市的暗面：规则与暴力有边界；觉醒者仍受法律、舆论、旧关系束缚。',
    dialogue:
      '能力描写用后果侧写（碎裂的杯沿、停住的秒针），少喊招式名；对话保持现代人说话方式。',
    taboo: '禁止中二称号、禁止「灵气复苏」百科式解说。',
  },
  'suspense-brain': {
    anchors:
      '参照东野圭吾社会派（动机重于诡计）、麦家《暗算》的冷叙述、紫金陈的本土逻辑链。',
    tone: '恐惧来自「规则不可违」与「熟人不可信」；每回合须新增可验证的线索或矛盾。',
    dialogue:
      '人物说一半留一半；用具体细节（时间、号码、第三人的名字）埋钩；禁止神棍式预言。',
    taboo: '禁止无铺垫反转；禁止「幕后黑手竟是他」式廉价揭晓。',
  },
  'rich-family': {
    anchors:
      '参照亦舒：金钱下的人情计算；张爱玲：比喻要冷；流金岁月：阶级差异藏在日常选择里。',
    tone: '家族是旧账：继承、婚姻、丑闻、体面；每个人都被「家」定义，也在反抗定义。',
    dialogue:
      '称谓精确（叔伯、嫡庶、连襟）；冲突常围绕签字、出席、座位、嫁妆；爱怨不说破。',
    taboo: '禁止「千亿资产」「顶级豪门」；禁止当众泼酒扇耳光式狗血。',
  },
  'ceo-romance': {
    anchors:
      '参照亦舒与张爱玲：情感与契约交织；韩剧《秘密森林》式克制； love is negotiation.',
    tone: '权力差制造张力，但尊重与边界仍是高级感的来源；偏宠体现在细节保护，不是宣示主权。',
    dialogue:
      '少「你是我的」；多「合同第几条」「你不必知道」；关心用安排、资源、沉默挡刀来呈现。',
    taboo: '禁止壁咚强迫、禁止「女人/男人你在玩火」、禁止无脑虐恋。',
  },
  'urban-romance': {
    anchors:
      '参照八月长安青春细节、吉本芭娜娜的日常治愈、亦舒都市独立女性语感。',
    tone: '都市是偶遇与误会的容器； romance 在生活方式的碰撞里发生（加班、租房、地铁、雨夜）。',
    dialogue:
      '用具体生活场景切入；表白可失败、可拖延；幽默与自嘲优于 melodrama。',
    taboo: '禁止「霸道总裁强行爱」；禁止为误会而降智。',
  },
  'youth-sweet': {
    anchors:
      '参照八月长安《最好的我们》、森见登美彦的轻喜剧节奏、是枝裕和家庭对话。',
    tone: '青春甜在细小确幸与笨拙真诚；冲突来自前途、面子、家庭期望，不是恶毒女配。',
    dialogue:
      '口语化但干净；互怼要有爱；重要的话往往说得很轻。',
    taboo: '禁止全校/全公司广播式社死；禁止恶毒配角工具人。',
  },
  'rebirth-revenge': {
    anchors:
      '参照《红楼梦》因果与命数、马伯庸历史小说的人物计算、东野圭吾「过去无法撤销」。',
    tone: '重生是第二次读同一本书；复仇靠布局与信息，不靠辱骂；代价与道德灰度须并存。',
    dialogue:
      '已知未来者说话更稳、更晚表态；对手应聪明一步，形成博弈。',
    taboo: '禁止「这一世我要让你们付出代价」宣言式开场；禁止手撕名场面复述。',
  },
  'apocalypse': {
    anchors:
      '参照刘慈欣冷峻宇宙观、科马克·麦卡锡《路》的极简生存、本土「邻里互助/资源伦理」。',
    tone: '末世写「人还能不能保持为人」：水、药、信任比异能更稀缺。',
    dialogue:
      '物资用具体单位（半瓶、三粒、最后一根）；道德困境优先于打怪升级。',
    taboo: '禁止「空间无限囤货」炫耀；禁止称王称霸口嗨。',
  },
  'palace-intrigue': {
    anchors:
      '参照《红楼梦》对话潜台词、马伯庸《长安十二时辰》节奏、古典章回「话里有话」。',
    tone: '礼制即刀：一句话越界便是死罪；胜负在名分、册封、赐物、站队。',
    dialogue:
      '多用敬称、典故、借喻；威胁写成关心；最大冲突常是「请」与「赏」。',
    taboo: '禁止现代网络梗；禁止「本宫打你的脸」直白宫斗词。',
  },
  'ancient-romance': {
    anchors:
      '参照沈从文《边城》意境、余华式冷叙述、李碧华情劫命运、匪我思存情感厚度（节制版）。',
    tone: '乱世里情与义、家与国不能两全；美感来自命运无奈，不是虐恋堆叠。',
    dialogue:
      '古风但不文言腔；情意在物（帕子、信、灯）；分离比相聚更有力。',
    taboo: '禁止「妖女/祸水」标签化；禁止为虐而虐。',
  },
  'ancient-rebirth': {
    anchors:
      '参照马伯庸《长安十二时辰》《显微镜下的大明》历史质感、猫腻权谋、《红楼梦》命数。',
    tone: '重生入史：改命须付代价；庙堂线与生活线并重；蝴蝶效应要合理。',
    dialogue:
      '对历史节点的熟悉体现为避祸、借势，不是背诵史书；古人说话有分寸。',
    taboo: '禁止「朕要诛你九族」模板；禁止现代思维当众宣讲。',
  },
};

const CUSTOM_CRAFT: ThemeCraftProfile = {
  anchors:
    '参照亦舒都市克制、东野圭吾逻辑、马伯庸历史质感、八月长安青春细节——按题材择近而用。',
  tone: '定制主题亦须具体：有明确的时代感、职业感、关系网，忌空泛「逆袭」「甜宠」。',
  dialogue: '每人声口可辨；冲突来自选择与代价，不靠辱骂与喊口号。',
  taboo: '禁止套用任何题材的典型廉价桥段。',
};

function audienceCraftOverlay(audience: AudienceType): string {
  if (audience === 'male') {
    return `【受众倾向 · 男频（高级表达）】
核心爽点来自：信息差、布局落子、尊严在规则内赢回——不是音量与侮辱。
主角宜冷静、有分寸；反派宜聪明、有身份逻辑；胜利宜留后手、有代价。`;
  }
  return `【受众倾向 · 女频（高级表达）】
核心爽点来自：情感边界、自我价值、关系里的选择与拒绝——不是哭闹与撕扯。
重视「未说出口的话」；亲密与伤害都宜克制；HE/BE 皆须情感逻辑自洽。`;
}

function resolveCraftProfile(themeId: ThemeId): ThemeCraftProfile {
  if (themeId === 'custom') return CUSTOM_CRAFT;
  return THEME_CRAFT[themeId];
}

export function buildBannedPhrasesBlock(): string {
  return `【禁用廉价表达 — 命中即重写】
${BANNED_CHEAP_PHRASES.map((p) => `· ${p}`).join('\n')}
以及同类网文模板句（咆哮羞辱、围观震惊、系统提示体、霸总宣告体）。`;
}

export function buildCraftPromptBlock(config: StoryConfig): string {
  const theme = resolveTheme(config);
  const profile = resolveCraftProfile(config.themeId);

  return `${UNIVERSAL_CRAFT_BLOCK}

【本题材文学参照与调性 — ${theme.title}】
${profile.anchors}
氛围：${profile.tone}
对白：${profile.dialogue}
禁忌：${profile.taboo}

${audienceCraftOverlay(config.audience)}

${buildBannedPhrasesBlock()}`;
}
