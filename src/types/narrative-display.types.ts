export type NarrativeBlockKind = 'scene' | 'story' | 'protagonist' | 'dialogue';

export interface NarrativeSegment {
  kind: 'prose' | 'dialogue';
  text: string;
  speaker?: string;
}

export interface NarrativeBlock {
  kind: NarrativeBlockKind;
  raw: string;
  segments: NarrativeSegment[];
}
