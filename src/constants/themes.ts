import type { ThemeId } from '../types/story.types';

export interface ThemeMeta {
  id: ThemeId;
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
  imageUrl: string;
  maleHook: string;
  femaleHook: string;
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'business-war',
    title: '商战爽文',
    subtitle: '资本博弈 · 权力巅峰',
    description: '你携重生记忆归来，面对昔日仇敌的围剿。每一次决策，都在改写商业版图。',
    gradient: 'linear-gradient(135deg, #1a1208 0%, #3d2e0a 50%, #0a0a0f 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
    maleHook: '被挑衅、被围剿——选择如何反击，如何吞并对方资产',
    femaleHook: '商战背后的情感纠葛，误会与救赎交织',
  },
  {
    id: 'rich-family',
    title: '豪门恩怨',
    subtitle: '家族秘辛 · 命运抉择',
    description: '豪门深似海，你是被遗弃的嫡子/千金。真相揭开之时，谁将执掌家族权柄？',
    gradient: 'linear-gradient(135deg, #1a0a14 0%, #3d1a2e 50%, #0a0a0f 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    maleHook: '动用最高权力，直接将对手逐出家族',
    femaleHook: '揭开他的内心，改变悲剧结局',
  },
  {
    id: 'urban-romance',
    title: '都市言情',
    subtitle: '邂逅 · 纠缠 · 救赎',
    description: '都市霓虹下，一段始于误会的缘分。你的每个选择，都在改写两人的命运轨迹。',
    gradient: 'linear-gradient(135deg, #1a1020 0%, #2e1a3d 50%, #0a0a0f 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801ecf24?w=800&q=80',
    maleHook: '商战与情场双线并进，碾压情敌',
    femaleHook: '听到他的真实想法，强行达成 HE',
  },
  {
    id: 'ancient-rebirth',
    title: '古风重生',
    subtitle: '逆转天命 · 改写史书',
    description: '重生回到命运转折点。这一次，你要让所有人知道——历史由你书写。',
    gradient: 'linear-gradient(135deg, #1a1408 0%, #2e2410 50%, #0a0a0f 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
    maleHook: '权谋博弈，将敌对势力连根拔起',
    femaleHook: '宫廷情劫，以真心换他回头',
  },
];

export function getThemeById(id: ThemeId): ThemeMeta {
  const theme = THEMES.find((t) => t.id === id);
  if (!theme) throw new Error(`Unknown theme: ${id}`);
  return theme;
}
