/** 首页文案：诙谐、有戏感，非功能说明书 */

export const HOME_HERO = {
  eyebrow: '群演？不，你是主角。',
  titleLine1: '让我',
  titleAccent: '演一集',
  subtitle:
    '退婚宴、董事会、前任诈尸——剧本已经写好，缺的是你那一句。滑条选脾气，或者直接打字，看 NPC 怎么接招。',
  cta: '领票 · 上场',
  footnote: '一局到底，演到你满意收工',
} as const;

export const HOME_CHAT_PREVIEW = [
  {
    kind: 'system' as const,
    text: '场次已开 —— 你已被推上主位',
  },
  {
    kind: 'other' as const,
    sender: '林婉',
    text: '这份协议，签也得签，不签也得签。',
  },
  {
    kind: 'other' as const,
    sender: '周启',
    text: '……你终于肯开口了。',
  },
  {
    kind: 'hint' as const,
    text: '这句，你怎么接？',
  },
] as const;

export const HOME_WHISPERS = [
  'NPC 有立场也有记性——你上一句怎么说的，他们记得清清楚楚。',
  '没有 A/B/C 选项：情绪滑条定调，或直接即兴——演砸了也算一种结局。',
  '一张票换一整局：没有章节号，只有你自己选的收场方式。',
] as const;
