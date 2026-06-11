import type { StoryBackground } from '../../types/story.types';
import './ChatPrologue.css';

interface ChatPrologueProps {
  background: StoryBackground;
  themeTitle?: string;
  turnLabel?: string;
  loading?: boolean;
}

export function ChatPrologue({
  background,
  themeTitle,
  turnLabel,
  loading = false,
}: ChatPrologueProps) {
  const displayTitle = background.title.trim() || themeTitle || '';
  const prologue = background.prologue.trim();
  const hasContent = Boolean(displayTitle || prologue);

  if (loading && !hasContent) {
    return (
      <div className="chat-prologue chat-prologue--loading">
        <p className="chat-prologue__placeholder">剧本背景生成中…</p>
      </div>
    );
  }

  if (!hasContent) return null;

  return (
    <header className="chat-prologue">
      {(displayTitle || turnLabel) && (
        <div className="chat-prologue__head">
          {displayTitle ? (
            <h2 className="chat-prologue__title">{displayTitle}</h2>
          ) : null}
          {turnLabel ? (
            <span className="chat-prologue__turn">{turnLabel}</span>
          ) : null}
        </div>
      )}

      {prologue ? (
        <div className="chat-prologue__detail">
          <span className="chat-prologue__detail-label">前情提要</span>
          <p className="chat-prologue__detail-text">{prologue}</p>
        </div>
      ) : null}
    </header>
  );
}
