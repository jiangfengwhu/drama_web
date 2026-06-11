export type StoryTimelineKind = 'scene' | 'narration' | 'msg';

export interface StoryTimelineItem {
  id: string;
  kind: StoryTimelineKind;
  text: string;
  stageDirection?: string;
  sender?: string;
  isProtagonist?: boolean;
}
