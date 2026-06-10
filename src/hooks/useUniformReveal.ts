import { useEffect, useRef, useState } from 'react';
import { REVEAL_CHARS_PER_TICK, REVEAL_TICK_MS } from '../constants/game.const';

const CATCHUP_THRESHOLD_LARGE = 80;
const CATCHUP_THRESHOLD_MEDIUM = 30;
const CATCHUP_MULTIPLIER_LARGE = 3;
const CATCHUP_MULTIPLIER_MEDIUM = 2;

interface UniformRevealOptions {
  enabled: boolean;
  resetKey: string;
}

interface UniformRevealResult {
  revealedText: string;
  isRevealing: boolean;
}

export function useUniformReveal(
  target: string,
  { enabled, resetKey }: UniformRevealOptions,
): UniformRevealResult {
  const [visibleCount, setVisibleCount] = useState(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    setVisibleCount(0);
  }, [resetKey]);

  useEffect(() => {
    if (!enabled) {
      setVisibleCount(target.length);
    }
  }, [enabled, target.length]);

  useEffect(() => {
    if (!enabled) return;

    const id = window.setInterval(() => {
      setVisibleCount((current) => {
        const total = targetRef.current.length;
        if (current >= total) return current;

        const gap = total - current;
        let step = REVEAL_CHARS_PER_TICK;
        if (gap > CATCHUP_THRESHOLD_LARGE) {
          step *= CATCHUP_MULTIPLIER_LARGE;
        } else if (gap > CATCHUP_THRESHOLD_MEDIUM) {
          step *= CATCHUP_MULTIPLIER_MEDIUM;
        }

        return Math.min(current + step, total);
      });
    }, REVEAL_TICK_MS);

    return () => window.clearInterval(id);
  }, [enabled, resetKey]);

  if (!enabled) {
    return { revealedText: target, isRevealing: false };
  }

  const safeCount = Math.min(visibleCount, target.length);

  return {
    revealedText: target.slice(0, safeCount),
    isRevealing: safeCount < target.length,
  };
}
