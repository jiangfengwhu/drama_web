import { useCallback, useMemo, useRef, useState } from 'react';
import {
  COMPOSER_PLACEHOLDER,
  COMPOSER_SEND_LABEL,
} from '../../constants/interaction.const';
import './ChatComposer.css';

interface ChatComposerProps {
  disabled?: boolean;
  minLen: number;
  maxLen: number;
  mentionCandidates?: string[];
  onSubmit: (text: string) => Promise<boolean>;
}

interface ActiveMention {
  start: number;
  query: string;
}

function findActiveMention(
  text: string,
  cursor: number,
): ActiveMention | null {
  const before = text.slice(0, cursor);
  const atIndex = before.lastIndexOf('@');
  if (atIndex < 0) return null;

  const query = before.slice(atIndex + 1);
  if (/\s/.test(query)) return null;

  return { start: atIndex, query };
}

export function ChatComposer({
  disabled,
  minLen,
  maxLen,
  mentionCandidates = [],
  onSubmit,
}: ChatComposerProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncCursor = (element: HTMLTextAreaElement) => {
    setCursor(element.selectionStart);
  };

  const activeMention = findActiveMention(text, cursor);

  const filteredMentions = useMemo(() => {
    if (!activeMention) return [];
    const q = activeMention.query.trim().toLowerCase();
    const pool = mentionCandidates.filter(Boolean);
    if (!q) return pool;
    return pool.filter((name) => name.toLowerCase().includes(q));
  }, [activeMention, mentionCandidates]);

  const showMentionMenu =
    Boolean(activeMention) && filteredMentions.length > 0 && !disabled;

  const insertMention = useCallback(
    (name: string) => {
      if (!activeMention || !textareaRef.current) return;

      const cursorPos = textareaRef.current.selectionStart;
      const before = text.slice(0, activeMention.start);
      const after = text.slice(cursorPos);
      const next = `${before}@${name} ${after}`;
      setText(next);
      setMentionIndex(0);

      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        const nextCursor = before.length + name.length + 2;
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [activeMention, text],
  );

  const handleSubmit = async () => {
    const value = text.trim();
    if (value.length < minLen || value.length > maxLen) return;

    setSubmitting(true);
    const ok = await onSubmit(value);
    if (ok) setText('');
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(
          (i) => (i - 1 + filteredMentions.length) % filteredMentions.length,
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentions[mentionIndex] ?? filteredMentions[0]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionIndex(0);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="chat-composer">
      <div className="chat-composer__row">
        <div className="chat-composer__input-wrap">
          {showMentionMenu ? (
            <ul className="chat-composer__mention-menu" role="listbox">
              {filteredMentions.map((name, index) => (
                <li key={name} role="option" aria-selected={index === mentionIndex}>
                  <button
                    type="button"
                    className={`chat-composer__mention-item${
                      index === mentionIndex
                        ? ' chat-composer__mention-item--active'
                        : ''
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertMention(name);
                    }}
                  >
                    @{name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <textarea
            ref={textareaRef}
            className="chat-composer__input"
            placeholder={COMPOSER_PLACEHOLDER}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              syncCursor(e.target);
              setMentionIndex(0);
            }}
            onKeyDown={handleKeyDown}
            onKeyUp={(e) => syncCursor(e.currentTarget)}
            onSelect={(e) => syncCursor(e.currentTarget)}
            onClick={(e) => syncCursor(e.currentTarget)}
            disabled={disabled || submitting}
            maxLength={maxLen}
            rows={1}
          />
        </div>
        <button
          type="button"
          className="chat-composer__send"
          disabled={disabled || submitting || text.trim().length < minLen}
          onClick={() => void handleSubmit()}
          aria-label="发送"
        >
          {submitting ? '…' : COMPOSER_SEND_LABEL}
        </button>
      </div>
    </div>
  );
}
