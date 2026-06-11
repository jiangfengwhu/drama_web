/** 情绪滑动条固定档位数（与 CARD 协议一一对应） */
export const EMOTION_SLIDER_OPTION_COUNT = 7;

/** 从委曲求全 → 彻底黑化，7 档 emoji（与 CARD 一一对应） */
export const EMOTION_SLIDER_EMOJIS = [
  '🍵',
  '🥺',
  '😐',
  '😤',
  '😈',
  '🔥',
  '💀',
] as const;

export const EMOTION_SLIDER_SEND_LABEL = '发送';

/** 滑动条左上角说明 */
export const EMOTION_SLIDER_TITLE = '轮到你了';

/** 固定「自由发挥」入口，点击后切换为键盘输入 */
export const FREE_FORM_MODE_LABEL = '自由发挥';

/** @deprecated 使用 EMOTION_SLIDER_OPTION_COUNT */
export const ATTITUDE_CARD_LIMITS = {
  min: EMOTION_SLIDER_OPTION_COUNT,
  max: EMOTION_SLIDER_OPTION_COUNT,
} as const;
