import { useCallback, useRef, useState } from 'react';
import {
  createInitialStreamState,
  createStoryState,
  generateNpcTurnStreaming,
  generateOpeningStreaming,
  mergeTurnResult,
  recordUserAction,
} from '../services/story-engine.service';
import {
  parseUserInput,
  userInputEffectiveLength,
} from '../services/user-input.util';
import {
  ensurePrivateThread,
  getActiveMood,
  getActiveThread,
  getPendingSceneThread,
  getThreadLines,
  isThreadWritable,
  splitScriptLinesAtSceneCut,
  switchActiveThread,
} from '../services/story-thread.util';
import { prepareDisplayScriptLines, stripLeadingProtagonistEcho } from '../services/script-text.util';
import type {
  SceneStreamState,
  SceneStreamUpdate,
  StoryBackground,
  StoryConfig,
  StoryState,
} from '../types/story.types';
import type { ScriptLine } from '../types/script.types';

const MIN_ACTION_LEN = 2;
const MAX_ACTION_LEN = 200;

function applyChunkUpdate(
  prev: SceneStreamState,
  update: Extract<SceneStreamUpdate, { kind: 'chunk' }>,
): SceneStreamState {
  const { fields, revision } = update;
  return {
    ...prev,
    streamRevision: revision,
    isStreaming: true,
    mood: fields.mood !== undefined ? fields.mood : prev.mood,
    sceneCut:
      fields.sceneCut !== undefined ? fields.sceneCut : prev.sceneCut,
    lockedScript:
      fields.lockedScript !== undefined ? fields.lockedScript : prev.lockedScript,
    scriptLines:
      fields.scriptLines !== undefined ? fields.scriptLines : prev.scriptLines,
    liveTail: fields.liveTail !== undefined ? fields.liveTail : prev.liveTail,
    background:
      fields.background !== undefined ? fields.background : prev.background,
  };
}

function streamingLines(
  streamState: SceneStreamState | null,
  protagonistName: string,
  isOpeningStream: boolean,
  activeThreadKind?: 'scene' | 'private',
): ScriptLine[] {
  if (!streamState?.isStreaming) return [];

  const raw = prepareDisplayScriptLines(streamState.scriptLines, {
    stripProtagonist: isOpeningStream,
    protagonistName,
  });

  if (!isOpeningStream) {
    const withoutEcho = stripLeadingProtagonistEcho(raw, protagonistName);
    if (streamState.sceneCut && activeThreadKind === 'scene') {
      return splitScriptLinesAtSceneCut(withoutEcho).closingLines;
    }
    return withoutEcho;
  }

  return raw;
}

export function useStory() {
  const [storyState, setStoryState] = useState<StoryState | null>(null);
  const [streamState, setStreamState] = useState<SceneStreamState | null>(null);
  const [storyComplete, setStoryComplete] = useState(false);
  const [showEndingScreen, setShowEndingScreen] = useState(false);
  const abortRef = useRef(false);

  const pushStreamUpdate = useCallback((update: SceneStreamUpdate) => {
    setStreamState((prev) => {
      if (!prev) return null;
      if (update.kind !== 'chunk') return prev;
      return applyChunkUpdate(prev, update);
    });
  }, []);

  const handleStreamEvent = useCallback(
    (
      update: SceneStreamUpdate,
      onTurnComplete: (payload: SceneStreamUpdate & { kind: 'turn_complete' }) => void,
    ) => {
      if (abortRef.current) return;

      if (update.kind === 'turn_complete') {
        onTurnComplete(update);
        return;
      }

      pushStreamUpdate(update);
    },
    [pushStreamUpdate],
  );

  const runOpening = useCallback(
    async (config: StoryConfig, openingBase: StoryBackground, threadId: string) => {
      abortRef.current = false;
      setStreamState(createInitialStreamState(0, threadId));

      await generateOpeningStreaming(config, openingBase, threadId, (update) => {
        handleStreamEvent(update, (complete) => {
          setStoryState((prev) => {
            if (!prev) return prev;
            const merged = mergeTurnResult(prev, complete.payload, true);
            if (complete.payload.isComplete) setStoryComplete(true);
            return merged;
          });
          setStreamState(null);
        });
      });
    },
    [handleStreamEvent],
  );

  const runNpcTurn = useCallback(
    async (state: StoryState, userInput: ReturnType<typeof parseUserInput>) => {
      setStreamState(
        createInitialStreamState(state.turnIndex, state.activeThreadId),
      );

      await generateNpcTurnStreaming(state, userInput, (update) => {
        handleStreamEvent(update, (complete) => {
          setStoryState((prev) => {
            if (!prev) return prev;
            const merged = mergeTurnResult(prev, complete.payload, false);
            if (complete.payload.isComplete) setStoryComplete(true);
            return merged;
          });
          setStreamState(null);
        });
      });
    },
    [handleStreamEvent],
  );

  const startStory = useCallback(
    async (config: StoryConfig) => {
      setStoryComplete(false);
      setShowEndingScreen(false);
      setStreamState(null);
      const state = createStoryState(config);
      setStoryState(state);

      try {
        await runOpening(config, state.background, state.activeThreadId);
      } catch {
        setStreamState(null);
      }
    },
    [runOpening],
  );

  const submitAction = useCallback(
    async (rawText: string) => {
      if (!storyState || streamState?.isStreaming || storyComplete) return false;

      const thread = getActiveThread(storyState);
      if (!thread || !isThreadWritable(thread)) return false;

      const text = rawText.trim();
      const userInput = parseUserInput(text);
      if (
        userInputEffectiveLength(userInput) < MIN_ACTION_LEN ||
        text.length > MAX_ACTION_LEN
      ) {
        return false;
      }

      const withAction = recordUserAction(storyState, userInput);
      setStoryState(withAction);
      setStreamState(
        createInitialStreamState(withAction.turnIndex, withAction.activeThreadId),
      );

      try {
        await runNpcTurn(withAction, userInput);
      } catch {
        setStreamState(null);
      }

      return true;
    },
    [storyState, streamState, storyComplete, runNpcTurn],
  );

  const selectThread = useCallback((threadId: string) => {
    setStoryState((prev) => {
      if (!prev) return prev;
      return switchActiveThread(prev, threadId);
    });
    setStreamState(null);
  }, []);

  const advanceToNextScene = useCallback(() => {
    setStoryState((prev) => {
      if (!prev) return prev;
      const pending = getPendingSceneThread(prev);
      if (!pending) return prev;
      return switchActiveThread(prev, pending.id);
    });
    setStreamState(null);
  }, []);

  const openPrivateChat = useCallback(
    (npcName: string) => {
      if (!storyState) return;
      const protagonist = storyState.config.protagonistName.trim();
      setStoryState(ensurePrivateThread(storyState, npcName, protagonist));
      setStreamState(null);
    },
    [storyState],
  );

  const resetStory = useCallback(() => {
    abortRef.current = true;
    setStoryState(null);
    setStreamState(null);
    setStoryComplete(false);
    setShowEndingScreen(false);
  }, []);

  const leaveStory = useCallback(() => {
    setShowEndingScreen(true);
  }, []);

  const activeThread = storyState ? getActiveThread(storyState) : undefined;
  const committedLines = storyState
    ? getThreadLines(storyState, storyState.activeThreadId)
    : [];

  const isStreaming = streamState?.isStreaming ?? false;
  const isOpeningStream = isStreaming && committedLines.length === 0;

  const partialLines = streamingLines(
    streamState,
    storyState?.config.protagonistName ?? '你',
    isOpeningStream,
    activeThread?.kind,
  );

  const pendingSceneThread = storyState
    ? getPendingSceneThread(storyState)
    : undefined;

  const displayBackground =
    isOpeningStream && streamState?.background
      ? streamState.background
      : storyState?.background;

  const mood = isStreaming && streamState?.mood
    ? streamState.mood
    : storyState
      ? getActiveMood(storyState)
      : 'neutral';

  const hasPendingStreamLine = Boolean(streamState?.liveTail?.trim());
  const canWriteActiveThread = Boolean(
    activeThread && isThreadWritable(activeThread) && !storyComplete,
  );

  return {
    storyState,
    activeThread,
    displayBackground,
    committedLines,
    partialLines,
    streamState,
    mood,
    hasPendingStreamLine,
    isOpeningStream,
    canWriteActiveThread,
    loading: isStreaming,
    isStreaming,
    storyComplete,
    showEndingScreen,
    leaveStory,
    startStory,
    submitAction,
    selectThread,
    advanceToNextScene,
    pendingSceneThread,
    openPrivateChat,
    resetStory,
    minActionLen: MIN_ACTION_LEN,
    maxActionLen: MAX_ACTION_LEN,
  };
}
