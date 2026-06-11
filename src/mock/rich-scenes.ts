import type {
  DialogueLine,
  SceneMood,
  ThemeId,
} from '../types/story.types';

export interface RichSceneTemplate {
  title: string;
  atmosphere: string;
  beats: string[];
  innerMonologue?: string;
  dialogues: DialogueLine[];
  presentCharacters: string[];
  mood: SceneMood;
  isClimax?: boolean;
}

const IMG: Partial<Record<ThemeId, string[]>> = {
  'business-war': [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
    'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1200&q=80',
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80',
  ],
  'rich-family': [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
  ],
  'urban-romance': [
    'https://images.unsplash.com/photo-1514565131-fce0801ecf24?w=1200&q=80',
    'https://images.unsplash.com/photo-1518199266791-5375a57590fb?w=1200&q=80',
    'https://images.unsplash.com/photo-1496442226666-8d0d0e62e049?w=1200&q=80',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80',
  ],
  'ancient-rebirth': [
    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80',
    'https://images.unsplash.com/photo-1547981609-4e4a4c7a3c3e?w=1200&q=80',
    'https://images.unsplash.com/photo-1528164344705-47542687000d?w=1200&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80',
  ],
};

export function pickSceneImage(themeId: ThemeId, chapterIndex: number): string {
  const list = IMG[themeId] ?? IMG['business-war']!;
  return list[chapterIndex % list.length];
}

export function beatsToNarrative(beats: string[]): string {
  return beats.join('\n\n');
}

/** 男频 · 商战爽文 */
export const MALE_BUSINESS_WAR: RichSceneTemplate[] = [
  {
    title: '董事会：致命十二秒',
    atmosphere: '陆家嘴顶层 · 恒温22℃ · 空气里飘着现磨咖啡与硝烟',
    presentCharacters: ['{{name}}', '赵天豪', '苏晚', '陈律师'],
    mood: 'tension',
    beats: [
      '四十七层的落地窗外，黄浦江像一条缓慢流动的银链。你提前三分钟到场——重生后的习惯，让你比任何人都清楚，今天这十二秒将决定林氏集团的生死。',
      '长桌尽头，赵天豪缓缓解开袖扣，将一份厚达三百页的「独立审计报告」推至桌面中央。纸张与红木碰撞的闷响，像一记闷雷劈进每个人耳膜。',
      '「林总。」他抬眼，唇角挂着恰到好处的遗憾，「根据第三方核查，贵司存在严重财务造假。按交易所规则，明日开盘即触发强制退市。」',
      '会议室骤然死寂。你余光扫过两侧：两位独立董事偏开了视线；你的 CFO 苏晚指节发白，却倔强地与你对视——她在等你的信号。',
      '上一世的此刻，你慌乱反驳，被当场播放的「伪造录音」击溃。赵天豪以「拯救者」姿态低价吞并林氏，而你，在三个月后从顶楼坠落。',
      '这一世，你指尖轻叩桌面三下。那是你与苏晚约定的暗号：「证据已就位，收网吧。」',
    ],
    innerMonologue:
      '心跳稳定在六十二。奇怪吗？面对仇敌，你竟然感到一种近乎冷酷的平静——这是重生者独有的奢侈：你知道他每一步棋的落点。',
    dialogues: [
      { speaker: '赵天豪', text: '林总，签字吧。现在配合，我还可以给你留个体面。', tone: '虚伪的关切' },
      { speaker: '苏晚', text: '（低声）林总，U盘在我这里。随时可以。', tone: '压抑的决然' },
      { speaker: '陈律师', text: '林总，从法律角度，我们仍有48小时申诉窗口……', tone: '谨慎' },
    ],
  },
  {
    title: '午夜围剿：四十八小时倒计时',
    atmosphere: '凌晨2:17 · 交易室蓝光 · 红绿数字疯狂跳动',
    presentCharacters: ['{{name}}', '苏晚', '赵天豪（远端）', '神秘基金代表'],
    mood: 'tension',
    beats: [
      '你的手机在凌晨一点四十七分开始疯狂震动——不是一条，是十七个未接来电，来自三家媒体、两家监管联系人，以及赵天豪的「慰问」。',
      '交易室的大屏上，林氏股价像断了线的风筝。做空报告、离职高管爆料、甚至你大学时期的旧照都被翻出来，编排成一出「人设崩塌」的连续剧。',
      '苏晚把一杯冷掉的美式推到你手边，眼下是明显的青黑：「三家机构联合做空，浮亏已经逼近警戒线。赵天豪那边放话了——48小时内，他要看到您签字。」',
      '你盯着K线图上那个熟悉的锯齿——上一世，就是在这个形态出现后第三小时，你的质押盘被强行平仓。',
      '但这一次，你的私人邮箱里躺着一封未读邮件，发件人代号「Owl」。只有一个附件：赵氏集团海外壳公司股权穿透图，以及……一份开曼群岛法院的冻结申请草稿。',
      '窗外，东方明珠的灯仍亮着。这座从不睡觉的城市从不会为谁的崩溃而停顿。可你知道，真正该失眠的人，不该是你。',
    ],
    innerMonologue:
      '他们以为我在崩溃边缘。很好。猎手最大的弱点，就是误以为自己才是猎人。',
    dialogues: [
      { speaker: '赵天豪', text: '（语音消息）林兄，何必呢？把公司交给我，你仍是副董事长。', tone: '猫戏老鼠' },
      { speaker: '苏晚', text: '林总，备用资金池可以撑36小时。但36小时之后……', tone: '克制的不安' },
      { speaker: '{{name}}', text: '够了。叫上法务、财务、公关——三点开会。', tone: '不容置疑' },
    ],
  },
  {
    title: '终局前夜：签字笔的重量',
    atmosphere: '赵氏总部66层 · 暴雨将至 · 城市在脚下如棋盘',
    presentCharacters: ['{{name}}', '赵天豪', '监管组', '苏晚'],
    mood: 'tension',
    isClimax: true,
    beats: [
      '赵天豪的办公室占据整面南向玻璃。暴雨前的低气压让每个人都呼吸沉重。桌上摆着两份文件：左边是《林氏并购协议》，右边是——你刚刚通过监管渠道提交的《赵氏海外资产冻结令》副本。',
      '他显然还没收到后者的正式通知，仍在用惯常的赢家姿态为你倒茶：「林总，签字吧。这是你最后的机会。」',
      '你注意到他右手无名指无意识地转着那枚百达翡丽——这是他紧张时的老习惯。上一世，你直到死前才读懂这个细节。',
      '门被推开。三名着正装的人沉默入场，胸牌上印着监管机构的标识。赵天豪的笑容僵在脸上，像一张被突然按下暂停键的面具。',
      '苏晚站在你身侧半步，声音清冷却带着压抑了太久的锋芒：「赵总，关于您旗下七家壳公司的资金流向，我们有些问题想请教。」',
      '你拿起签字笔，在并购协议上划了一道横线——不是签名，是划掉。笔锋干脆，像刀。',
    ],
    innerMonologue:
      '这一笔，还的是上一世的债。也是给所有以为林氏可以随便拿捏的人，一记响亮的耳光。',
    dialogues: [
      { speaker: '赵天豪', text: '林总，你……你在做什么？', tone: '强撑的镇定' },
      { speaker: '监管人员', text: '赵先生，请配合调查。部分账户已临时冻结。', tone: '公事公办' },
      { speaker: '{{name}}', text: '商业，讲究的是规则。你教我的。', tone: '冰冷' },
    ],
  },
];

/** 女频 · 商战背景情感线 */
export const FEMALE_BUSINESS_WAR: RichSceneTemplate[] = [
  {
    title: '合同背后的刀锋',
    atmosphere: '深夜办公室 · 只剩一盏台灯 · 玻璃上映着两个人的影子',
    presentCharacters: ['{{name}}', '陆景深', '助理小林'],
    mood: 'sorrow',
    beats: [
      '你把那份厚达八十页的合同翻到最后一页时，手指停在了「收购方：景深资本」几个字上。',
      '陆景深就站在落地窗前，背对你。他的肩线仍然熟悉——宽而稳，像你曾经无数次依靠过的地方。可此刻，那道轮廓只让你感到陌生。',
      '「我以为……」你听见自己的声音发涩，「我以为这是联名项目的框架协议。」',
      '他转过身。灯光从侧面切过他的脸，半明半暗，像你们这段关系里始终说不清的部分。他沉默了两秒，才开口：「{{name}}，你不懂。这是为你好。」',
      '为你好。四个字，轻飘飘的，却像钝刀割肉。你想起三个月前他替你挡下投资人刁难的那个晚上，他也是这样说的——「别怕，我在。」',
      '原来「我在」和「为你好」，可以是两把不同的刀。',
    ],
    innerMonologue:
      '你拼命忍住眼眶发热。苏家已经经不起任何风吹草动了。你不能在他面前崩。至少，不能让他看见。',
    dialogues: [
      { speaker: '陆景深', text: '签了吧。条件是我能给出的最好版本。', tone: '疲惫' },
      { speaker: '{{name}}', text: '最好？还是对你父亲来说，最省事？', tone: '颤抖的锋利' },
      { speaker: '助理小林', text: '（门外）陆总，老宅那边又来电话了……', tone: '打断' },
    ],
  },
  {
    title: '雨夜：门内门外',
    atmosphere: '暴雨 · 老小区楼下 · 霓虹在水洼里碎成一片',
    presentCharacters: ['{{name}}', '陆景深'],
    mood: 'romance',
    beats: [
      '门铃响时，你正把最后一只箱子封好。胶带撕裂的声音在空荡的公寓里格外刺耳——你要搬走了，在合同生效前。',
      '猫眼看出去，陆景深浑身湿透站在门外，没有打伞。他的头发贴在额前，水珠顺着下颌线滑落，像某种不合时宜的脆弱。',
      '你开了门，隔着防盗链。雨气涌进来，混着他身上熟悉的木质香水味。',
      '「那份合同，不是我签的字。」他的嗓音沙哑，像被砂纸磨过，「有人仿了我的签名，用的是旧印鉴。我已经让法务立案了。」',
      '你盯着他的眼睛——那双你曾以为读得懂的眼睛。他向前半步，雨水滴在门槛上：「你信我吗？」',
      '这个问题，比任何收购条款都更难回答。',
    ],
    innerMonologue:
      '你恨自己还在心跳。恨自己在他湿透的睫毛下，仍然想起那个替你挡酒的夜晚。',
    dialogues: [
      { speaker: '陆景深', text: '给我十分钟。只要十分钟。', tone: '近乎恳求' },
      { speaker: '{{name}}', text: '十分钟，能改变什么？', tone: '防备' },
      { speaker: '陆景深', text: '能改变你愿不愿意，再听我讲完一句话。', tone: '认真' },
    ],
  },
  {
    title: '真相：戒指与家族',
    atmosphere: '陆家老宅 · 长桌 · 两代人的对峙',
    presentCharacters: ['{{name}}', '陆景深', '陆父', '苏母'],
    mood: 'romance',
    isClimax: true,
    beats: [
      '陆家老宅的吊灯低垂，把每个人的脸照得过分清晰。陆父坐在主位，指节敲击桌面：「景深，你知道自己在做什么。」',
      '你这才明白，那份伪造合同的背后，是陆家老爷子一手安排的「清场」——苏家没落，你不配进陆家的门。多么老套，又多么有效。',
      '陆景深当着两家人的面，从西装内袋取出一份文件：签名鉴定报告、印鉴挂失记录、以及一段监控——陆父的秘书出入他书房的画面。',
      '他转向你，单膝跪地。不是戏剧化的姿势，而是真实的、带着颤抖的郑重。戒指盒打开，里面是一枚简单的铂金圈，没有钻石，像你第一次说「我不需要那些」时的回答。',
      '「这一次，换我为你对抗整个世界。」他的声音不大，却让整个大厅陷入死寂。',
      '陆父猛然站起，茶杯翻倒。可你已经听不见那些了。你只看见他眼里的光——和雨夜门口，一模一样。',
    ],
    innerMonologue:
      '你想起某个瞬间——情绪最饱满的分支点，人最容易做出选择。可这一刻，你只想听从自己。',
    dialogues: [
      { speaker: '陆父', text: '荒唐！为了一个女人，你要毁掉陆家？', tone: '震怒' },
      { speaker: '陆景深', text: '爸，毁掉陆家的，从来不是她。', tone: '平静' },
      { speaker: '{{name}}', text: '……我需要一个回答。不是戒指，是你。', tone: '哽咽' },
    ],
  },
];

/** 章节延续模板 — 用于超出基础幕数时的动态续写 */
export const CONTINUATION_BEATS: Record<string, string[]> = {
  default: [
    '时间像被谁悄悄拨快。上一幕的选择仍在空气中回荡，而新的变量，已经推开了门。',
    '你注意到周围人的微表情——那些欲言又止、交换眼神、刻意回避的细节。故事从不会因为你做了一个决定就停下来，它只会换一条路，继续逼近。',
    '远处，似乎又有脚步声传来。这一回，来的会是谁？',
  ],
  tension: [
    '压迫感并未消散，反而像潮水退去后的礁石——更多隐藏的棱角露出水面。',
    '你听见自己的呼吸在安静中变得清晰。每一个决策都在缩小你的退路，也在扩大你的可能性。',
    '局面正在收紧。而收紧的尽头，往往是爆发。',
  ],
  romance: [
    '情绪在细节里发酵：一个躲闪的眼神，一次欲触又止的手指，一句说了一半的话。',
    '你比任何时候都更清楚地意识到——这不是旁观者的故事。你是其中一根绷紧的弦。',
    '风从窗缝挤进来，带着雨意或花香。下一幕，心会向哪里倾斜？',
  ],
};

export const MALE_RICH_FAMILY = MALE_BUSINESS_WAR;
export const FEMALE_RICH_FAMILY = FEMALE_BUSINESS_WAR;
export const MALE_URBAN_ROMANCE = MALE_BUSINESS_WAR;
export const FEMALE_URBAN_ROMANCE = FEMALE_BUSINESS_WAR;
export const MALE_ANCIENT_REBIRTH = MALE_BUSINESS_WAR;
export const FEMALE_ANCIENT_REBIRTH = FEMALE_BUSINESS_WAR;

export function getRichScenePool(
  themeId: ThemeId,
  audience: 'male' | 'female',
): RichSceneTemplate[] {
  const key = `${audience}-${themeId}`;
  const map: Record<string, RichSceneTemplate[]> = {
    'male-business-war': MALE_BUSINESS_WAR,
    'female-business-war': FEMALE_BUSINESS_WAR,
    'male-rich-family': MALE_RICH_FAMILY,
    'female-rich-family': FEMALE_RICH_FAMILY,
    'male-urban-romance': MALE_URBAN_ROMANCE,
    'female-urban-romance': FEMALE_URBAN_ROMANCE,
    'male-ancient-rebirth': MALE_ANCIENT_REBIRTH,
    'female-ancient-rebirth': FEMALE_ANCIENT_REBIRTH,
  };
  return map[key] ?? (audience === 'female' ? FEMALE_BUSINESS_WAR : MALE_BUSINESS_WAR);
}

export function personalizeTemplate(
  template: RichSceneTemplate,
  protagonistName: string,
): RichSceneTemplate {
  const replace = (s: string) =>
    s.replace(/\{\{name\}\}/g, protagonistName);

  return {
    ...template,
    beats: template.beats.map(replace),
    innerMonologue: template.innerMonologue
      ? replace(template.innerMonologue)
      : undefined,
    presentCharacters: template.presentCharacters.map(replace),
    dialogues: template.dialogues.map((d) => ({
      ...d,
      speaker: replace(d.speaker),
      text: replace(d.text),
    })),
  };
}
