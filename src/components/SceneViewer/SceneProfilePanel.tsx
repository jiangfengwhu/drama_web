import type { RelationItem } from '../../services/story-brief.util';
import type { StoryBackground } from '../../types/story.types';
import './SceneProfilePanel.css';

interface SceneProfilePanelProps {
  background: StoryBackground;
  themeTitle?: string;
  turnLabel: string;
  relations: RelationItem[];
  hoveredProfile: RelationItem | null;
  loading?: boolean;
}

function ProfileCard({
  item,
  active,
}: {
  item: RelationItem;
  active?: boolean;
}) {
  return (
    <article
      className={`scene-profile__card${
        item.isProtagonist ? ' scene-profile__card--protagonist' : ''
      }${active ? ' scene-profile__card--active' : ''}`}
    >
      <header className="scene-profile__card-head">
        <span className="scene-profile__card-name">{item.name}</span>
        {item.isProtagonist ? (
          <span className="scene-profile__card-badge">你</span>
        ) : null}
      </header>
      {item.headline ? (
        <p className="scene-profile__card-headline">{item.headline}</p>
      ) : null}
      {item.description ? (
        <p className="scene-profile__card-desc">{item.description}</p>
      ) : !item.headline && item.raw ? (
        <p className="scene-profile__card-desc">{item.raw}</p>
      ) : null}
    </article>
  );
}

export function SceneProfilePanel({
  background,
  themeTitle,
  turnLabel,
  relations,
  hoveredProfile,
  loading = false,
}: SceneProfilePanelProps) {
  const displayTitle = background.title.trim() || themeTitle || '';
  const sceneText = background.sceneNow.trim();

  const focusProfile = hoveredProfile ?? relations[0] ?? null;

  return (
    <aside className="scene-profile" aria-label="人物信息">
      <header className="scene-profile__header">
        <span className="scene-profile__label">人物</span>
        <span className="scene-profile__turn">{turnLabel}</span>
      </header>

      {displayTitle ? (
        <h2 className="scene-profile__title">{displayTitle}</h2>
      ) : null}

      {sceneText ? (
        <p className="scene-profile__scene">{sceneText}</p>
      ) : null}

      <div className="scene-profile__body">
        {loading && relations.length === 0 ? (
          <p className="scene-profile__hint">人物介绍生成中…</p>
        ) : focusProfile ? (
          <>
            <p className="scene-profile__hint">
              {hoveredProfile
                ? '当前查看'
                : '悬停右侧头像切换人物'}
            </p>
            <ProfileCard item={focusProfile} active={Boolean(hoveredProfile)} />
          </>
        ) : (
          <p className="scene-profile__hint">悬停右侧头像查看人物介绍</p>
        )}

        {relations.length > 1 ? (
          <ul className="scene-profile__list">
            {relations.map((item) => (
              <li
                key={item.id}
                className={`scene-profile__list-item${
                  focusProfile?.id === item.id
                    ? ' scene-profile__list-item--active'
                    : ''
                }`}
              >
                <span className="scene-profile__list-name">{item.name}</span>
                {item.headline ? (
                  <span className="scene-profile__list-meta">{item.headline}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}
