import type { ScriptLine } from '../types/script.types';
import { getThemeById } from '../constants/themes';
import {
  CONTINUATION_BEATS,
  getRichScenePool,
  personalizeTemplate,
} from './rich-scenes';
import type { RichSceneTemplate } from './rich-scenes';
import { serializeGuideLines } from '../services/guide-text.util';
import {
  prepareDisplayScriptLines,
  serializeScriptLines,
} from '../services/script-text.util';
import type {
  GeneratedTurnPayload,
  StoryBackground,
  StoryConfig,
  ThemeId,
} from '../types/story.types';
import { templateSceneText, templateToNpcScript } from './script-builder';

const THEME_TITLE_PREFIX: Record<ThemeId, string> = {
  'business-war': '',
  'rich-family': '【豪门】',
  'urban-romance': '【都市】',
  'ancient-rebirth': '【古风】',
};

function applyThemeFlavor(
  payload: GeneratedTurnPayload,
  themeId: ThemeId,
): GeneratedTurnPayload {
  if (themeId === 'business-war' || !payload.background) return payload;
  const theme = getThemeById(themeId);
  const prefix = THEME_TITLE_PREFIX[themeId];
  return {
    ...payload,
    background: {
      ...payload.background,
      title: `${prefix}${payload.background.title}`,
      atmosphere: `${theme.subtitle} · ${payload.background.atmosphere}`,
    },
  };
}

function buildNpcOnlyLines(
  template: ReturnType<typeof personalizeTemplate>,
  protagonistName: string,
): ScriptLine[] {
  const raw = templateToNpcScript(template, protagonistName);
  return prepareDisplayScriptLines(raw, { stripProtagonist: true, protagonistName });
}

function buildMockOpeningBackground(
  template: RichSceneTemplate,
  config: StoryConfig,
  themeId: ThemeId,
): StoryBackground {
  const theme = getThemeById(themeId);
  const protagonist = config.protagonistName || '你';
  const protagonistLabel = protagonist === '你' ? '你（主角，用户扮演）' : `${protagonist}（主角，用户扮演）`;

  const npcLines = template.presentCharacters
    .filter((c) => !c.includes('{{name}}'))
    .map((name) => {
      const dlg = template.dialogues.find((d) => d.speaker === name);
      const hint = dlg?.tone ? `，${dlg.tone}` : '';
      return `· ${name}：在场关键人物${hint}`;
    });

  const relationships = [
    `· ${protagonistLabel}：${theme.description.slice(0, 36)}…`,
    ...npcLines,
  ].join('\n');

  const sceneBeat = template.beats[1] ?? template.beats[0] ?? '';
  const sceneNow = `${template.atmosphere}。${sceneBeat.slice(0, 72)}${sceneBeat.length > 72 ? '…' : ''}`;

  const detail = [
    theme.description,
    '',
    ...template.beats.slice(0, 4),
  ].join('\n');

  return {
    title: template.title,
    summary: `${theme.title} · ${theme.subtitle}`,
    sceneNow,
    relationships,
    detail: detail.slice(0, 420),
    atmosphere: template.atmosphere,
  };
}

function artisticProtagonistLine(action: string): string {
  const intent = action.trim().slice(0, 48);
  if (intent.length <= 12) {
    return `行，${intent}。`;
  }
  return `明白了。${intent.slice(0, 36)}${intent.length > 36 ? '…' : ''}`;
}

export function getMockOpening(config: StoryConfig): GeneratedTurnPayload {
  const pool = getRichScenePool(config.themeId, config.audience);
  const template = personalizeTemplate(pool[0], config.protagonistName);
  const sceneText = templateSceneText(template);
  const npcLines = buildNpcOnlyLines(template, config.protagonistName);
  const scriptLines: ScriptLine[] = [
    { kind: 'scene', text: sceneText },
    ...npcLines,
  ];
  const background = buildMockOpeningBackground(template, config, config.themeId);

  const guideRaw = serializeGuideLines({
    TITLE: background.title,
    SUMMARY: background.summary,
    SCENE: background.sceneNow,
    RELATIONS: background.relationships,
    DETAIL: background.detail,
  }).join('\n');

  return applyThemeFlavor(
    {
      scriptLines,
      scriptRaw: [
        guideRaw,
        `SCENE: ${sceneText}`,
        ...scriptLines.map((line) => {
          if (line.kind === 'narr') return `NARR: ${line.text ?? ''}`;
          return `MSG: ${line.sender}|${line.message ?? ''}`;
        }),
      ].join('\n'),
      background,
      mood: template.mood,
      isComplete: false,
    },
    config.themeId,
  );
}

export function getMockNpcTurn(
  config: StoryConfig,
  userTurnCount: number,
  userAction: string,
): GeneratedTurnPayload {
  const pool = getRichScenePool(config.themeId, config.audience);
  const template = personalizeTemplate(
    pool[userTurnCount % pool.length],
    config.protagonistName,
  );
  const moodKey = config.audience === 'female' ? 'romance' : 'tension';
  const beats = CONTINUATION_BEATS[moodKey] ?? CONTINUATION_BEATS.default;

  const scriptLines: ScriptLine[] = [
    { kind: 'msg', sender: '你', message: artisticProtagonistLine(userAction) },
    { kind: 'narr', text: beats[0]?.slice(0, 36) ?? '局势正在变化。' },
    ...buildNpcOnlyLines(template, config.protagonistName).slice(0, 4),
  ];

  const minTurns =
    config.length === 'short' ? 5 : config.length === 'medium' ? 10 : 18;
  const isComplete = userTurnCount >= minTurns && userTurnCount % 3 === 0;

  return applyThemeFlavor(
    {
      scriptLines,
      scriptRaw: [
        serializeScriptLines(scriptLines),
        `MOOD: ${template.mood}`,
        `COMPLETE: ${isComplete ? 'yes' : 'no'}`,
      ].join('\n'),
      mood: template.mood,
      isComplete,
    },
    config.themeId,
  );
}
