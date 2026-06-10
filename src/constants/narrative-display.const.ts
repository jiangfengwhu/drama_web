import type { NarrativeBlockKind } from '../types/narrative-display.types';

export const NARRATIVE_BLOCK_LABELS: Record<NarrativeBlockKind, string> = {
  scene: '场景',
  story: '剧情',
  protagonist: '你的视角',
  dialogue: '对话',
};

export const NARRATIVE_BLOCK_HINTS: Record<NarrativeBlockKind, string> = {
  scene: '时间 · 地点 · 氛围',
  story: '事态推进',
  protagonist: '你在剧中的行动与感知',
  dialogue: '人物台词',
};

/** 环境/场景描写常见词 */
export const SCENE_KEYWORDS = [
  '窗外',
  '空气',
  '灯光',
  '凌晨',
  '午夜',
  '清晨',
  '傍晚',
  '大厅',
  '会议室',
  '办公室',
  '顶层',
  '霓虹',
  '雨',
  '风',
  '温度',
  '恒温',
  '走廊',
  '电梯',
  '江',
  '城',
  '楼',
  '房间',
  '宴会',
  '庭院',
  '宫',
  '街',
] as const;

export const DIALOGUE_QUOTE_PATTERN = /「([^」]+)」/g;

export const SPEAKER_BEFORE_DIALOGUE_PATTERN =
  /([^。！？\n「]{1,12})(?:说|道|问|答|喊|低声|冷声|抬眼|抬眸|开口|沉声|轻声|缓缓)[，：]?$/;
