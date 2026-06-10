/** 首页文案：场景钩子，非功能说明 */

export const HOME_HERO = {
  eyebrow: '有人@了你',
  titleLine1: '这条群聊里，',
  titleAccent: '你是主角',
  subtitle:
    '董事会甩锅、豪门认亲、前任诈尸——消息一条接一条弹出来。你回什么，剧情就往哪里疯。没有选项，只有你敢不敢发出去的那句话。',
  cta: '领入场券 · 进群',
  footnote: '一局到底，直到故事自己收束',
} as const;

export const HOME_CHAT_PREVIEW = [
  {
    kind: 'system' as const,
    text: '你已被拉入「董事会临时群（7）」',
  },
  {
    kind: 'other' as const,
    sender: '赵天豪',
    text: '这份合同，你签也得签，不签也得签。',
  },
  {
    kind: 'other' as const,
    sender: '苏晚',
    text: '……你终于肯回消息了。',
  },
  {
    kind: 'hint' as const,
    text: '你会怎么回？',
  },
] as const;

export const HOME_TEASERS = [
  {
    tag: '男频',
    title: '他们以为你完了',
    line: '你打字：「合同我看过。第7条，违法。」',
    accent: 'gold' as const,
  },
  {
    tag: '女频',
    title: '他在等你的下一句',
    line: '你打字：「那晚的事，你打算装多久？」',
    accent: 'rose' as const,
  },
] as const;

export const HOME_WHISPERS = [
  'NPC 会接话，也会翻脸——你说过的话，他们都记得。',
  '每一次输入都是抉择：忍、怼、装傻、掀桌，后果在气泡里长出来。',
  '一张入场券，换一整局只属于此刻的你——没有章节，只有结局。',
] as const;
