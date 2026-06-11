import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import {
  LENGTH_LABELS,
  TICKET_PACK_PRICE_LABEL,
  TICKET_PACK_SIZE,
} from '../../constants/game.const';
import { CUSTOM_THEME_LIMITS, PROTAGONIST_NAME_LIMITS } from '../../constants/story-theme.const';
import {
  CUSTOM_THEME_OPTION,
  resolveTheme,
  themesForAudience,
} from '../../constants/themes';
import { useAdmissionTicket } from '../../hooks/useAdmissionTicket';
import type {
  AudienceType,
  StoryConfig,
  StoryLength,
  ThemeId,
} from '../../types/story.types';
import './StorySetup.css';

export function StorySetupPage() {
  const navigate = useNavigate();
  const { tickets, hasTicket, consumeTicket, purchaseTicketPack } =
    useAdmissionTicket();

  const [themeId, setThemeId] = useState<ThemeId>('business-war');
  const [audience, setAudience] = useState<AudienceType>('male');
  const [length, setLength] = useState<StoryLength>('short');
  const [protagonistName, setProtagonistName] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const presetThemes = useMemo(
    () => themesForAudience(audience),
    [audience],
  );

  useEffect(() => {
    if (themeId === 'custom') return;
    const stillVisible = presetThemes.some((theme) => theme.id === themeId);
    if (!stillVisible && presetThemes[0]) {
      setThemeId(presetThemes[0].id);
    }
  }, [audience, presetThemes, themeId]);

  const draftConfig: StoryConfig = {
    themeId,
    audience,
    length,
    protagonistName: protagonistName.trim(),
    customTheme:
      themeId === 'custom'
        ? {
            title: customTitle.trim(),
            description: customDescription.trim(),
          }
        : undefined,
  };

  const selectedTheme = resolveTheme(draftConfig);

  const handleStart = () => {
    setFormError(null);

    if (themeId === 'custom') {
      const title = customTitle.trim();
      const description = customDescription.trim();
      if (title.length < CUSTOM_THEME_LIMITS.titleMin) {
        setFormError(`自定义主题名至少 ${CUSTOM_THEME_LIMITS.titleMin} 个字`);
        return;
      }
      if (description.length < CUSTOM_THEME_LIMITS.descriptionMin) {
        setFormError(
          `主题描述至少 ${CUSTOM_THEME_LIMITS.descriptionMin} 个字`,
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
          <h2>受众偏好</h2>
          <div className="story-setup__toggle-group">
            <button
              type="button"
              className={`story-setup__toggle ${audience === 'male' ? 'story-setup__toggle--active' : ''}`}
              onClick={() => setAudience('male')}
            >
              <span className="story-setup__toggle-icon">⚔</span>
              <span>偏硬核 · 布局反击</span>
              <small>商战逆袭 / 高手下山 / 都市高武</small>
            </button>
            <button
              type="button"
              className={`story-setup__toggle ${audience === 'female' ? 'story-setup__toggle--active story-setup__toggle--rose' : ''}`}
              onClick={() => setAudience('female')}
            >
              <span className="story-setup__toggle-icon">♥</span>
              <span>偏情感 · 关系博弈</span>
              <small>重生复仇 / 豪门甜宠 / 宫斗宅斗</small>
            </button>
          </div>
        </section>

        <section className="story-setup__section">
          <h2>故事主题</h2>
          <div className="story-setup__themes">
            {presetThemes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`story-setup__theme ${themeId === theme.id ? 'story-setup__theme--active' : ''}`}
                onClick={() => setThemeId(theme.id)}
                style={{ background: theme.gradient }}
              >
                {theme.fanqieTag && (
                  <span className="story-setup__theme-tag">{theme.fanqieTag}</span>
                )}
                <span className="story-setup__theme-title">{theme.title}</span>
                <span className="story-setup__theme-sub">{theme.subtitle}</span>
              </button>
            ))}
            <button
              type="button"
              className={`story-setup__theme story-setup__theme--custom ${themeId === 'custom' ? 'story-setup__theme--active' : ''}`}
              onClick={() => setThemeId('custom')}
              style={{ background: CUSTOM_THEME_OPTION.gradient }}
            >
              <span className="story-setup__theme-tag">自定义</span>
              <span className="story-setup__theme-title">
                {CUSTOM_THEME_OPTION.title}
              </span>
              <span className="story-setup__theme-sub">
                {CUSTOM_THEME_OPTION.subtitle}
              </span>
            </button>
          </div>
        </section>

        {themeId === 'custom' && (
          <section className="story-setup__section story-setup__custom">
            <h2>自定义设定</h2>
            <input
              type="text"
              className="story-setup__input"
              placeholder="主题名，如：赛博修仙 / 假千金跑路倒计时"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              maxLength={CUSTOM_THEME_LIMITS.titleMax}
            />
            <textarea
              className="story-setup__textarea"
              placeholder="描述背景、核心冲突、想要的爽点或情感线（AI 据此设定人物与剧情）"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              maxLength={CUSTOM_THEME_LIMITS.descriptionMax}
              rows={4}
            />
          </section>
        )}

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

        <section className="story-setup__preview">
          <p className="story-setup__preview-label">本局钩子预览</p>
          <p className="story-setup__preview-text">
            {audience === 'male'
              ? selectedTheme.maleHook
              : selectedTheme.femaleHook}
          </p>
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
