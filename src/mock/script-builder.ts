import type { ScriptLine } from '../types/script.types';
import type { DialogueLine } from '../types/story.types';
import type { RichSceneTemplate } from './rich-scenes';

const DIALOGUE_IN_BEAT = /「([^」]+)」/g;

function shorten(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function isProtagonistSpeaker(raw: string, protagonistName: string): boolean {
  return raw.includes('{{name}}') || raw === protagonistName || raw === '你';
}

function pushNpcMsg(
  lines: ScriptLine[],
  sender: string,
  message: string,
  protagonistName: string,
): void {
  if (isProtagonistSpeaker(sender, protagonistName)) return;
  const text = shorten(message, 96);
  if (text) {
    lines.push({
      kind: 'msg',
      sender,
      message: text,
    });
  }
}

export function templateSceneText(template: RichSceneTemplate): string {
  return shorten(template.atmosphere, 40);
}

/** 仅 NPC 消息 + 可选旁白，不含 SCENE / 主角消息 */
export function templateToNpcScript(
  template: RichSceneTemplate,
  protagonistName: string,
): ScriptLine[] {
  const lines: ScriptLine[] = [];

  for (const dlg of template.dialogues.slice(0, 5)) {
    pushNpcMsg(lines, dlg.speaker, dlg.text, protagonistName);
  }

  for (const beat of template.beats.slice(0, 2)) {
    const dialogues = [...beat.matchAll(DIALOGUE_IN_BEAT)];
    for (const m of dialogues) {
      const before = beat.slice(0, m.index).trim();
      const speakerGuess = before.match(/([^。，「]{1,8})$/)?.[1];
      if (speakerGuess && !speakerGuess.includes('你')) {
        pushNpcMsg(lines, speakerGuess, m[1], protagonistName);
      }
    }
  }

  if (lines.length < 3 && template.beats[0]) {
    lines.push({
      kind: 'narr',
      text: shorten(template.beats[0], 40),
    });
  }

  return lines.slice(0, 8);
}

export function dialoguesToScriptLines(
  dialogues: DialogueLine[],
  protagonistName: string,
): ScriptLine[] {
  const lines: ScriptLine[] = [];
  for (const d of dialogues) {
    pushNpcMsg(lines, d.speaker, d.text, protagonistName);
  }
  return lines;
}
