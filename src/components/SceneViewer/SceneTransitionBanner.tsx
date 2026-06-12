import './SceneTransitionBanner.css';

interface SceneTransitionBannerProps {
  slugline: string;
  onEnter: () => void;
}

export function SceneTransitionBanner({
  slugline,
  onEnter,
}: SceneTransitionBannerProps) {
  return (
    <div className="scene-transition-banner scene-transition-banner--enter">
      <p className="scene-transition-banner__label">本场已落幕</p>
      <p className="scene-transition-banner__slugline">{slugline}</p>
      <button type="button" className="scene-transition-banner__btn" onClick={onEnter}>
        切换到下一场景
      </button>
    </div>
  );
}
