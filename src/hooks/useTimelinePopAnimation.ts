import { useLayoutEffect, useRef, useState } from 'react';
import { BUBBLE_POP_ANIM_MS } from '../constants/timeline-animation.const';

/**
 * 气泡 pop 动画：新条目带 --pop；切换 thread 时不重播已有条目。
 */
export function useTimelinePopAnimation(
  itemIds: readonly string[],
  threadId: string,
) {
  const seenIdsRef = useRef(new Set<string>());
  const prevThreadRef = useRef(threadId);
  const [popIds, setPopIds] = useState<ReadonlySet<string>>(() => new Set());
  const timersRef = useRef<number[]>([]);

  useLayoutEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (prevThreadRef.current !== threadId) {
      prevThreadRef.current = threadId;
      seenIdsRef.current.clear();
      setPopIds(new Set());
      if (itemIds.length > 0) {
        itemIds.forEach((id) => seenIdsRef.current.add(id));
      }
      return;
    }

    if (itemIds.length === 0) {
      seenIdsRef.current.clear();
      setPopIds(new Set());
      return;
    }

    const newcomers = itemIds.filter((id) => !seenIdsRef.current.has(id));
    if (newcomers.length === 0) return;

    newcomers.forEach((id) => seenIdsRef.current.add(id));

    setPopIds((prev) => {
      const next = new Set(prev);
      newcomers.forEach((id) => next.add(id));
      return next;
    });

    timersRef.current = newcomers.map((id, index) =>
      window.setTimeout(() => {
        setPopIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, BUBBLE_POP_ANIM_MS + index * BUBBLE_POP_ANIM_MS),
    );

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [itemIds, threadId]);

  const shouldPop = (id: string) =>
    !seenIdsRef.current.has(id) || popIds.has(id);

  return shouldPop;
}
