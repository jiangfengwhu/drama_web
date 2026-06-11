import { useEffect, useMemo, useRef, useState } from 'react';
import { FREE_FORM_MODE_LABEL } from '../../constants/interaction.const';
import { useBubbleRevealQueue } from '../../hooks/useBubbleRevealQueue';
import { buildTurnLabel } from '../../services/story-brief.util';
import { scriptLinesToTimeline } from '../../services/script-text.util';
import type { ScriptLine } from '../../types/script.types';
import type { SceneMood, StoryBackground } from '../../types/story.types';
import { EmotionSliderInput } from './EmotionSliderInput';
import { ChatComposer } from './ChatComposer';
import { ChatTimelineLoading } from './ChatTimelineLoading';
import { StoryBriefPanel } from './StoryBriefPanel';
import { StoryEndBanner } from './StoryEndBanner';
import { StoryTimeline } from './StoryTimeline';
import './SceneViewer.css';
import './StoryTimeline.css';
import './StoryBriefPanel.css';
import './ChatComposer.css';
import './StoryEndBanner.css';
import './EmotionSliderInput.css';
import './ChatComposer.css';

interface SceneViewerProps {
  background: StoryBackground;
  committedLines: ScriptLine[];
  partialLines: ScriptLine[];
  turnIndex: number;
  protagonistName: string;
  themeTitle?: string;
  mood?: SceneMood;
  isStreaming?: boolean;
  hasPendingStreamLine?: boolean;
  showInput?: boolean;
  storyComplete?: boolean;
  onLeaveStory?: () => void;
  inputDisabled?: boolean;
  attitudeCards?: string[];
  minActionLen: number;
  maxActionLen: number;
  audience: 'male' | 'female';
  onSubmit?: (text: string) => Promise<boolean>;
}

export function SceneViewer({
  background,
  committedLines,
  partialLines,
  turnIndex,
  protagonistName,
  themeTitle,
  mood = 'neutral',
  isStreaming = false,
  hasPendingStreamLine = false,
  showInput = false,
  storyComplete = false,
  onLeaveStory,
  inputDisabled = false,
  attitudeCards = [],
  minActionLen,
  maxActionLen,
  audience,
  onSubmit,
}: SceneViewerProps) {
  const messagesRef = useRef<HTMLDivElement>(null);
  const [freeFormMode, setFreeFormMode] = useState(false);
  const [awaitingTurn, setAwaitingTurn] = useState(false);

  const turnLabel = useMemo(() => buildTurnLabel(turnIndex), [turnIndex]);

  useEffect(() => {
    if (!isStreaming) return;
    setFreeFormMode(false);
  }, [isStreaming]);

  useEffect(() => {
    if (isStreaming || attitudeCards.length === 0) return;
    setFreeFormMode(false);
  }, [attitudeCards, isStreaming]);

  const committedTimeline = useMemo(
    () => scriptLinesToTimeline(committedLines, protagonistName, 0),
    [committedLines, protagonistName],
  );

  const streamingTimeline = useMemo(
    () =>
      scriptLinesToTimeline(
        partialLines,
        protagonistName,
        committedLines.length,
      ),
    [partialLines, protagonistName, committedLines.length],
  );

  const timelineTarget = useMemo(
    () =>
      isStreaming
        ? [...committedTimeline, ...streamingTimeline]
        : committedTimeline,
    [committedTimeline, streamingTimeline, isStreaming],
  );

  const { visibleItems, showQueueLoading, interactionReady } =
    useBubbleRevealQueue(
      committedTimeline,
      streamingTimeline,
      isStreaming,
      hasPendingStreamLine,
    );

  useEffect(() => {
    if (interactionReady) setAwaitingTurn(false);
  }, [interactionReady]);

  const canInteract =
    showInput &&
    !storyComplete &&
    !isStreaming &&
    !awaitingTurn &&
    interactionReady &&
    Boolean(onSubmit);
  const showEmotionSlider =
    canInteract && attitudeCards.length > 0 && !freeFormMode;
  const showComposer = canInteract && freeFormMode;
  const showEndBanner =
    storyComplete && interactionReady && Boolean(onLeaveStory);

  const showLoading =
    awaitingTurn || (!interactionReady && (isStreaming || showQueueLoading));
  const reserveDock =
    showInput || storyComplete || isStreaming || awaitingTurn;

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [visibleItems.length, showLoading, timelineTarget.length, turnIndex]);

  const handleSubmitEmotionLine = async (text: string) => {
    if (!onSubmit) return;
    setFreeFormMode(false);
    setAwaitingTurn(true);
    try {
      const ok = await onSubmit(text);
      if (!ok) setAwaitingTurn(false);
    } catch {
      setAwaitingTurn(false);
    }
  };

  const handleComposerSubmit = async (text: string) => {
    if (!onSubmit) return false;
    setAwaitingTurn(true);
    try {
      const ok = await onSubmit(text);
      if (ok) {
        setFreeFormMode(false);
      } else {
        setAwaitingTurn(false);
      }
      return ok;
    } catch {
      setAwaitingTurn(false);
      return false;
    }
  };

  return (
    <div className={`scene-viewer scene-viewer--${mood}`}>
      <div className="scene-viewer__brief-panel">
        <StoryBriefPanel
          background={background}
          protagonistName={protagonistName}
          themeTitle={themeTitle}
          turnLabel={turnLabel}
          guideStreaming={isStreaming && committedLines.length === 0}
        />
      </div>

      <div
        className={`scene-viewer__chat-panel${
          reserveDock ? ' scene-viewer__chat-panel--dock-reserved' : ''
        }`}
      >
        <div className="scene-viewer__messages" ref={messagesRef}>
          <StoryTimeline items={visibleItems} />
        </div>

        <div className="scene-viewer__chat-dock">
          <div
            className={`scene-viewer__dock-layer scene-viewer__dock-layer--loading${
              showLoading ? ' scene-viewer__dock-layer--visible' : ''
            }`}
            aria-hidden={!showLoading}
          >
            <ChatTimelineLoading mood={mood} />
          </div>

          <div
            className={`scene-viewer__dock-layer${
              showEmotionSlider ? ' scene-viewer__dock-layer--visible' : ''
            }`}
            aria-hidden={!showEmotionSlider}
          >
            <EmotionSliderInput
              key={turnIndex}
              lines={attitudeCards}
              disabled={inputDisabled}
              onSubmit={(text) => void handleSubmitEmotionLine(text)}
              onFreeForm={() => setFreeFormMode(true)}
            />
          </div>

          <div
            className={`scene-viewer__dock-layer${
              showComposer ? ' scene-viewer__dock-layer--visible' : ''
            }`}
            aria-hidden={!showComposer}
          >
            <div className={`chat-composer-bar${showComposer ? ' chat-composer-bar--enter' : ''}`}>
              <div className="chat-composer-bar__header">
                <button
                  type="button"
                  className="emotion-slider__free-btn emotion-slider__free-btn--active"
                  disabled={inputDisabled}
                  onClick={() => setFreeFormMode(false)}
                >
                  {FREE_FORM_MODE_LABEL}
                </button>
              </div>
              <ChatComposer
                disabled={inputDisabled}
                minLen={minActionLen}
                maxLen={maxActionLen}
                audience={audience}
                onSubmit={handleComposerSubmit}
              />
            </div>
          </div>

          <div
            className={`scene-viewer__dock-layer${
              showEndBanner ? ' scene-viewer__dock-layer--visible' : ''
            }`}
            aria-hidden={!showEndBanner}
          >
            {onLeaveStory && <StoryEndBanner onLeave={onLeaveStory} />}
          </div>
        </div>
      </div>
    </div>
  );
}
