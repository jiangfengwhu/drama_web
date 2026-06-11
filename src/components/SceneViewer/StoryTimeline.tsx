import { useEffect, useLayoutEffect, useRef } from 'react';
import { getAvatarTheme } from '../../services/avatar-theme.util';
import type { RelationItem } from '../../services/story-brief.util';
import { lookupCharacterProfile } from '../../services/story-brief.util';
import type { StoryTimelineItem } from '../../types/story-timeline.types';
import { CharacterAvatar } from './CharacterAvatar';
import './StoryTimeline.css';
import './CharacterAvatar.css';

interface StoryTimelineProps {
  items: StoryTimelineItem[];
  characterProfiles: Map<string, RelationItem>;
  protagonistName: string;
  onProfileHover?: (profile: RelationItem | null) => void;
}

function bubbleThemeStyle(theme: ReturnType<typeof getAvatarTheme>): React.CSSProperties {
  return {
    '--bubble-bg': theme.bubbleBg,
    '--bubble-border': theme.bubbleBorder,
    '--bubble-dialogue': theme.bubbleDialogue,
    '--bubble-stage': theme.bubbleStage,
    '--bubble-stage-accent': theme.bubbleStageAccent,
    '--bubble-shadow': theme.bubbleShadow,
  } as React.CSSProperties;
}

function SystemTip({ text }: { text: string }) {
  return (
    <div className="wechat-chat__system">
      <span className="wechat-chat__system-text">{text}</span>
    </div>
  );
}

function ChatBubble({
  item,
  characterProfiles,
  protagonistName,
  onProfileHover,
}: {
  item: StoryTimelineItem;
  characterProfiles: Map<string, RelationItem>;
  protagonistName: string;
  onProfileHover?: (profile: RelationItem | null) => void;
}) {
  const isSelf = Boolean(item.isProtagonist);
  const senderName = item.sender ?? '未知';
  const profile = lookupCharacterProfile(
    characterProfiles,
    senderName,
    isSelf,
    protagonistName,
  );
  const displayName = profile?.name ?? senderName;
  const theme = getAvatarTheme(displayName, isSelf);
  const bubbleStyle = bubbleThemeStyle(theme);

  const messageStack = (
    <div
      className={`wechat-chat__message-stack${
        isSelf ? ' wechat-chat__message-stack--self' : ''
      }`}
      style={bubbleStyle}
    >
      {item.stageDirection ? (
        <p className="wechat-chat__stage-caption">{item.stageDirection}</p>
      ) : null}
      <div
        className={`wechat-chat__bubble wechat-chat__bubble--${
          isSelf ? 'self' : 'other'
        } wechat-chat__bubble--themed`}
      >
        <p className="wechat-chat__dialogue">{item.text}</p>
      </div>
    </div>
  );

  if (isSelf) {
    return (
      <div className="wechat-chat__row wechat-chat__row--self">
        <div className="wechat-chat__self-body">{messageStack}</div>
        <CharacterAvatar
          name={senderName}
          isProtagonist
          profile={profile}
          align="right"
          onProfileHover={onProfileHover}
        />
      </div>
    );
  }

  return (
    <div className="wechat-chat__row wechat-chat__row--other">
      <CharacterAvatar
        name={senderName}
        profile={profile}
        align="left"
        onProfileHover={onProfileHover}
      />
      <div className="wechat-chat__other-body">{messageStack}</div>
    </div>
  );
}

function TimelineEntry({
  item,
  animate,
  characterProfiles,
  protagonistName,
  onProfileHover,
}: {
  item: StoryTimelineItem;
  animate: boolean;
  characterProfiles: Map<string, RelationItem>;
  protagonistName: string;
  onProfileHover?: (profile: RelationItem | null) => void;
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
      <ChatBubble
        item={item}
        characterProfiles={characterProfiles}
        protagonistName={protagonistName}
        onProfileHover={onProfileHover}
      />
    </div>
  );
}

export function StoryTimeline({
  items,
  characterProfiles,
  protagonistName,
  onProfileHover,
}: StoryTimelineProps) {
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
          characterProfiles={characterProfiles}
          protagonistName={protagonistName}
          onProfileHover={onProfileHover}
        />
      ))}
    </div>
  );
}
