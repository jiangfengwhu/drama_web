import { useEffect, useState } from 'react';
import {
  CHAT_DOCK_LOADING_HINT_ROTATE_MS,
  CHAT_DOCK_LOADING_HINTS,
  CHAT_DOCK_LOADING_LABEL,
} from '../../constants/chat-dock.const';
import type { SceneMood } from '../../types/story.types';
import './ChatTimelineLoading.css';

interface ChatTimelineLoadingProps {
  mood?: SceneMood;
}

export function ChatTimelineLoading({ mood = 'neutral' }: ChatTimelineLoadingProps) {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHintIndex((current) => (current + 1) % CHAT_DOCK_LOADING_HINTS.length);
    }, CHAT_DOCK_LOADING_HINT_ROTATE_MS);

    return () => window.clearInterval(id);
  }, []);

  const hint = CHAT_DOCK_LOADING_HINTS[hintIndex];

  return (
    <div
      className={`chat-dock-loading chat-dock-loading--${mood}`}
      role="status"
      aria-live="polite"
      aria-label={`${CHAT_DOCK_LOADING_LABEL}，${hint}`}
    >
      <div className="chat-dock-loading__shimmer" aria-hidden />
      <div className="chat-dock-loading__inner">
        <span className="chat-dock-loading__mark" aria-hidden />
        <div className="chat-dock-loading__copy">
          <span className="chat-dock-loading__label">{CHAT_DOCK_LOADING_LABEL}</span>
          <span key={hint} className="chat-dock-loading__hint">
            {hint}
          </span>
        </div>
        <div className="chat-dock-loading__pulse" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
