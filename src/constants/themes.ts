/**
 * 题材元信息 — 统一从 bibles.json 读取。
 * 改配置请编辑 data/story-bibles/bibles.json（meta + presentation + 创作字段）。
 */
export type { ThemeAudienceTag, ThemeMeta } from '../types/story-theme.types';

export {
  CUSTOM_THEME_OPTION,
  PRESET_THEMES,
  getThemeById,
  listPresetThemes,
  resolveTheme,
  themesForAudience,
} from '../services/story-theme.util';
