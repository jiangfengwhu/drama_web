/**
 * 一次性脚本：将 themes.ts 中的选题卡片字段写入 bibles.json 的 presentation 块。
 * 运行：node scripts/sync-bible-presentation.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const biblesPath = join(__dirname, '../src/data/story-bibles/bibles.json');

/** 与原先 themes.ts PRESET_THEMES 对齐；后续只改 bibles.json */
const PRESENTATION_BY_ID = {
  'business-war': {
    description:
      '你携重生记忆归来，面对昔日仇敌的围剿。每一次决策，都在改写商业版图。',
    gradient: 'linear-gradient(135deg, #1a1208 0%, #3d2e0a 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
    maleHook: '被挑衅、被围剿——选择如何反击，如何吞并对方资产',
    femaleHook: '商战背后的情感纠葛，误会与救赎交织',
    fanqieTag: '都市日常',
    sortOrder: 10,
  },
  'urban-system': {
    description:
      '意外绑定系统，每完成一次任务就解锁新能力。都市里，你是唯一开挂的人。',
    gradient: 'linear-gradient(135deg, #0a1a18 0%, #1a3d35 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
    maleHook: '极限打压后亮底牌，系统奖励当场翻盘',
    femaleHook: '系统任务里藏着他的秘密，边搞钱边撩人',
    fanqieTag: '都市脑洞',
    sortOrder: 20,
  },
  'master-descends': {
    description:
      '九位师父倾囊相授，你初入都市便卷入豪门纷争。低调？不存在的。',
    gradient: 'linear-gradient(135deg, #1a1408 0%, #2e3d1a 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    maleHook: '被轻视后一招制敌，全场震惊',
    femaleHook: '他表面纨绔，实则为你扫平一切障碍',
    fanqieTag: '高手下山',
    sortOrder: 30,
  },
  'urban-martial': {
    description:
      '灵气复苏，旧秩序崩塌。你在都市暗面崛起，成为让人闻风丧胆的存在。',
    gradient: 'linear-gradient(135deg, #0a1020 0%, #1a2840 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1559526324-593bc073d938?w=800&q=80',
    maleHook: '实力碾压，规则由我改写',
    femaleHook: '危险世界里，他是唯一护你周全的人',
    fanqieTag: '都市修真',
    sortOrder: 40,
  },
  'suspense-brain': {
    description:
      '怪事接连发生，每条规则背后都是陷阱。你要在绝境里找到生路。',
    gradient: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1509245853830-6837307a08da?w=800&q=80',
    maleHook: '识破规则漏洞，反杀幕后黑手',
    femaleHook: '步步惊心，信任与背叛只在一念之间',
    fanqieTag: '悬疑脑洞',
    sortOrder: 50,
  },
  'rich-family': {
    description:
      '豪门深似海，你是被遗弃的嫡子/千金。真相揭开之时，谁将执掌家族权柄？',
    gradient: 'linear-gradient(135deg, #1a0a14 0%, #3d1a2e 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    maleHook: '动用最高权力，直接将对手逐出家族',
    femaleHook: '揭开他的内心，改变悲剧结局',
    fanqieTag: '豪门总裁',
    sortOrder: 60,
  },
  'ceo-romance': {
    description: '一纸契约把你绑在他身边。他对外冷戾，只对你一人失控。',
    gradient: 'linear-gradient(135deg, #1a1020 0%, #3d1a2e 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    maleHook: '商战与情场双线，碾压情敌',
    femaleHook: '被他强势护短，甜到发齁',
    fanqieTag: '豪门总裁',
    sortOrder: 70,
  },
  'urban-romance': {
    description:
      '都市霓虹下，一段始于误会的缘分。你的每个选择，都在改写两人的命运轨迹。',
    gradient: 'linear-gradient(135deg, #1a1020 0%, #2e1a3d 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1514565131-fce0801ecf24?w=800&q=80',
    maleHook: '商战与情场双线并进，碾压情敌',
    femaleHook: '听到他的真实想法，强行达成 HE',
    fanqieTag: '青春甜宠',
    sortOrder: 80,
  },
  'youth-sweet': {
    description:
      '从校园到职场，欢喜冤家变恋人。每次互怼，都是心动的伏笔。',
    gradient: 'linear-gradient(135deg, #1a1028 0%, #2e1a40 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    maleHook: '公开护短，让全校/全公司知道你在他心上',
    femaleHook: '甜宠日常，误会一秒和解',
    fanqieTag: '青春甜宠',
    sortOrder: 90,
  },
  'rebirth-revenge': {
    description: '重生回到被害前夜。这一世，你要让所有人付出代价。',
    gradient: 'linear-gradient(135deg, #1a0810 0%, #3d1020 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80',
    maleHook: '布局复仇，一击致命',
    femaleHook: '手撕白莲花，夺回属于自己的一切',
    fanqieTag: '重生复仇',
    sortOrder: 100,
  },
  'apocalypse': {
    description:
      '极寒/病毒/天灾降临，你有空间囤货。活下去，并保护你在乎的人。',
    gradient: 'linear-gradient(135deg, #0a1218 0%, #1a2830 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    maleHook: '物资碾压，建立安全区称王',
    femaleHook: '囤货复仇两不误，不再做烂好人',
    fanqieTag: '末世',
    sortOrder: 110,
  },
  'palace-intrigue': {
    description: '深宫大宅门里，一步错满盘皆输。你要在算计中活到最后。',
    gradient: 'linear-gradient(135deg, #1a1008 0%, #3d2810 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
    maleHook: '权谋博弈，连根拔起敌对势力',
    femaleHook: '以智谋上位，不再任人摆布',
    fanqieTag: '宫斗宅斗',
    sortOrder: 120,
  },
  'ancient-romance': {
    description: '乱世宅门，情爱与权谋交织。每个选择都牵动家族命运。',
    gradient: 'linear-gradient(135deg, #1a1408 0%, #2e2410 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&q=80',
    maleHook: '庙堂江湖两线，翻云覆雨',
    femaleHook: '虐恋与救赎，改写既定悲剧',
    fanqieTag: '古风世情',
    sortOrder: 130,
  },
  'ancient-rebirth': {
    description:
      '重生回到命运转折点。这一次，你要让所有人知道——历史由你书写。',
    gradient: 'linear-gradient(135deg, #1a1408 0%, #2e2410 50%, #0a0a0f 100%)',
    imageUrl:
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
    maleHook: '权谋博弈，将敌对势力连根拔起',
    femaleHook: '宫廷情劫，以真心换他回头',
    fanqieTag: '古风世情',
    sortOrder: 140,
  },
};

const raw = readFileSync(biblesPath, 'utf8');
const registry = JSON.parse(raw);

registry._doc =
  '互动短剧统一配置：/create 选题卡片 + AI 故事蓝图。修改 themes 下对应 id 即可同时影响选题页与剧情生成。字段说明见 story-bible.types.ts';

let merged = 0;
for (const [id, presentation] of Object.entries(PRESENTATION_BY_ID)) {
  const theme = registry.themes[id];
  if (!theme) {
    console.warn(`skip missing theme: ${id}`);
    continue;
  }
  theme.presentation = presentation;
  merged += 1;
}

writeFileSync(biblesPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
console.log(`merged presentation into ${merged} themes → ${biblesPath}`);
