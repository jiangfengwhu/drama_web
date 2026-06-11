import { useEffect, useLayoutEffect, useRef } from 'react';
import { getAvatarTheme } from '../../services/avatar-theme.util';
import type { StoryTimelineItem } from '../../types/story-timeline.types';
import './StoryTimeline.css';

interface StoryTimelineProps {
  items: StoryTimelineItem[];
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

function ChatBubble({ item }: { item: StoryTimelineItem }) {
  const isSelf = Boolean(item.isProtagonist);
  const senderName = item.sender ?? '未知';
  const theme = getAvatarTheme(senderName, isSelf);

  const bubbleBody = (
    <>
      {item.stageDirection ? (
        <p className="wechat-chat__stage-direction">{item.stageDirection}</p>
      ) : null}
      <p>{item.text}</p>
    </>
  );

  if (isSelf) {
    return (
      <div className="wechat-chat__row wechat-chat__row--self">
        <div className="wechat-chat__self-body">
          <div className="wechat-chat__bubble wechat-chat__bubble--self">
            {bubbleBody}
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
          {bubbleBody}
        </div>
      </div>
    </div>
  );
}

function TimelineEntry({
  item,
  animate,
}: {
  item: StoryTimelineItem;
  animate: boolean;
}) {
  const className = animate
    ? 'wechat-chat__entry wechat-chat__entry--pop'
    : 'wechat-chat__entry';

  if (item.kind === 'scene' || item.kind === 'narration') {
    return (
      <div className={className}>
        <SystemTip text={item.text} />
      </div>
    );
  }

  return (
    <div className={className}>
      <ChatBubble item={item} />
    </div>
  );
}

export function StoryTimeline({ items }: StoryTimelineProps) {
  const seenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (items.length === 0) seenIdsRef.current.clear();
  }, [items.length]);

  useLayoutEffect(() => {
    items.forEach((item) => seenIdsRef.current.add(item.id));
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="wechat-chat">
      {items.map((item) => (
        <TimelineEntry
          key={item.id}
          item={item}
          animate={!seenIdsRef.current.has(item.id)}
        />
      ))}
    </div>
  );
}
