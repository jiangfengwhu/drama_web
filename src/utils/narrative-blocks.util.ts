import {
  DIALOGUE_QUOTE_PATTERN,
  SCENE_KEYWORDS,
  SPEAKER_BEFORE_DIALOGUE_PATTERN,
} from '../constants/narrative-display.const';
import type {
  NarrativeBlock,
  NarrativeBlockKind,
  NarrativeSegment,
} from '../types/narrative-display.types';

function hasSceneCue(text: string): boolean {
  return SCENE_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isProtagonistPerspective(text: string, protagonistName: string): boolean {
  if (text.includes('你')) return true;
  if (protagonistName && text.includes(protagonistName)) return true;
  return false;
}

function dialogueRatio(text: string): number {
  const matches = [...text.matchAll(DIALOGUE_QUOTE_PATTERN)];
  const dialogueLen = matches.reduce((sum, match) => sum + match[0].length, 0);
  return text.length > 0 ? dialogueLen / text.length : 0;
}

function inferSpeaker(beforeDialogue: string): string | undefined {
  const trimmed = beforeDialogue.trim();
  const match = trimmed.match(SPEAKER_BEFORE_DIALOGUE_PATTERN);
  if (match?.[1]) return match[1].trim();
  return undefined;
}

export function splitIntoSegments(text: string): NarrativeSegment[] {
  const segments: NarrativeSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(DIALOGUE_QUOTE_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      const prose = text.slice(lastIndex, start).trim();
      if (prose) {
        segments.push({ kind: 'prose', text: prose });
      }
    }

    const before = text.slice(lastIndex, start);
    segments.push({
      kind: 'dialogue',
      text: match[1],
      speaker: inferSpeaker(before),
    });
    lastIndex = start + match[0].length;
  }

  const tail = text.slice(lastIndex).trim();
  if (tail) {
    segments.push({ kind: 'prose', text: tail });
  }

  if (segments.length === 0) {
    segments.push({ kind: 'prose', text });
  }

  return segments;
}

export function classifyBeat(
  beat: string,
  index: number,
  protagonistName: string,
): NarrativeBlockKind {
  const trimmed = beat.trim();
  if (!trimmed) return 'story';

  if (dialogueRatio(trimmed) >= 0.55) return 'dialogue';
  if (index === 0 && hasSceneCue(trimmed)) return 'scene';
  if (isProtagonistPerspective(trimmed, protagonistName)) return 'protagonist';
  if (hasSceneCue(trimmed) && !trimmed.includes('你')) return 'scene';

  return 'story';
}

export function parseBeatToBlock(
  beat: string,
  index: number,
  protagonistName: string,
): NarrativeBlock {
  const kind = classifyBeat(beat, index, protagonistName);
  return {
    kind,
    raw: beat,
    segments: splitIntoSegments(beat),
  };
}

export function parseBeatsToBlocks(
  beats: string[],
  protagonistName: string,
): NarrativeBlock[] {
  return beats.filter(Boolean).map((beat, index) =>
    parseBeatToBlock(beat, index, protagonistName),
  );
}

export function isProtagonistSpeaker(
  speaker: string,
  protagonistName: string,
): boolean {
  const normalized = speaker.trim();
  if (!normalized) return false;
  if (normalized === '你') return true;
  if (protagonistName && normalized.includes(protagonistName)) return true;
  if (normalized.includes('{{name}}')) return true;
  return false;
}
