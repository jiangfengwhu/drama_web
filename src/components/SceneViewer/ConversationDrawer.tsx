import { useEffect } from 'react';
import './ConversationDrawer.css';

interface ConversationDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function ConversationDrawer({
  open,
  onClose,
  children,
}: ConversationDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div
      className={`conv-drawer${open ? ' conv-drawer--open' : ''}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="conv-drawer__backdrop"
        aria-label="关闭对话列表"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <div
        className="conv-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="对话列表"
      >
        <button
          type="button"
          className="conv-drawer__close"
          aria-label="关闭"
          onClick={onClose}
        >
          ×
        </button>
        <div className="conv-drawer__body">{children}</div>
      </div>
    </div>
  );
}
