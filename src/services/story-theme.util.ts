import biblesRegistry from '../data/story-bibles/bibles.json';
import type {
  StoryBible,
  StoryBiblePresentation,
  StoryBibleRegistry,
} from '../data/story-bibles/story-bible.types';
import type { AudienceType, StoryConfig, ThemeId } from '../types/story.types';
import type { ThemeAudienceTag, ThemeMeta } from '../types/story-theme.types';
import { deriveCustomStoryTitle } from '../constants/story-theme.const';

const registry = biblesRegistry as StoryBibleRegistry;

const DEFAULT_CUSTOM_GRADIENT =
  'linear-gradient(135deg, #1a1a22 0%, #2a2a38 50%, #0a0a0f 100%)';

const DEFAULT_CUSTOM_IMAGE =
  'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&q=80';

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

function audienceToTag(audience: StoryBible['meta']['audience']): ThemeAudienceTag {
  return audience;
}

function fallbackPresentation(bible: StoryBible): StoryBiblePresentation {
  return {
    description: bible.pitch.slice(0, 120),
    gradient: DEFAULT_CUSTOM_GRADIENT,
    imageUrl: DEFAULT_CUSTOM_IMAGE,
    maleHook: bible.logline,
    femaleHook: bible.logline,
    sortOrder: 999,
  };
}

export function bibleToThemeMeta(bible: StoryBible): ThemeMeta {
  const presentation = bible.presentation ?? fallbackPresentation(bible);
  return {
    id: bible.id,
    title: bible.meta.title,
    subtitle: bible.meta.subtitle,
    description: presentation.description,
    gradient: presentation.gradient,
    imageUrl: presentation.imageUrl,
    maleHook: presentation.maleHook,
    femaleHook: presentation.femaleHook,
    audienceTag: audienceToTag(bible.meta.audience),
    fanqieTag: presentation.fanqieTag,
  };
}

function listPresetBibles(): StoryBible[] {
  return Object.values(registry.themes)
    .filter((bible): bible is StoryBible => Boolean(bible))
    .sort(
      (a, b) =>
        (a.presentation?.sortOrder ?? 999) - (b.presentation?.sortOrder ?? 999),
    );
}

/** 预设题材列表（/create 卡片数据源，来自 bibles.json） */
export function listPresetThemes(): ThemeMeta[] {
  return listPresetBibles().map(bibleToThemeMeta);
}

export function getThemeById(id: ThemeId): ThemeMeta {
  if (id === 'custom') return CUSTOM_THEME_OPTION;
  const bible = registry.themes[id];
  if (!bible) throw new Error(`Unknown theme: ${id}`);
  return bibleToThemeMeta(bible);
}

export function resolveTheme(config: StoryConfig): ThemeMeta {
  if (config.themeId !== 'custom') {
    return getThemeById(config.themeId);
  }

  const description =
    config.customTheme?.description.trim() || CUSTOM_THEME_OPTION.description;
  const title = deriveCustomStoryTitle(description);

  return {
    ...CUSTOM_THEME_OPTION,
    title,
    description,
    subtitle: '自定义 · 专属剧情',
    maleHook: description.slice(0, 80),
    femaleHook: description.slice(0, 80),
  };
}

export function themesForAudience(
  audience: StoryConfig['audience'],
): ThemeMeta[] {
  return listPresetThemes().filter(
    (theme) =>
      theme.audienceTag === 'all' || theme.audienceTag === audience,
  );
}

/** 从所选题材推导受众（UI 不再单独选择，供 AI 写作层使用） */
export function resolveAudienceForConfig(
  config: Pick<StoryConfig, 'themeId'>,
): AudienceType {
  if (config.themeId === 'custom') return 'male';
  const bible = registry.themes[config.themeId];
  if (!bible) return 'male';
  return bible.meta.audience === 'female' ? 'female' : 'male';
}

/** @deprecated 使用 listPresetThemes */
export const PRESET_THEMES = listPresetThemes();

export { registry as storyBibleRegistry };
