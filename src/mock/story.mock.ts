import type { ScriptLine } from '../types/script.types';
import { getThemeById } from '../constants/themes';
import {
  CONTINUATION_BEATS,
  getRichScenePool,
  personalizeTemplate,
} from './rich-scenes';
import type { RichSceneTemplate } from './rich-scenes';
import { mergeCastEntries, serializeGuideLines } from '../services/guide-text.util';
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

const THEME_TITLE_PREFIX: Partial<Record<ThemeId, string>> = {
  'rich-family': '【豪门】',
  'ceo-romance': '【豪门】',
  'urban-romance': '【都市】',
  'youth-sweet': '【都市】',
  'ancient-rebirth': '【古风】',
  'ancient-romance': '【古风】',
  'palace-intrigue': '【宫斗】',
  'apocalypse': '【末世】',
};

function applyThemeFlavor(
  payload: GeneratedTurnPayload,
  themeId: ThemeId,
): GeneratedTurnPayload {
  if (themeId === 'business-war' || !payload.background) return payload;
  const theme = getThemeById(themeId);
  const prefix = THEME_TITLE_PREFIX[themeId] ?? '';
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
  themeId: ThemeId,
): StoryBackground {
  const theme = getThemeById(themeId);
  const sceneBeat = template.beats[1] ?? template.beats[0] ?? '';
  const sceneNow = `${template.atmosphere}。${sceneBeat.slice(0, 72)}${sceneBeat.length > 72 ? '…' : ''}`;

  const prologue = (template.beats[0] ?? theme.description).slice(0, 96);

  return {
    title: template.title,
    prologue,
    characters: '',
    sceneNow,
    atmosphere: template.atmosphere,
  };
}

function npcCastHint(template: RichSceneTemplate, name: string): string {
  const dlg = template.dialogues.find((d) => d.speaker === name);
  return dlg?.tone ? dlg.tone : '在场关键人物';
}

function castEntryFor(template: RichSceneTemplate, name: string): string {
  return `· ${name}：${npcCastHint(template, name)}`;
}

const GUIDE_CAST_PREFIX = 'GUIDE: CAST|';

function scriptLinesWithProgressiveCast(
  lines: ScriptLine[],
  template: RichSceneTemplate,
): string[] {
  const seen = new Set<string>();
  const rows: string[] = [];

  for (const line of lines) {
    if (line.kind === 'scene') {
      rows.push(`SCENE: ${line.text ?? ''}`);
      continue;
    }
    if (line.kind === 'narr') {
      rows.push(`NARR: ${line.text ?? ''}`);
      continue;
    }
    if (line.kind !== 'msg') continue;

    const sender = line.sender ?? '';
    if (sender && !seen.has(sender)) {
      seen.add(sender);
      rows.push(`${GUIDE_CAST_PREFIX}${castEntryFor(template, sender)}`);
    }
    const action = line.stageDirection ? `(${line.stageDirection}) ` : '';
    rows.push(`MSG: ${sender}|${action}${line.message ?? ''}`);
  }

  return rows;
}

function artisticProtagonistLine(action: string): { stageDirection: string; dialogue: string } {
  const intent = action.trim().slice(0, 48);
  if (intent.length <= 12) {
    return {
      stageDirection: '目光一凛，嘴角微扬',
      dialogue: `行，${intent}。`,
    };
  }
  return {
    stageDirection: '沉吟片刻，抬眼',
    dialogue: `明白了。${intent.slice(0, 36)}${intent.length > 36 ? '…' : ''}`,
  };
}

import { DEFAULT_EMOTION_LINES } from '../constants/prompt-format.const';

function mockEmotionLines(config: StoryConfig, userTurnCount: number): string[] {
  const base: string[] = [...DEFAULT_EMOTION_LINES[config.audience]];
  if (userTurnCount % 2 === 1) {
    base[6] =
      config.audience === 'male'
        ? '你们逼我的，那就别怪我不客气了。'
        : '既然你不仁，就别怪我不义了。';
  }
  return base;
}

export function getMockOpening(config: StoryConfig): GeneratedTurnPayload {
  const pool = getRichScenePool(config.themeId, config.audience);
  const template = personalizeTemplate(pool[0], config.protagonistName);
  const sceneText = templateSceneText(template);
  const openingCards = [...DEFAULT_EMOTION_LINES[config.audience]];

  const narrLine = {
    kind: 'narr' as const,
    text: `${template.atmosphere}。空气里弥漫着紧绷的压迫感，远处隐约传来低沉的雷鸣。`,
  };
  const npcLines = buildNpcOnlyLines(template, config.protagonistName);
  const scriptLines: ScriptLine[] = [
    { kind: 'scene', text: sceneText },
    narrLine,
    ...npcLines,
  ];
  const background = buildMockOpeningBackground(template, config.themeId);

  const guideRaw = serializeGuideLines({
    TITLE: background.title,
    PROLOGUE: background.prologue,
  }).join('\n');

  const bodyLines = scriptLinesWithProgressiveCast(scriptLines, template);
  const castFragments = bodyLines
    .filter((line) => line.startsWith(GUIDE_CAST_PREFIX))
    .map((line) => line.slice(GUIDE_CAST_PREFIX.length));
  const characters = mergeCastEntries('', castFragments.join('\n'));

  return applyThemeFlavor(
    {
      scriptLines,
      scriptRaw: [
        guideRaw,
        ...bodyLines,
        `MOOD: ${template.mood}`,
        ...openingCards.map((card) => `CARD: ${card}`),
        'COMPLETE: no',
      ].join('\n'),
      background: { ...background, characters, sceneNow: sceneText },
      mood: template.mood,
      attitudeCards: openingCards,
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

  const attitudeCards = mockEmotionLines(config, userTurnCount);
  const protagonistLine = artisticProtagonistLine(userAction);

  const scriptLines: ScriptLine[] = [
    {
      kind: 'msg',
      sender: '你',
      message: protagonistLine.dialogue,
      stageDirection: protagonistLine.stageDirection,
    },
    {
      kind: 'narr',
      text: `${beats[0]?.slice(0, 56) ?? '局势正在变化。'} 冷风从门缝灌入，带着金属与雨水的腥气。`,
    },
    ...buildNpcOnlyLines(template, config.protagonistName).slice(0, 4),
  ];

  const isComplete = false;

  return applyThemeFlavor(
    {
      scriptLines,
      scriptRaw: [
        serializeScriptLines(scriptLines),
        `MOOD: ${template.mood}`,
        ...attitudeCards.map((card) => `CARD: ${card}`),
        `COMPLETE: ${isComplete ? 'yes' : 'no'}`,
      ].join('\n'),
      mood: template.mood,
      attitudeCards,
      isComplete,
    },
    config.themeId,
  );
}
