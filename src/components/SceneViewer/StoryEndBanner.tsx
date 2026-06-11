import './StoryEndBanner.css';

interface StoryEndBannerProps {
  onLeave: () => void;
}

export function StoryEndBanner({ onLeave }: StoryEndBannerProps) {
  return (
    <div className="story-end-banner story-end-banner--enter">
      <p className="story-end-banner__text">— 故事已完结 —</p>
      <button type="button" className="story-end-banner__btn" onClick={onLeave}>
        阅毕离开
      </button>
    </div>
  );
}
