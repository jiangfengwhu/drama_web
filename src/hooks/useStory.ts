import { useCallback, useRef, useState } from 'react';
import {
  createInitialStreamState,
  createStoryState,
  generateNpcTurnStreaming,
  generateOpeningStreaming,
  mergeTurnResult,
  recordUserAction,
  toPlayerAction,
} from '../services/story-engine.service';
import {
  mergePartialTailLine,
  prepareDisplayScriptLines,
} from '../services/script-text.util';
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
): ScriptLine[] {
  if (!streamState?.isStreaming) return [];

  const raw = streamState.liveTail?.trim()
    ? mergePartialTailLine(streamState.scriptLines, streamState.liveTail)
    : streamState.scriptLines;

  return prepareDisplayScriptLines(raw, {
    stripProtagonist: isOpeningStream,
    protagonistName,
  });
}

export function useStory() {
  const [storyState, setStoryState] = useState<StoryState | null>(null);
  const [streamState, setStreamState] = useState<SceneStreamState | null>(null);
  const [finished, setFinished] = useState(false);
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
    async (config: StoryConfig, openingBase: StoryBackground) => {
      abortRef.current = false;
      setStreamState(createInitialStreamState(0));

      await generateOpeningStreaming(config, openingBase, (update) => {
        handleStreamEvent(update, (complete) => {
          setStoryState((prev) => {
            if (!prev) return prev;
            const merged = mergeTurnResult(prev, complete.payload, true);
            if (complete.payload.isComplete) setFinished(true);
            return merged;
          });
          setStreamState(null);
        });
      });
    },
    [handleStreamEvent],
  );

  const runNpcTurn = useCallback(
    async (state: StoryState, userAction: string) => {
      setStreamState(createInitialStreamState(state.turnIndex));

      await generateNpcTurnStreaming(
        state.config,
        state.scriptLines,
        state.actionHistory.length,
        userAction,
        (update) => {
          handleStreamEvent(update, (complete) => {
            setStoryState((prev) => {
              if (!prev) return prev;
              const merged = mergeTurnResult(prev, complete.payload, false);
              if (complete.payload.isComplete) setFinished(true);
              return merged;
            });
            setStreamState(null);
          });
        },
      );
    },
    [handleStreamEvent],
  );

  const startStory = useCallback(
    async (config: StoryConfig) => {
      setFinished(false);
      setStreamState(null);
      const state = createStoryState(config);
      setStoryState(state);

      try {
        await runOpening(config, state.background);
      } catch {
        setStreamState(null);
      }
    },
    [runOpening],
  );

  const submitAction = useCallback(
    async (rawText: string) => {
      if (!storyState || streamState?.isStreaming || finished) return false;

      const text = rawText.trim();
      if (text.length < MIN_ACTION_LEN || text.length > MAX_ACTION_LEN) {
        return false;
      }

      const withAction = recordUserAction(storyState, text);
      setStoryState(withAction);
      setStreamState(createInitialStreamState(withAction.turnIndex));

      try {
        await runNpcTurn(withAction, text);
      } catch {
        setStreamState(null);
      }

      return true;
    },
    [storyState, streamState, finished, runNpcTurn],
  );

  const resetStory = useCallback(() => {
    abortRef.current = true;
    setStoryState(null);
    setStreamState(null);
    setFinished(false);
  }, []);

  const isStreaming = streamState?.isStreaming ?? false;
  const committedLines = storyState?.scriptLines ?? [];
  const isOpeningStream = isStreaming && committedLines.length === 0;

  const partialLines = streamingLines(
    streamState,
    storyState?.config.protagonistName ?? '你',
    isOpeningStream,
  );

  const displayBackground =
    isOpeningStream && streamState?.background
      ? streamState.background
      : storyState?.background;

  return {
    storyState,
    displayBackground,
    committedLines,
    partialLines,
    streamState,
    isOpeningStream,
    loading: isStreaming,
    isStreaming,
    finished,
    startStory,
    submitAction,
    resetStory,
    minActionLen: MIN_ACTION_LEN,
    maxActionLen: MAX_ACTION_LEN,
  };
}

export { toPlayerAction };
