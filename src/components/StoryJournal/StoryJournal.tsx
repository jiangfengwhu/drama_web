import type { StoryActionRecord } from '../../types/story.types';
import './StoryJournal.css';

interface StoryJournalProps {
  records: StoryActionRecord[];
}

function formatActionRecord(action: StoryActionRecord['action']): string {
  if (action.dialogue && action.behaviors.length > 0) {
    return `${action.dialogue} #(${action.behaviors.join(') #(')})`;
  }
  if (action.dialogue) return action.dialogue;
  if (action.behaviors.length > 0) {
    return action.behaviors.map((b) => `#(${b})`).join(' ');
  }
  return action.raw;
}

export function StoryJournal({ records }: StoryJournalProps) {
  if (records.length === 0) return null;

  return (
    <aside className="story-journal">
      <h3 className="story-journal__title">你的消息</h3>
      <ol className="story-journal__list">
        {records.map((record, i) => (
          <li key={`${record.turnIndex}-${i}`} className="story-journal__item">
            <span className="story-journal__chapter">#{record.turnIndex + 1}</span>
            <span className="story-journal__action story-journal__action--custom">
              {formatActionRecord(record.action)}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
