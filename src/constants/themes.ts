import type { StoryConfig, ThemeId } from '../types/story.types';

export type ThemeAudienceTag = 'male' | 'female' | 'all';

export interface ThemeMeta {
  id: ThemeId;
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
  imageUrl: string;
  maleHook: string;
  femaleHook: string;
  audienceTag: ThemeAudienceTag;
  fanqieTag?: string;
}

const DEFAULT_CUSTOM_GRADIENT =
  'linear-gradient(135deg, #1a1a22 0%, #2a2a38 50%, #0a0a0f 100%)';

const DEFAULT_CUSTOM_IMAGE =
  'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&q=80';

export const PRESET_THEMES: ThemeMeta[] = [
  {
    id: 'business-war',
    title: '商战逆袭',
    subtitle: '资本博弈 · 权力巅峰',
    description:
      '你携重生记忆归来，面对昔日仇敌的围剿。每一次决策，都在改写商业版图。',
    gradient: 'linear-gradient(135deg, #1a1208 0%, #3d2e0a 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
    maleHook: '被挑衅、被围剿——选择如何反击，如何吞并对方资产',
    femaleHook: '商战背后的情感纠葛，误会与救赎交织',
    audienceTag: 'male',
    fanqieTag: '都市日常',
  },
  {
    id: 'urban-system',
    title: '都市脑洞',
    subtitle: '系统流 · 金手指',
    description:
      '意外绑定系统，每完成一次任务就解锁新能力。都市里，你是唯一开挂的人。',
    gradient: 'linear-gradient(135deg, #0a1a18 0%, #1a3d35 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
    maleHook: '极限打压后亮底牌，系统奖励当场翻盘',
    femaleHook: '系统任务里藏着他的秘密，边搞钱边撩人',
    audienceTag: 'male',
    fanqieTag: '都市脑洞',
  },
  {
    id: 'master-descends',
    title: '高手下山',
    subtitle: '师父流 · 无敌开局',
    description:
      '九位师父倾囊相授，你初入都市便卷入豪门纷争。低调？不存在的。',
    gradient: 'linear-gradient(135deg, #1a1408 0%, #2e3d1a 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    maleHook: '被轻视后一招制敌，全场震惊',
    femaleHook: '他表面纨绔，实则为你扫平一切障碍',
    audienceTag: 'male',
    fanqieTag: '高手下山',
  },
  {
    id: 'urban-martial',
    title: '都市高武',
    subtitle: '异能觉醒 · 碾压',
    description:
      '灵气复苏，旧秩序崩塌。你在都市暗面崛起，成为让人闻风丧胆的存在。',
    gradient: 'linear-gradient(135deg, #0a1020 0%, #1a2840 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1559526324-593bc073d938?w=800&q=80',
    maleHook: '实力碾压，规则由我改写',
    femaleHook: '危险世界里，他是唯一护你周全的人',
    audienceTag: 'male',
    fanqieTag: '都市修真',
  },
  {
    id: 'suspense-brain',
    title: '悬疑脑洞',
    subtitle: '规则怪谈 · 破局',
    description:
      '怪事接连发生，每条规则背后都是陷阱。你要在绝境里找到生路。',
    gradient: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1509245853830-6837307a08da?w=800&q=80',
    maleHook: '识破规则漏洞，反杀幕后黑手',
    femaleHook: '步步惊心，信任与背叛只在一念之间',
    audienceTag: 'all',
    fanqieTag: '悬疑脑洞',
  },
  {
    id: 'rich-family',
    title: '豪门恩怨',
    subtitle: '家族秘辛 · 命运抉择',
    description:
      '豪门深似海，你是被遗弃的嫡子/千金。真相揭开之时，谁将执掌家族权柄？',
    gradient: 'linear-gradient(135deg, #1a0a14 0%, #3d1a2e 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    maleHook: '动用最高权力，直接将对手逐出家族',
    femaleHook: '揭开他的内心，改变悲剧结局',
    audienceTag: 'all',
    fanqieTag: '豪门总裁',
  },
  {
    id: 'ceo-romance',
    title: '豪门总裁',
    subtitle: '疯批男主 · 极致偏宠',
    description:
      '一纸契约把你绑在他身边。他对外冷戾，只对你一人失控。',
    gradient: 'linear-gradient(135deg, #1a1020 0%, #3d1a2e 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    maleHook: '商战与情场双线，碾压情敌',
    femaleHook: '被他强势护短，甜到发齁',
    audienceTag: 'female',
    fanqieTag: '豪门总裁',
  },
  {
    id: 'urban-romance',
    title: '都市言情',
    subtitle: '邂逅 · 纠缠 · 救赎',
    description:
      '都市霓虹下，一段始于误会的缘分。你的每个选择，都在改写两人的命运轨迹。',
    gradient: 'linear-gradient(135deg, #1a1020 0%, #2e1a3d 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1514565131-fce0801ecf24?w=800&q=80',
    maleHook: '商战与情场双线并进，碾压情敌',
    femaleHook: '听到他的真实想法，强行达成 HE',
    audienceTag: 'female',
    fanqieTag: '青春甜宠',
  },
  {
    id: 'youth-sweet',
    title: '青春甜宠',
    subtitle: '校园职场 · 双向奔赴',
    description:
      '从校园到职场，欢喜冤家变恋人。每次互怼，都是心动的伏笔。',
    gradient: 'linear-gradient(135deg, #1a1028 0%, #2e1a40 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    maleHook: '公开护短，让全校/全公司知道你在他心上',
    femaleHook: '甜宠日常，误会一秒和解',
    audienceTag: 'female',
    fanqieTag: '青春甜宠',
  },
  {
    id: 'rebirth-revenge',
    title: '重生复仇',
    subtitle: '打脸逆袭 · 清算旧账',
    description:
      '重生回到被害前夜。这一世，你要让所有人付出代价。',
    gradient: 'linear-gradient(135deg, #1a0810 0%, #3d1020 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80',
    maleHook: '布局复仇，一击致命',
    femaleHook: '手撕白莲花，夺回属于自己的一切',
    audienceTag: 'female',
    fanqieTag: '重生复仇',
  },
  {
    id: 'apocalypse',
    title: '末世求生',
    subtitle: '囤货空间 · 灾变求生',
    description:
      '极寒/病毒/天灾降临，你有空间囤货。活下去，并保护你在乎的人。',
    gradient: 'linear-gradient(135deg, #0a1218 0%, #1a2830 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    maleHook: '物资碾压，建立安全区称王',
    femaleHook: '囤货复仇两不误，不再做烂好人',
    audienceTag: 'female',
    fanqieTag: '末世',
  },
  {
    id: 'palace-intrigue',
    title: '宫斗宅斗',
    subtitle: '权谋心计 · 步步为营',
    description:
      '深宫大宅门里，一步错满盘皆输。你要在算计中活到最后。',
    gradient: 'linear-gradient(135deg, #1a1008 0%, #3d2810 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
    maleHook: '权谋博弈，连根拔起敌对势力',
    femaleHook: '以智谋上位，不再任人摆布',
    audienceTag: 'female',
    fanqieTag: '宫斗宅斗',
  },
  {
    id: 'ancient-romance',
    title: '古风世情',
    subtitle: '谍战权谋 · 攀高枝',
    description:
      '乱世宅门，情爱与权谋交织。每个选择都牵动家族命运。',
    gradient: 'linear-gradient(135deg, #1a1408 0%, #2e2410 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&q=80',
    maleHook: '庙堂江湖两线，翻云覆雨',
    femaleHook: '虐恋与救赎，改写既定悲剧',
    audienceTag: 'female',
    fanqieTag: '古风世情',
  },
  {
    id: 'ancient-rebirth',
    title: '古风重生',
    subtitle: '逆转天命 · 改写史书',
    description:
      '重生回到命运转折点。这一次，你要让所有人知道——历史由你书写。',
    gradient: 'linear-gradient(135deg, #1a1408 0%, #2e2410 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
    maleHook: '权谋博弈，将敌对势力连根拔起',
    femaleHook: '宫廷情劫，以真心换他回头',
    audienceTag: 'all',
    fanqieTag: '古风世情',
  },
];

export const CUSTOM_THEME_OPTION: ThemeMeta = {
  id: 'custom',
  title: '自定义主题',
  subtitle: '自由设定 · 专属世界',
  description: '输入你想玩的故事类型、背景与核心冲突，AI 据此构建互动短剧。',
  gradient: DEFAULT_CUSTOM_GRADIENT,
  imageUrl: DEFAULT_CUSTOM_IMAGE,
  maleHook: '按你的脑洞写，爽点你来定',
  femaleHook: '按你的脑洞写，情感线你来定',
  audienceTag: 'all',
};

export function getThemeById(id: ThemeMeta['id']): ThemeMeta {
  if (id === 'custom') return CUSTOM_THEME_OPTION;
  const theme = PRESET_THEMES.find((t) => t.id === id);
  if (!theme) throw new Error(`Unknown theme: ${id}`);
  return theme;
}

export function resolveTheme(config: StoryConfig): ThemeMeta {
  if (config.themeId !== 'custom') {
    return getThemeById(config.themeId);
  }

  const title = config.customTheme?.title.trim() || '自定义故事';
  const description =
    config.customTheme?.description.trim() ||
    '用户定制的主题与世界观，由 AI 展开互动短剧。';

  return {
    ...CUSTOM_THEME_OPTION,
    title,
    description,
    subtitle: '自定义 · 专属剧情',
    maleHook: description.slice(0, 48),
    femaleHook: description.slice(0, 48),
  };
}

export function themesForAudience(
  audience: StoryConfig['audience'],
): ThemeMeta[] {
  return PRESET_THEMES.filter(
    (theme) =>
      theme.audienceTag === 'all' || theme.audienceTag === audience,
  );
}

/** @deprecated 使用 PRESET_THEMES */
export const THEMES = PRESET_THEMES;
