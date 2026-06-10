import { Link } from 'react-router-dom';
import { isAgnesConfigured } from '../../services/agnes-ai.service';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  tickets?: number;
  showNav?: boolean;
}

export function Layout({ children, tickets, showNav = true }: LayoutProps) {
  const modeLabel = isAgnesConfigured() ? '流式剧本' : 'Mock 演示';

  return (
    <div className="layout">
      <div className="layout__grain" aria-hidden />
      {showNav && (
        <header className="layout__header">
          <Link to="/" className="layout__logo">
            <span className="layout__logo-mark">序</span>
            <span className="layout__logo-text">新纪元 · 互动短剧</span>
          </Link>
          <div className="layout__header-right">
            <span className={`layout__ai-badge ${isAgnesConfigured() ? 'layout__ai-badge--live' : ''}`}>
              {modeLabel}
            </span>
            {tickets !== undefined && (
              <div className="layout__tickets">
                <span className="layout__tickets-icon">🎫</span>
                <span className="layout__tickets-value">{tickets}</span>
              </div>
            )}
          </div>
        </header>
      )}
      <main className="layout__main">{children}</main>
    </div>
  );
}
