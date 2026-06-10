import { useState } from 'react';
import './ActionInput.css';

interface ActionInputProps {
  disabled?: boolean;
  minLen: number;
  maxLen: number;
  audience: 'male' | 'female';
  onSubmit: (text: string) => Promise<boolean>;
}

export function ActionInput({
  disabled,
  minLen,
  maxLen,
  audience,
  onSubmit,
}: ActionInputProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const value = text.trim();
    if (value.length < minLen) {
      setError(`至少输入 ${minLen} 个字，描述你的行动`);
      return;
    }
    if (value.length > maxLen) {
      setError(`最多 ${maxLen} 字`);
      return;
    }

    setError(null);
    setSubmitting(true);
    const ok = await onSubmit(value);
    if (ok) setText('');
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="action-input">
      <div className="action-input__header">
        <span className="action-input__label">此刻，你会怎么做？</span>
        <span className="action-input__hint">
          输入你的行动或台词，AI 将实时续写下一幕
        </span>
      </div>

      <textarea
        className="action-input__textarea"
        placeholder={
          audience === 'male'
            ? '例如：让苏晚把 U 盘交给监管组，同时安排公关放出赵天豪的旧采访…'
            : '例如：不签那份合同，当面问他：「你究竟在怕什么？」'
        }
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled || submitting}
        maxLength={maxLen}
        rows={3}
      />

      <div className="action-input__footer">
        <span className="action-input__count">
          {text.length}/{maxLen}
        </span>
        {error && <span className="action-input__error">{error}</span>}
        <button
          type="button"
          className="action-input__submit"
          disabled={disabled || submitting || text.trim().length < minLen}
          onClick={handleSubmit}
        >
          {submitting ? '命运改写中…' : '执行此行动 →'}
        </button>
      </div>
      <p className="action-input__tip">⌘/Ctrl + Enter 快速提交</p>
    </div>
  );
}
