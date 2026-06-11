import { useEffect, useRef, useState } from 'react';
import { BUBBLE_POP_ANIM_MS } from '../constants/timeline-animation.const';

/**
 * 左侧剧本概览 reveal 队列：每条 guide 块完整到达后再逐条弹出。
 */
export function useBriefRevealQueue<T>(targetItems: T[], enabled: boolean) {
  const sessionRef = useRef<{ baseIndex: number } | null>(null);
  const [visibleEndIndex, setVisibleEndIndex] = useState(targetItems.length);

  const targetLength = targetItems.length;

  useEffect(() => {
    if (enabled || sessionRef.current !== null) return;
    setVisibleEndIndex(targetItems.length);
  }, [targetItems.length, enabled]);

  useEffect(() => {
    if (!enabled || sessionRef.current !== null) return;
    sessionRef.current = { baseIndex: 0 };
    setVisibleEndIndex(0);
  }, [enabled]);

  useEffect(() => {
    if (visibleEndIndex >= targetLength) {
      if (!enabled) sessionRef.current = null;
      return;
    }

    const baseIndex = sessionRef.current?.baseIndex ?? 0;
    const delay = visibleEndIndex === baseIndex ? 0 : BUBBLE_POP_ANIM_MS;

    const timer = window.setTimeout(() => {
      setVisibleEndIndex((prev) => Math.min(prev + 1, targetLength));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [visibleEndIndex, targetLength, enabled]);

  const visibleItems = targetItems.slice(0, visibleEndIndex);

  return {
    visibleItems,
    isRevealing: visibleEndIndex < targetLength,
  };
}
