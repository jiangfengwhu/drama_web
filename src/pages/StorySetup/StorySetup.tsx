import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import {
  LENGTH_LABELS,
  TICKET_PACK_PRICE_LABEL,
  TICKET_PACK_SIZE,
} from '../../constants/game.const';
import { CUSTOM_THEME_LIMITS, PROTAGONIST_NAME_LIMITS } from '../../constants/story-theme.const';
import {
  listPresetThemes,
  resolveAudienceForConfig,
} from '../../constants/themes';
import { useAdmissionTicket } from '../../hooks/useAdmissionTicket';
import type {
  StoryConfig,
  StoryLength,
  ThemeId,
} from '../../types/story.types';
import './StorySetup.css';

const THEMES_PANEL_HEIGHT_PX = 196;

export function StorySetupPage() {
  const navigate = useNavigate();
  const { tickets, hasTicket, consumeTicket, purchaseTicketPack } =
    useAdmissionTicket();

  const [themeId, setThemeId] = useState<ThemeId>('business-war');
  const [lastPresetThemeId, setLastPresetThemeId] =
    useState<ThemeId>('business-war');
  const [length, setLength] = useState<StoryLength>('short');
  const [protagonistName, setProtagonistName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [scrollHints, setScrollHints] = useState({ left: false, right: false });

  const themesScrollRef = useRef<HTMLDivElement>(null);
  const presetThemes = useMemo(() => listPresetThemes(), []);
  const isCustomTheme = themeId === 'custom';

  const draftConfig: StoryConfig = {
    themeId,
    audience: resolveAudienceForConfig({ themeId }),
    length,
    protagonistName: protagonistName.trim(),
    customTheme: isCustomTheme
      ? { description: customDescription.trim() }
      : undefined,
  };

  const updateScrollHints = useCallback(() => {
    const el = themesScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setScrollHints({
      left: scrollLeft > 4,
      right: scrollLeft + clientWidth < scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    if (isCustomTheme) return;
    updateScrollHints();
    const el = themesScrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollHints, { passive: true });
    const observer = new ResizeObserver(updateScrollHints);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollHints);
      observer.disconnect();
    };
  }, [isCustomTheme, presetThemes, updateScrollHints]);

  const handleSelectPresetTheme = (id: ThemeId) => {
    setLastPresetThemeId(id);
    setThemeId(id);
  };

  const handleCustomToggle = () => {
    if (isCustomTheme) {
      setThemeId(lastPresetThemeId);
      return;
    }
    setLastPresetThemeId(themeId);
    setThemeId('custom');
  };

  const handleStart = () => {
    setFormError(null);

    if (isCustomTheme) {
      const description = customDescription.trim();
      if (description.length < CUSTOM_THEME_LIMITS.descriptionMin) {
        setFormError(
          `故事设定至少 ${CUSTOM_THEME_LIMITS.descriptionMin} 个字`,
        );
        return;
      }
    }

    const name = protagonistName.trim();
    if (name.length < PROTAGONIST_NAME_LIMITS.min) {
      setFormError(
        `主角名称至少 ${PROTAGONIST_NAME_LIMITS.min} 个字（2-4 字中文名）`,
      );
      return;
    }
    if (name.length > PROTAGONIST_NAME_LIMITS.max) {
      setFormError(
        `主角名称最多 ${PROTAGONIST_NAME_LIMITS.max} 个字（2-4 字中文名）`,
      );
      return;
    }

    if (!hasTicket) {
      setTicketError('入场券不足，请先购买后再进入故事');
      return;
    }

    const consumed = consumeTicket();
    if (!consumed) {
      setTicketError('入场券消耗失败，请重试');
      return;
    }

    navigate('/play', { state: { config: draftConfig, ticketConsumed: true } });
  };

  return (
    <Layout tickets={tickets}>
      <div className="story-setup">
        <header className="story-setup__header">
          <h1>选剧本 · 定角色</h1>
          <p>挑个题材壳子，主角还是你——每张入场券开启一整局专属 AI 短剧</p>
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
        {formError && <p className="story-setup__ticket-error">{formError}</p>}

        <section className="story-setup__section">
          <h2>主角名称</h2>
          <input
            type="text"
            className="story-setup__input"
            placeholder={`必填，${PROTAGONIST_NAME_LIMITS.min}-${PROTAGONIST_NAME_LIMITS.max} 字中文名，如：沈清、林婉`}
            value={protagonistName}
            onChange={(e) => setProtagonistName(e.target.value)}
            maxLength={PROTAGONIST_NAME_LIMITS.max}
            required
          />
        </section>

        <section className="story-setup__section story-setup__section--themes">
          <div className="story-setup__section-head">
            <h2>故事主题</h2>
            <button
              type="button"
              className={`story-setup__custom-toggle ${isCustomTheme ? 'story-setup__custom-toggle--active' : ''}`}
              onClick={handleCustomToggle}
            >
              {isCustomTheme ? '返回预设主题' : '自定义主题'}
            </button>
          </div>

          <div
            className="story-setup__themes-panel"
            style={{ height: THEMES_PANEL_HEIGHT_PX }}
          >
            {isCustomTheme ? (
              <textarea
                className="story-setup__theme-custom-input"
                placeholder="描述你想玩的世界、人物关系、核心冲突与想要的爽点/情感线…"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                maxLength={CUSTOM_THEME_LIMITS.descriptionMax}
              />
            ) : (
              <div className="story-setup__themes-scroll-wrap">
                <div
                  ref={themesScrollRef}
                  className="story-setup__themes-scroll"
                >
                  <div className="story-setup__themes">
                    {presetThemes.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        className={`story-setup__theme ${themeId === theme.id ? 'story-setup__theme--active' : ''}`}
                        onClick={() => handleSelectPresetTheme(theme.id)}
                        style={{ background: theme.gradient }}
                      >
                        {theme.fanqieTag && (
                          <span className="story-setup__theme-tag">
                            {theme.fanqieTag}
                          </span>
                        )}
                        <span className="story-setup__theme-title">
                          {theme.title}
                        </span>
                        <span className="story-setup__theme-sub">
                          {theme.subtitle}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className={`story-setup__themes-fade story-setup__themes-fade--left ${scrollHints.left ? 'story-setup__themes-fade--visible' : ''}`}
                  aria-hidden
                />
                <div
                  className={`story-setup__themes-fade story-setup__themes-fade--right ${scrollHints.right ? 'story-setup__themes-fade--visible' : ''}`}
                  aria-hidden
                />
              </div>
            )}
          </div>
        </section>

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

        <footer className="story-setup__footer">
          <button type="button" className="story-setup__start" onClick={handleStart}>
            消耗 1 张入场券 · 开演
          </button>
        </footer>
      </div>
    </Layout>
  );
}
