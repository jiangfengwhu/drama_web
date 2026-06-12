import type { UserTurnInput } from '../types/user-input.types';

const ACTION_EN = /#\(([^)]*)\)/g;
const ACTION_ZH = /#（([^）]*)）/g;

function extractBehaviors(raw: string): string[] {
  const behaviors: string[] = [];

  for (const match of raw.matchAll(ACTION_EN)) {
    const text = match[1]?.trim();
    if (text) behaviors.push(text);
  }
  for (const match of raw.matchAll(ACTION_ZH)) {
    const text = match[1]?.trim();
    if (text) behaviors.push(text);
  }

  return behaviors;
}

function stripBehaviorDirectives(raw: string): string {
  return raw
    .replace(ACTION_EN, ' ')
    .replace(ACTION_ZH, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 解析用户输入：默认全文为台词；#() / #（） 为行为指令 */
export function parseUserInput(raw: string): UserTurnInput {
  const trimmed = raw.trim();
  const behaviors = extractBehaviors(trimmed);
  const dialogue = stripBehaviorDirectives(trimmed);

  return {
    raw: trimmed,
    dialogue,
    behaviors,
  };
}

export function userInputEffectiveLength(input: UserTurnInput): number {
  return input.dialogue.length + input.behaviors.join('').length;
}

/** 注入 turn user prompt */
export function formatUserInputForPrompt(input: UserTurnInput): string {
  const lines = ['【用户本回合输入】'];

  if (input.dialogue) {
    lines.push(
      `台词（须作为 MSG:你| 正文或极轻微润色，保留原意与人称，禁止改写成另一句话）：「${input.dialogue}」`,
    );
  } else {
    lines.push('台词：（用户未输入对白，本回合可无 MSG:你| 或仅用短句承接行为）');
  }

  if (input.behaviors.length > 0) {
    lines.push(
      `行为（非台词，标注为用户行动；须写进 NARR 或 NPC 反应，禁止放进 MSG:你| 括号）：${input.behaviors.map((b) => `「${b}」`).join('、')}`,
    );
  }

  return lines.join('\n');
}

export function toPlayerAction(raw: string) {
  const parsed = parseUserInput(raw);
  return {
    raw: parsed.raw,
    dialogue: parsed.dialogue,
    behaviors: parsed.behaviors,
  };
}
