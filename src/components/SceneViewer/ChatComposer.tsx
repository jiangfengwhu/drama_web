import { useState } from 'react';
import './ChatComposer.css';

interface ChatComposerProps {
  disabled?: boolean;
  minLen: number;
  maxLen: number;
  audience: 'male' | 'female';
  onSubmit: (text: string) => Promise<boolean>;
}

export function ChatComposer({
  disabled,
  minLen,
  maxLen,
  audience,
  onSubmit,
}: ChatComposerProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const value = text.trim();
    if (value.length < minLen || value.length > maxLen) return;

    setSubmitting(true);
    const ok = await onSubmit(value);
    if (ok) setText('');
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const placeholder =
    audience === 'male'
      ? '描述你的行动或态度…'
      : '描述你想做什么、说什么…';

  return (
    <div className="chat-composer">
      <div className="chat-composer__row">
        <textarea
          className="chat-composer__input"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || submitting}
          maxLength={maxLen}
          rows={1}
        />
        <button
          type="button"
          className="chat-composer__send"
          disabled={disabled || submitting || text.trim().length < minLen}
          onClick={() => void handleSubmit()}
          aria-label="发送"
        >
          {submitting ? '…' : '行动'}
        </button>
      </div>
    </div>
  );
}
