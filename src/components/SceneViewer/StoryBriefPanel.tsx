import { useMemo, useEffect, useState, type ReactNode } from 'react';
import {
  MOBILE_BREAKPOINT_PX,
  STORY_BRIEF_SECTION,
} from '../../constants/story-brief.const';
import { useBriefRevealQueue } from '../../hooks/useBriefRevealQueue';
import {
  buildRelationList,
  buildCharacterProfileMap,
} from '../../services/story-brief.util';
import type { RelationItem } from '../../services/story-brief.util';
import type { StoryBackground } from '../../types/story.types';
import './StoryBriefPanel.css';

interface StoryBriefPanelProps {
  background: StoryBackground;
  protagonistName: string;
  themeTitle?: string;
  turnLabel: string;
  guideStreaming?: boolean;
}

type BriefRevealUnit =
  | { id: 'title'; kind: 'title'; title: string; subtitle?: string }
  | { id: 'detail'; kind: 'detail'; text: string }
  | { id: 'scene'; kind: 'scene'; text: string }
  | { id: string; kind: 'relation'; item: RelationItem };

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
  animate?: boolean;
}

function BriefSection({
  label,
  children,
  variant = 'default',
  animate = false,
}: BriefSectionProps) {
  return (
    <section
      className={`story-brief__section${variant === 'characters' ? ' story-brief__section--characters' : ''}${animate ? ' story-brief__block--pop' : ''}`}
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

function CharacterCard({
  item,
  animate = false,
}: {
  item: RelationItem;
  animate?: boolean;
}) {
  return (
    <article
      className={`story-brief__character-card${item.isProtagonist ? ' story-brief__character-card--protagonist' : ''}${animate ? ' story-brief__block--pop' : ''}`}
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

function buildBriefUnits(
  background: StoryBackground,
  protagonistName: string,
  themeTitle?: string,
): BriefRevealUnit[] {
  const displayTitle = background.title.trim() || themeTitle || '';
  const subtitle =
    themeTitle &&
    background.title.trim() &&
    themeTitle !== background.title.trim()
      ? themeTitle
      : undefined;
  const sceneText = background.sceneNow.trim();
  const relations = buildRelationList(
    buildCharacterProfileMap(background.characters, protagonistName),
    protagonistName,
  );

  const units: BriefRevealUnit[] = [];

  if (displayTitle) {
    units.push({ id: 'title', kind: 'title', title: displayTitle, subtitle });
  }
  if (background.prologue.trim()) {
    units.push({ id: 'detail', kind: 'detail', text: background.prologue.trim() });
  }
  if (sceneText.trim()) {
    units.push({ id: 'scene', kind: 'scene', text: sceneText.trim() });
  }

  for (const item of relations) {
    units.push({ id: item.id, kind: 'relation', item });
  }

  return units;
}

function renderBriefUnit(unit: BriefRevealUnit, animate: boolean) {
  switch (unit.kind) {
    case 'title':
      return (
        <div
          key={unit.id}
          className={`story-brief__intro${animate ? ' story-brief__block--pop' : ''}`}
        >
          <h2 className="story-brief__title">{unit.title}</h2>
          {unit.subtitle && (
            <p className="story-brief__subtitle">{unit.subtitle}</p>
          )}
        </div>
      );
    case 'detail':
      return (
        <BriefSection
          key={unit.id}
          label={STORY_BRIEF_SECTION.DETAIL}
          animate={animate}
        >
          <p className="story-brief__text">{unit.text}</p>
        </BriefSection>
      );
    case 'scene':
      return (
        <BriefSection
          key={unit.id}
          label={STORY_BRIEF_SECTION.SCENE}
          animate={animate}
        >
          <p className="story-brief__text story-brief__text--scene">
            {unit.text}
          </p>
        </BriefSection>
      );
    case 'relation':
      return (
        <CharacterCard key={unit.id} item={unit.item} animate={animate} />
      );
    default:
      return null;
  }
}

export function StoryBriefPanel({
  background,
  protagonistName,
  themeTitle,
  turnLabel,
  guideStreaming = false,
}: StoryBriefPanelProps) {
  const isMobile = useIsMobile();
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const panelExpanded = !isMobile || mobileExpanded;

  const briefUnits = useMemo(
    () => buildBriefUnits(background, protagonistName, themeTitle),
    [background, protagonistName, themeTitle],
  );

  const { visibleItems } = useBriefRevealQueue(briefUnits, guideStreaming);

  const displayUnits = guideStreaming ? visibleItems : briefUnits;
  const showGenerating = guideStreaming && displayUnits.length === 0;

  const bodyNodes: ReactNode[] = [];
  let relationBuffer: BriefRevealUnit[] = [];

  const flushRelations = () => {
    if (relationBuffer.length === 0) return;
    bodyNodes.push(
      <BriefSection
        key={`relations-${relationBuffer[0].id}`}
        label={STORY_BRIEF_SECTION.RELATIONS}
        variant="characters"
      >
        <div className="story-brief__character-list">
          {relationBuffer.map((unit) =>
            unit.kind === 'relation'
              ? renderBriefUnit(unit, guideStreaming)
              : null,
          )}
        </div>
      </BriefSection>,
    );
    relationBuffer = [];
  };

  for (const unit of displayUnits) {
    if (unit.kind === 'relation') {
      relationBuffer.push(unit);
      continue;
    }
    flushRelations();
    bodyNodes.push(renderBriefUnit(unit, guideStreaming));
  }
  flushRelations();

  return (
    <aside
      className={`story-brief${
        panelExpanded ? ' story-brief--expanded' : ' story-brief--collapsed'
      }`}
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
            className={`story-brief__toggle${
              mobileExpanded ? ' story-brief__toggle--expanded' : ''
            }`}
            onClick={() => setMobileExpanded((v) => !v)}
            aria-expanded={mobileExpanded}
          >
            {mobileExpanded ? '收起' : '展开'}
          </button>
        )}
      </header>

      <div
        className={`story-brief__body${
          panelExpanded ? ' story-brief__body--open' : ''
        }`}
        aria-hidden={!panelExpanded}
      >
        <div className="story-brief__scroll">
          {showGenerating && (
            <p className="story-brief__empty">剧本背景生成中…</p>
          )}
          {bodyNodes}
        </div>
      </div>
    </aside>
  );
}
