import type { ChatThread } from '../../types/story-scene.types';
import {
  listPrivateThreads,
  listSceneThreads,
} from '../../services/story-thread.util';
import type { StoryBackground, StoryState } from '../../types/story.types';
import { ConvThreadAvatar } from './ConvThreadAvatar';
import './ConversationListPanel.css';
import './ConvThreadAvatar.css';
import './StoryTimeline.css';

interface ConversationListPanelProps {
  storyState: StoryState;
  background: StoryBackground;
  activeThreadId: string;
  protagonistName: string;
  prologueLoading?: boolean;
  onSelectThread: (threadId: string) => void;
}

function threadPreview(thread: ChatThread): string {
  for (let i = thread.scriptLines.length - 1; i >= 0; i -= 1) {
    const line = thread.scriptLines[i];
    if (line.kind === 'msg' && line.message?.trim()) {
      return line.message.trim().slice(0, 28);
    }
    if (line.kind === 'narr' && line.text?.trim()) {
      return line.text.trim().slice(0, 28);
    }
  }
  return thread.subtitle ?? '暂无消息';
}

function ConversationItem({
  thread,
  protagonistName,
  active,
  onSelect,
}: {
  thread: ChatThread;
  protagonistName: string;
  active: boolean;
  onSelect: () => void;
}) {
  const readonly = thread.status === 'readonly';

  return (
    <button
      type="button"
      className={`conv-item${active ? ' conv-item--active' : ''}${
        readonly ? ' conv-item--readonly' : ''
      }`}
      onClick={onSelect}
    >
      <ConvThreadAvatar thread={thread} protagonistName={protagonistName} />
      <span className="conv-item__body">
        <span className="conv-item__title-row">
          <span className="conv-item__title">{thread.title}</span>
          {readonly ? (
            <span className="conv-item__badge">已完结</span>
          ) : null}
        </span>
        <span className="conv-item__preview">{threadPreview(thread)}</span>
      </span>
    </button>
  );
}

export function ConversationListPanel({
  storyState,
  background,
  activeThreadId,
  protagonistName,
  prologueLoading = false,
  onSelectThread,
}: ConversationListPanelProps) {
  const sceneThreads = listSceneThreads(storyState);
  const privateThreads = listPrivateThreads(storyState);
  const title = background.title.trim();
  const prologue = background.prologue.trim();
  const showPrologue = Boolean(prologue || prologueLoading);

  return (
    <aside className="conv-list" aria-label="场景与私聊">
      <header className="conv-list__header">
        {title ? <h2 className="conv-list__story">{title}</h2> : null}
        {showPrologue ? (
          <div
            className={`conv-list__prologue${
              prologueLoading && !prologue ? ' conv-list__prologue--loading' : ''
            }`}
          >
            <div className="conv-list__prologue-head">
              <span className="conv-list__prologue-label">前情提要</span>
            </div>
            {prologue ? (
              <p className="conv-list__prologue-text">{prologue}</p>
            ) : (
              <p className="conv-list__prologue-placeholder">正在写入此刻的危机…</p>
            )}
          </div>
        ) : null}
      </header>

      <div className="conv-list__sections">
        <section className="conv-list__section">
          <h3 className="conv-list__section-title">场景</h3>
          {sceneThreads.length === 0 ? (
            <p className="conv-list__empty">场景加载中…</p>
          ) : (
            sceneThreads.map((thread) => (
              <ConversationItem
                key={thread.id}
                thread={thread}
                protagonistName={protagonistName}
                active={thread.id === activeThreadId}
                onSelect={() => onSelectThread(thread.id)}
              />
            ))
          )}
        </section>

        {privateThreads.length > 0 ? (
          <section className="conv-list__section">
            <h3 className="conv-list__section-title">私聊</h3>
            {privateThreads.map((thread) => (
              <ConversationItem
                key={thread.id}
                thread={thread}
                protagonistName={protagonistName}
                active={thread.id === activeThreadId}
                onSelect={() => onSelectThread(thread.id)}
              />
            ))}
          </section>
        ) : null}
      </div>
    </aside>
  );
}
