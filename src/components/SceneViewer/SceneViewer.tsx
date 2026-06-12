import { useEffect, useMemo, useRef, useState } from 'react';
import { useBubbleRevealQueue } from '../../hooks/useBubbleRevealQueue';
import {
  buildCharacterProfileMap,
  buildCharacterProfileMapFromLines,
  collectMentionCandidates,
  mergeCharacterProfileMaps,
} from '../../services/story-brief.util';
import {
  getSceneForThread,
  getSceneGroupThreadLines,
} from '../../services/story-thread.util';
import { scriptLinesToTimeline } from '../../services/script-text.util';
import type { ChatThread } from '../../types/story-scene.types';
import type { ScriptLine } from '../../types/script.types';
import type { SceneMood, StoryBackground, StoryState } from '../../types/story.types';
import { ChatThreadHeader } from './ChatThreadHeader';
import { ConversationListPanel } from './ConversationListPanel';
import { ConversationDrawer } from './ConversationDrawer';
import { ChatComposer } from './ChatComposer';
import { ChatTimelineLoading } from './ChatTimelineLoading';
import { StoryEndBanner } from './StoryEndBanner';
import { StoryTimeline } from './StoryTimeline';
import './SceneViewer.css';
import './StoryTimeline.css';
import './CharacterAvatar.css';
import './ChatComposer.css';
import './StoryEndBanner.css';
import './ConversationListPanel.css';
import './ConversationDrawer.css';
import './ChatThreadHeader.css';

interface SceneViewerProps {
  storyState: StoryState;
  background: StoryBackground;
  activeThread?: ChatThread;
  committedLines: ScriptLine[];
  partialLines: ScriptLine[];
  turnIndex: number;
  protagonistName: string;
  mood?: SceneMood;
  isStreaming?: boolean;
  hasPendingStreamLine?: boolean;
  canWriteActiveThread?: boolean;
  showInput?: boolean;
  storyComplete?: boolean;
  onLeaveStory?: () => void;
  inputDisabled?: boolean;
  minActionLen: number;
  maxActionLen: number;
  onSubmit?: (text: string) => Promise<boolean>;
  onSelectThread: (threadId: string) => void;
  onPrivateChat: (npcName: string) => void;
}

export function SceneViewer({
  storyState,
  background,
  activeThread,
  committedLines,
  partialLines,
  turnIndex,
  protagonistName,
  mood = 'neutral',
  isStreaming = false,
  hasPendingStreamLine = false,
  canWriteActiveThread = true,
  showInput = false,
  storyComplete = false,
  onLeaveStory,
  inputDisabled = false,
  minActionLen,
  maxActionLen,
  onSubmit,
  onSelectThread,
  onPrivateChat,
}: SceneViewerProps) {
  const messagesRef = useRef<HTMLDivElement>(null);
  const [awaitingTurn, setAwaitingTurn] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const characterProfiles = useMemo(() => {
    const fromGuide = buildCharacterProfileMap(
      background.characters,
      protagonistName,
    );
    const fromDialogue = buildCharacterProfileMapFromLines(
      committedLines,
      protagonistName,
    );
    return mergeCharacterProfileMaps(fromGuide, fromDialogue);
  }, [background.characters, committedLines, protagonistName]);

  const mentionCandidates = useMemo(() => {
    if (!activeThread) return [];

    const scene = getSceneForThread(storyState, activeThread);
    const groupLines = scene ? getSceneGroupThreadLines(storyState, scene) : [];
    const dialogueLines = [...committedLines, ...partialLines, ...groupLines];

    return collectMentionCandidates(
      characterProfiles,
      dialogueLines,
      protagonistName,
      [
        ...(scene?.presentCast ?? []),
        ...activeThread.participantNames,
      ],
    );
  }, [
    activeThread,
    storyState,
    protagonistName,
    characterProfiles,
    committedLines,
    partialLines,
  ]);

  useEffect(() => {
    setAwaitingTurn(false);
    setDrawerOpen(false);
  }, [storyState.activeThreadId]);

  const handleSelectThread = (threadId: string) => {
    onSelectThread(threadId);
    setDrawerOpen(false);
  };

  const convListProps = {
    storyState,
    background,
    activeThreadId: storyState.activeThreadId,
    protagonistName,
    prologueLoading:
      isStreaming && committedLines.length === 0 && !background.prologue.trim(),
    onSelectThread: handleSelectThread,
  };

  const threadId = storyState.activeThreadId;

  const committedTimeline = useMemo(
    () => scriptLinesToTimeline(committedLines, protagonistName, 0, threadId),
    [committedLines, protagonistName, threadId],
  );

  const streamingTimeline = useMemo(
    () =>
      scriptLinesToTimeline(
        partialLines,
        protagonistName,
        committedLines.length,
        threadId,
      ),
    [partialLines, protagonistName, committedLines.length, threadId],
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
      threadId,
    );

  useEffect(() => {
    if (interactionReady) setAwaitingTurn(false);
  }, [interactionReady]);

  const canInteract =
    showInput &&
    canWriteActiveThread &&
    !storyComplete &&
    !isStreaming &&
    !awaitingTurn &&
    interactionReady &&
    Boolean(onSubmit);
  const showComposer = canInteract;
  const showEndBanner =
    storyComplete && interactionReady && Boolean(onLeaveStory);

  const showLoading =
    awaitingTurn || (!interactionReady && (isStreaming || showQueueLoading));
  const reserveDock =
    (showInput && canWriteActiveThread) || storyComplete || isStreaming || awaitingTurn;

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [visibleItems.length, showLoading, timelineTarget.length, turnIndex, storyState.activeThreadId]);

  const handleComposerSubmit = async (text: string) => {
    if (!onSubmit) return false;
    setAwaitingTurn(true);
    try {
      const ok = await onSubmit(text);
      if (!ok) setAwaitingTurn(false);
      return ok;
    } catch {
      setAwaitingTurn(false);
      return false;
    }
  };

  return (
    <div className={`scene-viewer scene-viewer--${mood}`}>
      <div className="scene-viewer__sidebar">
        <ConversationListPanel {...convListProps} />
      </div>

      <ConversationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <ConversationListPanel {...convListProps} />
      </ConversationDrawer>

      <div
        className={`scene-viewer__chat-panel${
          reserveDock ? ' scene-viewer__chat-panel--dock-reserved' : ''
        }`}
      >
        <ChatThreadHeader
          storyState={storyState}
          thread={activeThread}
          protagonistName={protagonistName}
          characterProfiles={characterProfiles}
          onOpenDrawer={() => setDrawerOpen(true)}
        />

        <div className="scene-viewer__messages" ref={messagesRef}>
          <div className="scene-viewer__chat-flow">
            <StoryTimeline
              items={visibleItems}
              threadId={threadId}
              characterProfiles={characterProfiles}
              protagonistName={protagonistName}
              onPrivateChat={onPrivateChat}
            />
          </div>
        </div>

        {!canWriteActiveThread && activeThread?.status === 'readonly' ? (
          <div className="scene-viewer__readonly-hint" aria-live="polite">
            该场景已完结，仅可查看历史消息
          </div>
        ) : null}

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
              showComposer ? ' scene-viewer__dock-layer--visible' : ''
            }`}
            aria-hidden={!showComposer}
          >
            <div className={`chat-composer-bar${showComposer ? ' chat-composer-bar--enter' : ''}`}>
              <ChatComposer
                key={`${storyState.activeThreadId}-${turnIndex}`}
                disabled={inputDisabled}
                minLen={minActionLen}
                maxLen={maxActionLen}
                mentionCandidates={mentionCandidates}
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
