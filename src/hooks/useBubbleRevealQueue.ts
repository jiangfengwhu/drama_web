import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BUBBLE_POP_ANIM_MS } from '../constants/timeline-animation.const';

interface RevealSession {
  baseIndex: number;
}

/**
 * 气泡 reveal 队列：
 * - target 增长后逐条 +1 展示，禁止一次性跳满
 * - 上一条 pop 动画结束后再展示下一条
 * - 切换 thread 时一次性展示已有历史，不重播
 */
export function useBubbleRevealQueue<T>(
  committedItems: T[],
  streamItems: T[],
  isStreaming: boolean,
  hasPendingLine: boolean,
  threadId: string,
) {
  const sessionRef = useRef<RevealSession | null>(null);
  const prevThreadRef = useRef(threadId);
  const [visibleEndIndex, setVisibleEndIndex] = useState(committedItems.length);
  const [interactionReady, setInteractionReady] = useState(false);

  const allItems = isStreaming
    ? [...committedItems, ...streamItems]
    : committedItems;
  const targetLength = allItems.length;

  useLayoutEffect(() => {
    if (prevThreadRef.current === threadId) return;
    prevThreadRef.current = threadId;
    sessionRef.current = null;
    setVisibleEndIndex(committedItems.length);
    if (!isStreaming && !hasPendingLine && committedItems.length > 0) {
      setInteractionReady(true);
    }
  }, [threadId, committedItems.length, isStreaming, hasPendingLine]);

  useEffect(() => {
    if (!isStreaming || sessionRef.current !== null) return;
    sessionRef.current = { baseIndex: committedItems.length };
    setVisibleEndIndex(committedItems.length);
  }, [isStreaming, committedItems.length]);

  useEffect(() => {
    if (visibleEndIndex >= targetLength) {
      if (!isStreaming && !hasPendingLine) {
        sessionRef.current = null;
      }
      return;
    }

    const baseIndex = sessionRef.current?.baseIndex ?? committedItems.length;
    const delay = visibleEndIndex === baseIndex ? 0 : BUBBLE_POP_ANIM_MS;

    const timer = window.setTimeout(() => {
      setVisibleEndIndex((prev) => Math.min(prev + 1, targetLength));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    visibleEndIndex,
    targetLength,
    hasPendingLine,
    isStreaming,
    committedItems.length,
  ]);

  const visibleItems = allItems.slice(0, visibleEndIndex);
  const isRevealing = visibleEndIndex < targetLength;
  const showQueueLoading =
    isRevealing || (isStreaming && hasPendingLine);

  useEffect(() => {
    if (isStreaming || hasPendingLine || visibleEndIndex < targetLength) {
      setInteractionReady(false);
      return;
    }

    const baseIndex = sessionRef.current?.baseIndex ?? committedItems.length;
    const hadNewBubbles = visibleEndIndex > baseIndex;
    const delay = hadNewBubbles ? BUBBLE_POP_ANIM_MS : 0;

    const timer = window.setTimeout(() => {
      setInteractionReady(true);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    visibleEndIndex,
    targetLength,
    hasPendingLine,
    isStreaming,
    committedItems.length,
  ]);

  return {
    visibleItems,
    isRevealing,
    showQueueLoading,
    interactionReady,
  };
}
