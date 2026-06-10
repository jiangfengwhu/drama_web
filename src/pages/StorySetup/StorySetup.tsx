import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import {
  LENGTH_LABELS,
  TICKET_PACK_PRICE_LABEL,
  TICKET_PACK_SIZE,
} from '../../constants/game.const';
import { THEMES } from '../../constants/themes';
import { useAdmissionTicket } from '../../hooks/useAdmissionTicket';
import type {
  AudienceType,
  StoryConfig,
  StoryLength,
  ThemeId,
} from '../../types/story.types';
import './StorySetup.css';

const CHARACTER_OPTIONS = [2, 3, 4, 5];

export function StorySetupPage() {
  const navigate = useNavigate();
  const { tickets, hasTicket, consumeTicket, purchaseTicketPack } =
    useAdmissionTicket();

  const [themeId, setThemeId] = useState<ThemeId>('business-war');
  const [audience, setAudience] = useState<AudienceType>('male');
  const [length, setLength] = useState<StoryLength>('short');
  const [characterCount, setCharacterCount] = useState(3);
  const [protagonistName, setProtagonistName] = useState('');
  const [ticketError, setTicketError] = useState<string | null>(null);

  const selectedTheme = THEMES.find((t) => t.id === themeId)!;

  const handleStart = () => {
    if (!hasTicket) {
      setTicketError('入场券不足，请先购买后再进入故事');
      return;
    }

    const consumed = consumeTicket();
    if (!consumed) {
      setTicketError('入场券消耗失败，请重试');
      return;
    }

    const config: StoryConfig = {
      themeId,
      audience,
      length,
      characterCount,
      protagonistName: protagonistName.trim() || '你',
    };

    navigate('/play', { state: { config, ticketConsumed: true } });
  };

  return (
    <Layout tickets={tickets}>
      <div className="story-setup">
        <header className="story-setup__header">
          <h1>定制你的故事</h1>
          <p>选择主题与篇幅——每张入场券开启一整局专属 AI 短剧</p>
        </header>

        <div className="story-setup__ticket-bar">
          <div className="story-setup__ticket-info">
            <span className="story-setup__ticket-label">剩余入场券</span>
            <span className="story-setup__ticket-count">{tickets} 张</span>
          </div>
          <button
            type="button"
            className="story-setup__ticket-buy"
            onClick={() => {
              purchaseTicketPack();
              setTicketError(null);
            }}
          >
            购买 {TICKET_PACK_SIZE} 张 · {TICKET_PACK_PRICE_LABEL}
          </button>
        </div>

        {ticketError && <p className="story-setup__ticket-error">{ticketError}</p>}

        <section className="story-setup__section">
          <h2>故事主题</h2>
          <div className="story-setup__themes">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`story-setup__theme ${themeId === theme.id ? 'story-setup__theme--active' : ''}`}
                onClick={() => setThemeId(theme.id)}
                style={{ background: theme.gradient }}
              >
                <span className="story-setup__theme-title">{theme.title}</span>
                <span className="story-setup__theme-sub">{theme.subtitle}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="story-setup__section">
          <h2>受众偏好</h2>
          <div className="story-setup__toggle-group">
            <button
              type="button"
              className={`story-setup__toggle ${audience === 'male' ? 'story-setup__toggle--active' : ''}`}
              onClick={() => setAudience('male')}
            >
              <span className="story-setup__toggle-icon">⚔</span>
              <span>男频 · 爽文逆袭</span>
              <small>{selectedTheme.maleHook}</small>
            </button>
            <button
              type="button"
              className={`story-setup__toggle ${audience === 'female' ? 'story-setup__toggle--active story-setup__toggle--rose' : ''}`}
              onClick={() => setAudience('female')}
            >
              <span className="story-setup__toggle-icon">♥</span>
              <span>女频 · 情感纠葛</span>
              <small>{selectedTheme.femaleHook}</small>
            </button>
          </div>
        </section>

        <div className="story-setup__row">
          <section className="story-setup__section">
            <h2>故事篇幅</h2>
            <div className="story-setup__pills">
              {(Object.keys(LENGTH_LABELS) as StoryLength[]).map((len) => (
                <button
                  key={len}
                  type="button"
                  className={`story-setup__pill ${length === len ? 'story-setup__pill--active' : ''}`}
                  onClick={() => setLength(len)}
                >
                  {LENGTH_LABELS[len]}
                </button>
              ))}
            </div>
          </section>

          <section className="story-setup__section">
            <h2>主要角色数</h2>
            <div className="story-setup__pills">
              {CHARACTER_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`story-setup__pill ${characterCount === n ? 'story-setup__pill--active' : ''}`}
                  onClick={() => setCharacterCount(n)}
                >
                  {n} 人
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="story-setup__section">
          <h2>主角名称</h2>
          <input
            type="text"
            className="story-setup__input"
            placeholder="留空则使用「你」"
            value={protagonistName}
            onChange={(e) => setProtagonistName(e.target.value)}
            maxLength={12}
          />
        </section>

        <footer className="story-setup__footer">
          <button type="button" className="story-setup__start" onClick={handleStart}>
            消耗 1 张入场券 · 进入故事
          </button>
        </footer>
      </div>
    </Layout>
  );
}
