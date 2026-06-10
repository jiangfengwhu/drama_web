import type { StoryActionRecord } from '../../types/story.types';
import './StoryJournal.css';

interface StoryJournalProps {
  records: StoryActionRecord[];
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
              {record.action.text}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
