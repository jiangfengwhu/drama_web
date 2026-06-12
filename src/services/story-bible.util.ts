import biblesRegistry from '../data/story-bibles/bibles.json';
import type {
  StoryBible,
  StoryBibleRegistry,
} from '../data/story-bibles/story-bible.types';
import type { StoryConfig, ThemeId } from '../types/story.types';
import { deriveCustomStoryTitle } from '../constants/story-theme.const';
import { resolveTheme } from './story-theme.util';

const registry = biblesRegistry as StoryBibleRegistry;

const DEFAULT_CUSTOM_GRADIENT =
  'linear-gradient(135deg, #1a1a22 0%, #2a2a38 50%, #0a0a0f 100%)';

const DEFAULT_CUSTOM_IMAGE =
  'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&q=80';

export function getStoryBible(themeId: ThemeId): StoryBible | undefined {
  if (themeId === 'custom') return undefined;
  return registry.themes[themeId];
}

/** 自定义主题：由用户输入即时生成最小可行 Story Bible */
export function buildCustomStoryBible(config: StoryConfig): StoryBible {
  const userBrief =
    config.customTheme?.description.trim() ||
    resolveTheme(config).description;
  const userTitle = deriveCustomStoryTitle(userBrief);

  return {
    id: 'custom',
    version: 'custom-runtime',
    meta: {
      title: userTitle,
      subtitle: '用户定制',
      genre: ['定制互动短剧'],
      audience: config.audience === 'male' ? 'male' : 'female',
      trendTags: ['用户原创设定'],
      referenceWorks: ['按用户描述展开，忌套用模板'],
    },
    presentation: {
      description: userBrief.slice(0, 120),
      gradient: DEFAULT_CUSTOM_GRADIENT,
      imageUrl: DEFAULT_CUSTOM_IMAGE,
      maleHook: userBrief.slice(0, 80),
      femaleHook: userBrief.slice(0, 80),
      sortOrder: 9999,
    },
    logline: userBrief.slice(0, 120),
    pitch: userBrief,
    coreThemes: ['用户定义的核心矛盾须全程贯穿', '每个选择须有可见代价'],
    toneAndStyle: {
      narrativeVoice: '展示而非告知；对白有刀口，少形容词堆砌。',
      pacing: '30 秒内抓住用户；每回合局面必须变化。',
      emotionalRegister:
        config.audience === 'male'
          ? '爽在算路、反击、底牌亮出；忌空吼。'
          : '情在抉择、误会与救赎；忌工业糖精。',
    },
    storyWorld: {
      era: '由用户描述推断，须具体可感',
      setting: userBrief,
      socialRules: ['设定一旦建立须自洽', '忌中途无理由改世界观'],
      keyLocations: ['开场须给出可拍的具体空间'],
    },
    protagonist: {
      archetype: `玩家扮演：${config.protagonistName.trim()}`,
      fatalFlaw: '开场或 PROLOGUE 须暗示一项致命缺陷/限制',
      desire: '由用户主题推导：主角最想要什么',
      stakes: '失败会失去什么：须具体（人/钱/名/命）',
      arc: '从被动卷入 → 主动破局 → 承担代价后的成长或坠落',
    },
    antagonistForces: [
      {
        label: '主要对立面',
        motivation: '从用户描述中推导，须具体',
        tactics: '施压、交易、信息差、舆论或制度',
      },
    ],
    coreConflicts: [userBrief, '公开冲突与私密信息差可并用'],
    informationGap: '至少保留一条观众/主角尚未完全知晓的秘密，逐回合揭露。',
    hookMechanics: {
      openingMustEstablish: [
        '核心矛盾已在燃烧',
        '主角一项缺陷/限制',
        '至少 1 处信息差炸弹',
      ],
      perTurnPayoff: [
        '用户输入须在本回合 MSG 中得到回应',
        '每回合一个新筹码/危险/秘密',
      ],
      climaxSignals: ['主要矛盾摊牌', '秘密总爆发', '不可逆选择'],
      endingCriteria: ['主线冲突闭环', '情感线有落点', '无悬空核心矛盾'],
    },
    storyArc: {
      act1: '入局：建立世界、关系网、首波压力',
      act2: '升级：秘密泄露、联盟重组、代价升高',
      act3: '摊牌：公开对决或情感/利益终极抉择',
      finale: '胜/败/和解须有具体结果，不是「以后再说」',
    },
    beatRoadmap: [
      {
        stage: '开场',
        dramaticGoal: '让用户想立刻输入',
        sceneExamples: ['INT. 具体地点 - 时间'],
      },
      {
        stage: '中段',
        dramaticGoal: '局面偏移、信息增量',
        sceneExamples: ['INT/EXT. 转场后的新压力场'],
      },
      {
        stage: '收束',
        dramaticGoal: '核心矛盾闭环',
        sceneExamples: ['INT. 决战/对质空间 - 时间'],
      },
    ],
    dialogueCraft: {
      voiceNotes: '每人一种声口；短句、潜台词；NPC↔NPC 须有交锋。',
      taboo: '禁止廉价咆哮、围观震惊、未接上文的概念反问。',
    },
  };
}

export function resolveStoryBible(config: StoryConfig): StoryBible {
  const preset = getStoryBible(config.themeId);
  if (preset) return preset;
  return buildCustomStoryBible(config);
}

function formatList(items: string[], prefix = '· '): string {
  return items.map((item) => `${prefix}${item}`).join('\n');
}

/** 将 Story Bible 格式化为系统提示词块 */
export function formatStoryBibleForPrompt(
  bible: StoryBible,
  protagonistName: string,
): string {
  const antagonists = bible.antagonistForces
    .map(
      (a) =>
        `  - ${a.label}：动机「${a.motivation}」；手段「${a.tactics}」`,
    )
    .join('\n');

  const beats = bible.beatRoadmap
    .map(
      (b) =>
        `  · ${b.stage}｜${b.dramaticGoal}\n    例：${b.sceneExamples.join(' / ')}`,
    )
    .join('\n');

  return `【故事蓝图 — ${bible.meta.title}】

▎一句话梗概
${bible.logline}

▎类型与市场锚点
题材：${bible.meta.genre.join(' · ')}｜受众：${bible.meta.audience}
爆款元素：${bible.meta.trendTags.join('、')}
参照气质：${bible.meta.referenceWorks.join('、')}

▎故事前提（Pitch）
${bible.id === 'custom' ? '【用户原创设定 — 须严格遵循】\n' : ''}${bible.pitch}

▎核心主题
${formatList(bible.coreThemes)}

▎调性 · 节奏 · 情感
叙事：${bible.toneAndStyle.narrativeVoice}
节奏：${bible.toneAndStyle.pacing}
情感：${bible.toneAndStyle.emotionalRegister}

▎故事世界
时代/背景：${bible.storyWorld.era}
空间：${bible.storyWorld.setting}
规则：
${formatList(bible.storyWorld.socialRules, '  · ')}
关键场景：
${formatList(bible.storyWorld.keyLocations, '  · ')}

▎主角（玩家扮演「${protagonistName.trim()}」）
原型：${bible.protagonist.archetype}
致命缺陷：${bible.protagonist.fatalFlaw}
核心欲望：${bible.protagonist.desire}
赌注：${bible.protagonist.stakes}
人物弧：${bible.protagonist.arc}

▎对立面
${antagonists}

▎核心冲突与信息差
${formatList(bible.coreConflicts)}
信息差：${bible.informationGap}

▎三幕弧光
第一幕：${bible.storyArc.act1}
第二幕：${bible.storyArc.act2}
第三幕：${bible.storyArc.act3}
终局：${bible.storyArc.finale}

▎节拍路线图
${beats}

▎钩子与完结标准
开场必须建立：
${formatList(bible.hookMechanics.openingMustEstablish, '  · ')}
每回合须兑现：
${formatList(bible.hookMechanics.perTurnPayoff, '  · ')}
高潮信号：
${formatList(bible.hookMechanics.climaxSignals, '  · ')}
完结标准：
${formatList(bible.hookMechanics.endingCriteria, '  · ')}

▎对白工艺
${bible.dialogueCraft.voiceNotes}
禁忌：${bible.dialogueCraft.taboo}`;
}

export function buildStoryBiblePromptBlock(config: StoryConfig): string {
  const bible = resolveStoryBible(config);
  return formatStoryBibleForPrompt(bible, config.protagonistName);
}
