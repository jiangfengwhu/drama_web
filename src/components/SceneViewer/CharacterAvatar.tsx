import { getAvatarTheme, type AvatarTheme } from '../../services/avatar-theme.util';
import './CharacterAvatar.css';

interface CharacterAvatarProps {
  name?: string;
  isProtagonist?: boolean;
  theme?: AvatarTheme;
  align?: 'left' | 'right';
  onPrivateChat?: () => void;
}

export function CharacterAvatar({
  name,
  isProtagonist = false,
  theme,
  align = 'left',
  onPrivateChat,
}: CharacterAvatarProps) {
  const displayName = name?.trim() || '未知';
  const resolvedTheme = theme ?? getAvatarTheme(displayName, isProtagonist);
  const canPrivateChat = Boolean(onPrivateChat) && !isProtagonist;

  const faceStyle = {
    '--avatar-gradient': resolvedTheme.gradient,
    '--avatar-ring': resolvedTheme.ring,
    '--avatar-text': resolvedTheme.textColor,
  } as React.CSSProperties;

  if (canPrivateChat) {
    return (
      <div className={`character-avatar character-avatar--${align}`}>
        <button
          type="button"
          className="character-avatar__btn"
          aria-label={`与${displayName}私聊`}
          onClick={(event) => {
            event.stopPropagation();
            onPrivateChat?.();
          }}
        >
          <span
            className="character-avatar__face wechat-chat__avatar"
            style={faceStyle}
          >
            <span className="wechat-chat__avatar-text" aria-hidden>
              {resolvedTheme.labelLines.map((line, index) => (
                <span key={index} className="wechat-chat__avatar-line">
                  {line}
                </span>
              ))}
            </span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`character-avatar character-avatar--${align}`}>
      <span className="character-avatar__face wechat-chat__avatar" style={faceStyle}>
        <span className="wechat-chat__avatar-text" aria-hidden>
          {resolvedTheme.labelLines.map((line, index) => (
            <span key={index} className="wechat-chat__avatar-line">
              {line}
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}
