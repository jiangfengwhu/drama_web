import type { StoryLength } from '../types/story.types';

/** 同一 slugline 下主角出手次数 ≥ 此值：prompt 建议考虑 META: CUT */
export const SCENE_SOFT_CUT_TURNS: Record<StoryLength, number> = {
  short: 3,
  medium: 4,
  long: 6,
};

/** 同一 slugline 下主角出手次数 ≥ 此值：prompt 强制本回合 META: CUT（兜底） */
export const SCENE_FORCE_CUT_TURNS: Record<StoryLength, number> = {
  short: 5,
  medium: 7,
  long: 10,
};

/** Agnes 直连上游 */
export const AGNES_API_BASE = 'https://apihub.agnes-ai.com';
export const AGNES_API_ENDPOINT = `${AGNES_API_BASE}/v1/chat/completions`;
export const AGNES_MODEL = 'agnes-2.0-flash';

/** OpenAI 兼容上游（生产经 /api/openai 同源代理转发） */
export const OPENAI_UPSTREAM_BASE = 'https://llm.onallways.top';
export const OPENAI_MODEL = 'gpt-5.4-mini';

/** 回合 user prompt 中保留的最近剧本行数（控制上下文膨胀） */
export const TURN_HISTORY_LINE_LIMIT = 36;

/** 私聊 prompt 中引用的场景群聊行数上限 */
export const PRIVATE_SCENE_CONTEXT_LINE_LIMIT = 28;

/** 场景 prompt 中引用的每场密谈行数上限（按 thread） */
export const SCENE_PRIVATE_CONTEXT_LINE_LIMIT = 24;

export const REVEAL_CHARS_PER_TICK = 2;
export const REVEAL_TICK_MS = 40;

/** 新用户赠送入场券 */
export const INITIAL_ADMISSION_TICKETS = 2;
/** 演示：单次购买获得的入场券数量 */
export const TICKET_PACK_SIZE = 3;
export const TICKET_PACK_PRICE_LABEL = '¥6';

/** 篇幅标签；minTurns 为允许 COMPLETE: yes 的用户最低选择次数 */
export const STORY_PACE: Record<StoryLength, { label: string; minTurns: number }> = {
  short: { label: '短篇 · 快节奏', minTurns: 4 },
  medium: { label: '中篇 · 标准', minTurns: 8 },
  long: { label: '长篇 · 慢热', minTurns: 15 },
};

export const LENGTH_LABELS: Record<StoryLength, string> = {
  short: STORY_PACE.short.label,
  medium: STORY_PACE.medium.label,
  long: STORY_PACE.long.label,
};

export const STORAGE_KEYS = {
  admissionTickets: 'era_admission_tickets',
  storyState: 'era_story_state',
} as const;
