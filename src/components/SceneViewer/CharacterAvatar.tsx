import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersFinePointer } from '../../hooks/usePrefersFinePointer';
import { getAvatarTheme } from '../../services/avatar-theme.util';
import type { RelationItem } from '../../services/story-brief.util';
import './CharacterAvatar.css';

interface CharacterAvatarProps {
  name?: string;
  isProtagonist?: boolean;
  profile?: RelationItem | null;
  align?: 'left' | 'right';
  /** PC 双栏：hover 时把人物信息交给左侧面板，不显示浮层 */
  onProfileHover?: (profile: RelationItem | null) => void;
}

export function CharacterAvatar({
  name,
  isProtagonist = false,
  profile,
  align = 'left',
  onProfileHover,
}: CharacterAvatarProps) {
  const prefersFinePointer = usePrefersFinePointer();
  const displayName = profile?.name ?? name ?? '未知';
  const theme = getAvatarTheme(displayName, isProtagonist);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const hasProfile = Boolean(
    profile?.headline || profile?.description || profile?.raw,
  );
  const useSidePanel = Boolean(onProfileHover && prefersFinePointer && hasProfile);
  const useTap = hasProfile && !prefersFinePointer;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open || prefersFinePointer) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, prefersFinePointer, close]);

  const handleTap = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!useTap) return;
    event.stopPropagation();
    setOpen((value) => !value);
  };

  const handleMouseEnter = () => {
    if (!useSidePanel || !profile) return;
    onProfileHover?.(profile);
  };

  const handleMouseLeave = () => {
    if (!useSidePanel) return;
    onProfileHover?.(null);
  };

  return (
    <div
      ref={wrapRef}
      className={`character-avatar character-avatar--${align}${
        open ? ' character-avatar--open' : ''
      }${hasProfile ? ' character-avatar--has-profile' : ''}${
        useTap ? ' character-avatar--tap' : ''
      }${useSidePanel ? ' character-avatar--side-panel' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="character-avatar__btn"
        aria-label={
          hasProfile
            ? useTap
              ? `${displayName}的人物介绍，点击${open ? '收起' : '查看'}`
              : `查看${displayName}的人物介绍`
            : displayName
        }
        aria-expanded={useTap && hasProfile ? open : undefined}
        aria-disabled={!hasProfile}
        onClick={handleTap}
      >
        <span
          className="character-avatar__face wechat-chat__avatar"
          style={
            {
              '--avatar-gradient': theme.gradient,
              '--avatar-ring': theme.ring,
              '--avatar-text': theme.textColor,
            } as React.CSSProperties
          }
        >
          {theme.label}
        </span>
      </button>

      {hasProfile && profile && useTap ? (
        <div
          className="character-avatar__tip"
          role="dialog"
          aria-hidden={!open}
        >
          <button
            type="button"
            className="character-avatar__tip-close"
            aria-label="关闭"
            onClick={(event) => {
              event.stopPropagation();
              close();
            }}
          >
            ×
          </button>
          <p className="character-avatar__tip-name">
            {profile.name}
            {profile.isProtagonist ? (
              <span className="character-avatar__tip-badge">你</span>
            ) : null}
          </p>
          {profile.headline ? (
            <p className="character-avatar__tip-headline">{profile.headline}</p>
          ) : null}
          {profile.description ? (
            <p className="character-avatar__tip-desc">{profile.description}</p>
          ) : !profile.headline && profile.raw ? (
            <p className="character-avatar__tip-desc">{profile.raw}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
