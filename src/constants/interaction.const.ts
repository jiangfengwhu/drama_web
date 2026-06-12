/** 态度滑动条每回合条数（模型按场面张力在此区间内选取） */
export const ATTITUDE_CARD_COUNT_MIN = 3;
export const ATTITUDE_CARD_COUNT_MAX = 5;

export const ATTITUDE_CARD_COUNT_RANGE_LABEL = `${ATTITUDE_CARD_COUNT_MIN}-${ATTITUDE_CARD_COUNT_MAX}`;

/** 退让 → 决裂，完整 emoji 色阶（按实际条数等距采样） */
export const EMOTION_SLIDER_EMOJI_PALETTE = [
  '🍵',
  '🥺',
  '😐',
  '😤',
  '😈',
  '🔥',
  '💀',
] as const;

export function getEmotionSliderEmojis(count: number): readonly string[] {
  const clamped = Math.max(
    ATTITUDE_CARD_COUNT_MIN,
    Math.min(ATTITUDE_CARD_COUNT_MAX, count),
  );
  if (clamped <= 1) return [EMOTION_SLIDER_EMOJI_PALETTE[0]];

  return Array.from({ length: clamped }, (_, i) => {
    const paletteIdx = Math.round(
      (i / (clamped - 1)) * (EMOTION_SLIDER_EMOJI_PALETTE.length - 1),
    );
    return EMOTION_SLIDER_EMOJI_PALETTE[paletteIdx];
  });
}

export const EMOTION_SLIDER_SEND_LABEL = '发送';

/** 滑动条左上角说明 */
export const EMOTION_SLIDER_TITLE = '轮到你了';

/** 固定「自由发挥」入口，点击后切换为键盘输入 */
export const FREE_FORM_MODE_LABEL = '自由发挥';

export const ATTITUDE_CARD_LIMITS = {
  min: ATTITUDE_CARD_COUNT_MIN,
  max: ATTITUDE_CARD_COUNT_MAX,
} as const;

/** @deprecated 使用 ATTITUDE_CARD_COUNT_MIN / ATTITUDE_CARD_COUNT_MAX */
export const EMOTION_SLIDER_OPTION_COUNT = ATTITUDE_CARD_COUNT_MAX;

/** @deprecated 使用 getEmotionSliderEmojis(count) */
export const EMOTION_SLIDER_EMOJIS = EMOTION_SLIDER_EMOJI_PALETTE;
