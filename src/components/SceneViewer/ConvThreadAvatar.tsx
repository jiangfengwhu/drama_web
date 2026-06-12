import { getAvatarTheme } from '../../services/avatar-theme.util';
import type { ChatThread } from '../../types/story-scene.types';
import './ConvThreadAvatar.css';

interface ConvThreadAvatarProps {
  thread: ChatThread;
  protagonistName: string;
}

function resolvePrivateNpcName(
  thread: ChatThread,
  protagonistName: string,
): string {
  const hero = protagonistName.trim();
  const fromParticipants = thread.participantNames.find(
    (name) => name.trim() !== hero && name.trim() !== '你',
  );
  return fromParticipants?.trim() || thread.title.trim();
}

function SceneEmblem() {
  return (
    <svg
      className="conv-thread-avatar__scene-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 8.5h14v9H5z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 8.5V6.8c0-.72.58-1.3 1.3-1.3h4.4c.72 0 1.3.58 1.3 1.3V8.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M9.2 12.2h5.6M9.2 14.4h3.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ConvThreadAvatar({
  thread,
  protagonistName,
}: ConvThreadAvatarProps) {
  if (thread.kind === 'private') {
    const npcName = resolvePrivateNpcName(thread, protagonistName);
    const theme = getAvatarTheme(npcName, false);
    const faceStyle = {
      '--avatar-gradient': theme.gradient,
      '--avatar-ring': theme.ring,
      '--avatar-text': theme.textColor,
    } as React.CSSProperties;

    return (
      <span
        className="conv-thread-avatar conv-thread-avatar--character wechat-chat__avatar"
        style={faceStyle}
        aria-hidden
      >
        <span className="wechat-chat__avatar-text">
          {theme.labelLines.map((line, index) => (
            <span key={index} className="wechat-chat__avatar-line">
              {line}
            </span>
          ))}
        </span>
      </span>
    );
  }

  return (
    <span className="conv-thread-avatar conv-thread-avatar--scene" aria-hidden>
      <SceneEmblem />
    </span>
  );
}
