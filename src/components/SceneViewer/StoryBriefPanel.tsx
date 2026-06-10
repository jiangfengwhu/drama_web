import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  MOBILE_BREAKPOINT_PX,
  STORY_BRIEF_SECTION,
} from '../../constants/story-brief.const';
import { buildSceneBriefText, parseRelationLines } from '../../services/story-brief.util';
import type { RelationItem } from '../../services/story-brief.util';
import type { StoryBackground } from '../../types/story.types';
import './StoryBriefPanel.css';

interface StoryBriefPanelProps {
  background: StoryBackground;
  protagonistName: string;
  themeTitle?: string;
  turnLabel: string;
}

function useIsMobile(breakpoint = MOBILE_BREAKPOINT_PX): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width: ${breakpoint}px)`).matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);

  return isMobile;
}

interface BriefSectionProps {
  label: string;
  children: ReactNode;
  variant?: 'default' | 'characters';
}

function BriefSection({
  label,
  children,
  variant = 'default',
}: BriefSectionProps) {
  return (
    <section
      className={`story-brief__section${variant === 'characters' ? ' story-brief__section--characters' : ''}`}
    >
      <h3 className="story-brief__section-label">{label}</h3>
      {variant === 'default' ? (
        <div className="story-brief__section-body">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}

function CharacterCard({ item }: { item: RelationItem }) {
  return (
    <article
      className={`story-brief__character-card${item.isProtagonist ? ' story-brief__character-card--protagonist' : ''}`}
    >
      <header className="story-brief__character-header">
        <span className="story-brief__character-name">{item.name}</span>
        {item.isProtagonist && (
          <span className="story-brief__character-badge">你</span>
        )}
      </header>
      {item.headline && (
        <p className="story-brief__character-headline">{item.headline}</p>
      )}
      {item.description && (
        <p className="story-brief__character-desc">{item.description}</p>
      )}
    </article>
  );
}

export function StoryBriefPanel({
  background,
  protagonistName,
  themeTitle,
  turnLabel,
}: StoryBriefPanelProps) {
  const isMobile = useIsMobile();
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const panelExpanded = !isMobile || mobileExpanded;

  const displayTitle = background.title.trim() || themeTitle || '剧本';
  const subtitle =
    themeTitle && background.title.trim() && themeTitle !== background.title.trim()
      ? themeTitle
      : undefined;

  const relations = useMemo(
    () => parseRelationLines(background.relationships, protagonistName),
    [background.relationships, protagonistName],
  );

  const sceneText = useMemo(
    () => buildSceneBriefText(background.summary, background.sceneNow),
    [background.summary, background.sceneNow],
  );

  const hasContent =
    Boolean(sceneText.trim()) ||
    relations.length > 0 ||
    Boolean(background.detail.trim());

  return (
    <aside
      className={`story-brief ${!panelExpanded ? 'story-brief--collapsed' : ''}`}
      aria-label="剧本概览"
    >
      <header className="story-brief__header">
        <div className="story-brief__header-main">
          <span className="story-brief__label">大局观</span>
          <span className="story-brief__turn">{turnLabel}</span>
        </div>
        {isMobile && (
          <button
            type="button"
            className="story-brief__toggle"
            onClick={() => setMobileExpanded((v) => !v)}
            aria-expanded={mobileExpanded}
          >
            {mobileExpanded ? '收起' : '展开'}
          </button>
        )}
      </header>

      {panelExpanded && (
        <div className="story-brief__scroll">
          <div className="story-brief__intro">
            <h2 className="story-brief__title">{displayTitle}</h2>
            {subtitle && (
              <p className="story-brief__subtitle">{subtitle}</p>
            )}
          </div>

          {!hasContent && (
            <p className="story-brief__empty">剧本背景生成中…</p>
          )}

          {background.detail.trim() && (
            <BriefSection label={STORY_BRIEF_SECTION.DETAIL}>
              <p className="story-brief__text">{background.detail.trim()}</p>
            </BriefSection>
          )}

          {sceneText.trim() && (
            <BriefSection label={STORY_BRIEF_SECTION.SCENE}>
              <p className="story-brief__text story-brief__text--scene">
                {sceneText.trim()}
              </p>
            </BriefSection>
          )}

          {relations.length > 0 && (
            <BriefSection
              label={STORY_BRIEF_SECTION.RELATIONS}
              variant="characters"
            >
              <div className="story-brief__character-list">
                {relations.map((item) => (
                  <CharacterCard key={item.id} item={item} />
                ))}
              </div>
            </BriefSection>
          )}
        </div>
      )}
    </aside>
  );
}
