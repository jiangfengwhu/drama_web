import { useEffect, useMemo, useRef } from 'react';
import { buildTurnLabel } from '../../services/story-brief.util';
import { scriptLinesToTimeline } from '../../services/script-text.util';
import type { ScriptLine } from '../../types/script.types';
import type { SceneMood, StoryBackground } from '../../types/story.types';
import { ChatComposer } from './ChatComposer';
import { StoryBriefPanel } from './StoryBriefPanel';
import { StoryTimeline } from './StoryTimeline';
import './SceneViewer.css';
import './StoryTimeline.css';
import './StoryBriefPanel.css';
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
  showInput?: boolean;
  inputDisabled?: boolean;
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
  showInput = false,
  inputDisabled = false,
  minActionLen,
  maxActionLen,
  audience,
  onSubmit,
}: SceneViewerProps) {
  const messagesRef = useRef<HTMLDivElement>(null);

  const turnLabel = useMemo(() => buildTurnLabel(turnIndex), [turnIndex]);

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

  const timelineItems = useMemo(
    () =>
      isStreaming
        ? [...committedTimeline, ...streamingTimeline]
        : committedTimeline,
    [committedTimeline, streamingTimeline, isStreaming],
  );

  const showLoading = isStreaming && streamingTimeline.length === 0;

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [timelineItems.length, showLoading, committedLines.length, turnIndex]);

  return (
    <div className={`scene-viewer scene-viewer--${mood}`}>
      <div className="scene-viewer__brief-panel">
        <StoryBriefPanel
          background={background}
          protagonistName={protagonistName}
          themeTitle={themeTitle}
          turnLabel={turnLabel}
        />
      </div>

      <div className="scene-viewer__chat-panel">
        <div className="scene-viewer__messages" ref={messagesRef}>
          <StoryTimeline items={timelineItems} isLoading={showLoading} />
        </div>

        {showInput && onSubmit && (
          <ChatComposer
            disabled={inputDisabled || isStreaming}
            minLen={minActionLen}
            maxLen={maxActionLen}
            audience={audience}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </div>
  );
}
