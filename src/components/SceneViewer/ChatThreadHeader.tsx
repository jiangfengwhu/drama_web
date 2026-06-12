import type { ChatThread } from '../../types/story-scene.types';
import {
  getSceneForThread,
} from '../../services/story-thread.util';
import { resolveSceneHeaderContent } from '../../services/scene-header.util';
import {
  lookupCharacterProfile,
  formatRelationSummary,
  type RelationItem,
} from '../../services/story-brief.util';
import type { StoryState } from '../../types/story.types';
import './ChatThreadHeader.css';

interface ChatThreadHeaderProps {
  storyState: StoryState;
  thread?: ChatThread;
  protagonistName: string;
  characterProfiles: Map<string, RelationItem>;
  onOpenDrawer?: () => void;
}

function resolvePrivateNpcName(
  thread: ChatThread,
  protagonistName: string,
): string {
  const hero = protagonistName.trim();
  const fromParticipants = thread.participantNames.find(
    (name) => name.trim() !== hero && name.trim() !== '你',
  );
  return fromParticipants?.trim() || thread.title.trim();
}

export function ChatThreadHeader({
  storyState,
  thread,
  protagonistName,
  characterProfiles,
  onOpenDrawer,
}: ChatThreadHeaderProps) {
  if (!thread) return null;

  const scene = getSceneForThread(storyState, thread);
  const isPrivate = thread.kind === 'private';
  const readonly = thread.status === 'readonly';
  const sceneHeader = resolveSceneHeaderContent(scene, thread);

  const privateNpcName = isPrivate
    ? resolvePrivateNpcName(thread, protagonistName)
    : '';
  const privateProfile = isPrivate
    ? lookupCharacterProfile(
        characterProfiles,
        privateNpcName,
        false,
        protagonistName,
      )
    : null;
  const privateIntro = privateProfile
    ? formatRelationSummary(privateProfile)
    : null;

  return (
    <header className="chat-thread-header">
      <div className="chat-thread-header__toolbar">
        {onOpenDrawer ? (
          <button
            type="button"
            className="chat-thread-header__drawer-btn"
            aria-label="打开对话列表"
            onClick={onOpenDrawer}
          >
            <span className="chat-thread-header__drawer-icon" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
        ) : null}

        <div className="chat-thread-header__toolbar-main">
          {isPrivate ? (
            <div className="chat-thread-header__private-wrap">
              <div className="chat-thread-header__private">
                <h2 className="chat-thread-header__private-name">{privateNpcName}</h2>
                {privateIntro ? (
                  <p className="chat-thread-header__private-whisper">{privateIntro}</p>
                ) : null}
              </div>
            </div>
          ) : sceneHeader ? (
            <div className="chat-thread-header__stage">
              <p className="chat-thread-header__slugline">{sceneHeader.slugline}</p>
            </div>
          ) : null}

          {readonly ? (
            <span className="chat-thread-header__readonly">仅可查看</span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
