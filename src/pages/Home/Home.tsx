import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout/Layout';
import logoUrl from '../../assets/logo.jpg';
import { APP_NAME } from '../../constants/app-brand.const';
import {
  HOME_CHAT_PREVIEW,
  HOME_HERO,
  HOME_WHISPERS,
} from '../../constants/home-copy.const';
import { isAiConfigured } from '../../services/ai-chat.service';
import './Home.css';

export function HomePage() {
  const aiReady = isAiConfigured();

  return (
    <Layout showNav={false}>
      <section className="home">
        <div className="home__hero">
          <div className="home__hero-content">
            <img
              src={logoUrl}
              alt={APP_NAME}
              className="home__logo"
              width={120}
              height={120}
            />
            <p className="home__eyebrow">{HOME_HERO.eyebrow}</p>
            <h1 className="home__title">
              {HOME_HERO.titleLine1}
              <span className="home__title-accent">{HOME_HERO.titleAccent}</span>
            </h1>
            <p className="home__subtitle">{HOME_HERO.subtitle}</p>

            <div className="home__cta-group">
              <Link to="/create" className="home__cta home__cta--primary">
                {HOME_HERO.cta}
              </Link>
              <span className="home__mode-tag">
                {aiReady ? 'AI 实时续写 · 专属场次' : '演示模式 · 可先体验'}
              </span>
              <span className="home__cta-note">{HOME_HERO.footnote}</span>
            </div>
          </div>

          <div className="home__hero-visual">
            <div className="home__chat-preview" aria-hidden>
              <div className="home__chat-preview-header">
                <span className="home__chat-preview-dot" />
                <span className="home__chat-preview-dot" />
                <span className="home__chat-preview-dot" />
                <span className="home__chat-preview-label">现场 · 进行中</span>
              </div>
              <div className="home__chat-preview-body">
                {HOME_CHAT_PREVIEW.map((item, index) => {
                  if (item.kind === 'system') {
                    return (
                      <p
                        key={index}
                        className="home__chat-system"
                        style={{ animationDelay: `${0.15 + index * 0.12}s` }}
                      >
                        {item.text}
                      </p>
                    );
                  }
                  if (item.kind === 'hint') {
                    return (
                      <p
                        key={index}
                        className="home__chat-hint"
                        style={{ animationDelay: `${0.15 + index * 0.12}s` }}
                      >
                        {item.text}
                      </p>
                    );
                  }
                  return (
                    <div
                      key={index}
                      className="home__chat-row"
                      style={{ animationDelay: `${0.15 + index * 0.12}s` }}
                    >
                      <span className="home__chat-avatar">{item.sender.slice(0, 1)}</span>
                      <div className="home__chat-bubble-wrap">
                        <span className="home__chat-name">{item.sender}</span>
                        <p className="home__chat-bubble">{item.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <ul className="home__whispers">
          {HOME_WHISPERS.map((line) => (
            <li key={line} className="home__whisper">
              {line}
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  );
}
