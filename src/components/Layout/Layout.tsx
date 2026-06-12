import { Link } from 'react-router-dom';
import logoUrl from '../../assets/logo.jpg';
import { APP_NAME } from '../../constants/app-brand.const';
import { getAiProviderLabel, isAiConfigured } from '../../services/ai-chat.service';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  tickets?: number;
  showNav?: boolean;
}

export function Layout({ children, tickets, showNav = true }: LayoutProps) {
  const modeLabel = isAiConfigured() ? getAiProviderLabel() : 'Mock 演示';

  return (
    <div className="layout">
      <div className="layout__grain" aria-hidden />
      {showNav && (
        <header className="layout__header">
          <Link to="/" className="layout__logo">
            <img
              src={logoUrl}
              alt=""
              className="layout__logo-img"
              width={40}
              height={40}
            />
            <span className="layout__logo-text">{APP_NAME}</span>
          </Link>
          <div className="layout__header-right">
            <span className={`layout__ai-badge ${isAiConfigured() ? 'layout__ai-badge--live' : ''}`}>
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
