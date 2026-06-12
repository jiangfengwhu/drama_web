import { useMemo } from 'react';
import {
  AvatarThemeRegistry,
  buildCastThemeRegistry,
  collectCastNamesInOrder,
  type AvatarTheme,
} from '../../services/avatar-theme.util';
import { useTimelinePopAnimation } from '../../hooks/useTimelinePopAnimation';
import type { RelationItem } from '../../services/story-brief.util';
import { lookupCharacterProfile } from '../../services/story-brief.util';
import type { StoryTimelineItem } from '../../types/story-timeline.types';
import { CharacterAvatar } from './CharacterAvatar';
import './StoryTimeline.css';
import './CharacterAvatar.css';

interface StoryTimelineProps {
  items: StoryTimelineItem[];
  threadId: string;
  characterProfiles: Map<string, RelationItem>;
  protagonistName: string;
  onPrivateChat?: (npcName: string) => void;
}

function bubbleThemeStyle(theme: AvatarTheme): React.CSSProperties {
  return {
    '--bubble-bg': theme.bubbleBg,
    '--bubble-border': theme.bubbleBorder,
    '--bubble-dialogue': theme.bubbleDialogue,
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
  themeRegistry,
  onPrivateChat,
}: {
  item: StoryTimelineItem;
  characterProfiles: Map<string, RelationItem>;
  protagonistName: string;
  themeRegistry: AvatarThemeRegistry;
  onPrivateChat?: (npcName: string) => void;
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
  const theme = themeRegistry.resolveTheme(displayName, isSelf);
  const bubbleStyle = bubbleThemeStyle(theme);

  const messageStack = (
    <div
      className={`wechat-chat__message-stack${
        isSelf ? ' wechat-chat__message-stack--self' : ''
      }`}
      style={bubbleStyle}
    >
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
          theme={theme}
          align="right"
        />
      </div>
    );
  }

  return (
    <div className="wechat-chat__row wechat-chat__row--other">
      <CharacterAvatar
        name={senderName}
        theme={theme}
        align="left"
        onPrivateChat={
          onPrivateChat ? () => onPrivateChat(displayName) : undefined
        }
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
  themeRegistry,
  onPrivateChat,
}: {
  item: StoryTimelineItem;
  animate: boolean;
  characterProfiles: Map<string, RelationItem>;
  protagonistName: string;
  themeRegistry: AvatarThemeRegistry;
  onPrivateChat?: (npcName: string) => void;
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
        themeRegistry={themeRegistry}
        onPrivateChat={onPrivateChat}
      />
    </div>
  );
}

export function StoryTimeline({
  items,
  threadId,
  characterProfiles,
  protagonistName,
  onPrivateChat,
}: StoryTimelineProps) {
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const shouldPop = useTimelinePopAnimation(itemIds, threadId);

  const themeRegistry = useMemo(() => {
    const castNames: string[] = [];

    for (const item of items) {
      if (item.kind !== 'msg' || !item.sender) continue;
      castNames.push(item.sender);
    }

    for (const name of characterProfiles.keys()) {
      castNames.push(name);
    }

    castNames.push(protagonistName, '你');

    return buildCastThemeRegistry(
      protagonistName,
      collectCastNamesInOrder(castNames, protagonistName),
    );
  }, [items, characterProfiles, protagonistName]);

  if (items.length === 0) return null;

  return (
    <div className="wechat-chat">
      {items.map((item) => (
        <TimelineEntry
          key={item.id}
          item={item}
          animate={shouldPop(item.id)}
          characterProfiles={characterProfiles}
          protagonistName={protagonistName}
          themeRegistry={themeRegistry}
          onPrivateChat={onPrivateChat}
        />
      ))}
    </div>
  );
}
