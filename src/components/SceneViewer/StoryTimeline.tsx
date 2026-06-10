import { getAvatarTheme } from '../../services/avatar-theme.util';
import type { StoryTimelineItem } from '../../types/story-timeline.types';
import './StoryTimeline.css';

interface StoryTimelineProps {
  items: StoryTimelineItem[];
  isLoading?: boolean;
}

function ChatAvatar({
  name,
  isProtagonist = false,
}: {
  name?: string;
  isProtagonist?: boolean;
}) {
  const theme = getAvatarTheme(name ?? '?', isProtagonist);

  return (
    <div
      className="wechat-chat__avatar"
      style={
        {
          '--avatar-gradient': theme.gradient,
          '--avatar-ring': theme.ring,
          '--avatar-text': theme.textColor,
        } as React.CSSProperties
      }
      aria-hidden
    >
      {theme.initial}
    </div>
  );
}

function SystemTip({ text }: { text: string }) {
  return (
    <div className="wechat-chat__system">
      <span className="wechat-chat__system-text">{text}</span>
    </div>
  );
}

function ChatLoading() {
  return (
    <div className="wechat-chat__loading" role="status" aria-live="polite">
      <span className="wechat-chat__loading-dot" />
      <span className="wechat-chat__loading-dot" />
      <span className="wechat-chat__loading-dot" />
    </div>
  );
}

function ChatBubble({ item }: { item: StoryTimelineItem }) {
  const isSelf = Boolean(item.isProtagonist);
  const senderName = item.sender ?? '未知';
  const theme = getAvatarTheme(senderName, isSelf);

  if (isSelf) {
    return (
      <div className="wechat-chat__row wechat-chat__row--self">
        <div className="wechat-chat__self-body">
          <div className="wechat-chat__bubble wechat-chat__bubble--self">
            <p>{item.text}</p>
          </div>
        </div>
        <ChatAvatar name={senderName} isProtagonist />
      </div>
    );
  }

  return (
    <div className="wechat-chat__row wechat-chat__row--other">
      <ChatAvatar name={senderName} />
      <div className="wechat-chat__other-body">
        <span
          className="wechat-chat__name"
          style={{ '--name-accent': theme.accent } as React.CSSProperties}
        >
          {senderName}
        </span>
        <div className="wechat-chat__bubble wechat-chat__bubble--other">
          <p>{item.text}</p>
        </div>
      </div>
    </div>
  );
}

export function StoryTimeline({
  items,
  isLoading = false,
}: StoryTimelineProps) {
  if (items.length === 0 && !isLoading) return null;

  return (
    <div className="wechat-chat">
      {items.map((item) => {
        if (item.kind === 'scene' || item.kind === 'narration') {
          return <SystemTip key={item.id} text={item.text} />;
        }
        return <ChatBubble key={item.id} item={item} />;
      })}
      {isLoading && <ChatLoading />}
    </div>
  );
}
