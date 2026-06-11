import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import { SceneViewer } from '../../components/SceneViewer/SceneViewer';
import { resolveTheme } from '../../constants/themes';
import { useAdmissionTicket } from '../../hooks/useAdmissionTicket';
import { useStory } from '../../hooks/useStory';
import type { StoryConfig } from '../../types/story.types';
import './StoryPlay.css';

export function StoryPlayPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = (location.state as { config?: StoryConfig } | null)?.config;
  const ticketConsumed = (location.state as { ticketConsumed?: boolean } | null)?.ticketConsumed;

  const { tickets } = useAdmissionTicket();
  const {
    storyState,
    displayBackground,
    committedLines,
    partialLines,
    streamState,
    loading,
    isStreaming,
    storyComplete,
    showEndingScreen,
    leaveStory,
    attitudeCards,
    hasPendingStreamLine,
    startStory,
    submitAction,
    resetStory,
    minActionLen,
    maxActionLen,
  } = useStory();

  const startedRef = useRef(false);

  useEffect(() => {
    if (!config) {
      navigate('/create', { replace: true });
      return;
    }
    if (!config.protagonistName?.trim()) {
      navigate('/create', { replace: true });
      return;
    }
    if (!ticketConsumed) {
      navigate('/create', { replace: true });
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    startStory(config);
  }, [config, ticketConsumed, navigate, startStory]);

  if (!config) return null;

  const theme = resolveTheme(config);
  const showViewer = storyState !== null;

  if (showEndingScreen) {
    return (
      <Layout tickets={tickets}>
        <div className="story-play__ending">
          <span className="story-play__ending-tag">— END —</span>
          <h1>故事暂告段落</h1>
          <p>《{theme.title}》的故事在此告一段落，感谢你的每一次选择。</p>
          <div className="story-play__ending-actions">
            <Link to="/create" className="story-play__btn" onClick={resetStory}>
              开启新故事
            </Link>
            <Link to="/" className="story-play__btn story-play__btn--ghost">
              返回首页
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!showViewer) {
    return (
      <Layout tickets={tickets}>
        <div className="story-play__loading-screen">
          <div className="story-play__loading-ring" />
          <p>正在进入群聊…</p>
          <span className="story-play__loading-sub">AI 正在布置场景</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout tickets={tickets}>
      <div className="story-play">
        <SceneViewer
          background={displayBackground ?? storyState.background}
          committedLines={committedLines}
          partialLines={partialLines}
          turnIndex={storyState.turnIndex}
          protagonistName={config.protagonistName}
          themeTitle={theme.title}
          mood={streamState?.mood ?? storyState.mood}
          isStreaming={isStreaming}
          hasPendingStreamLine={hasPendingStreamLine}
          showInput={!storyComplete}
          storyComplete={storyComplete}
          onLeaveStory={leaveStory}
          inputDisabled={loading}
          attitudeCards={attitudeCards}
          minActionLen={minActionLen}
          maxActionLen={maxActionLen}
          audience={config.audience}
          onSubmit={submitAction}
        />
      </div>
    </Layout>
  );
}
