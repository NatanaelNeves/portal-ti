import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';

const RH_TABS = [
  { path: '/rh/dashboard', label: 'Início', icon: 'ti-home' },
  { path: '/rh/chamados', label: 'Chamados', icon: 'ti-inbox' },
  { path: '/rh/relatorios', label: 'Relatórios', icon: 'ti-chart-bar' },
];

// Pedir algo a outra equipe (TI, Administrativo) sem sair da conta.
const OPEN_TICKET = { path: '/abrir-chamado', label: 'Abrir chamado', icon: 'ti-message-plus' };

interface RhShellProps {
  userName: string;
  onLogout: () => void;
}

/**
 * Moldura da área do RH. Diferente da central da TI: sem barra lateral e sem
 * menu escondido. As três áreas ficam sempre à vista (em cima no computador,
 * embaixo no celular) e o botão "Sair" nunca some.
 */
export default function RhShell({ userName, onLogout }: RhShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unseenCount, markAllRead } = useNotifications();
  const firstName = userName.trim().split(/\s+/)[0] || 'Equipe';

  const go = (path: string) => {
    if (path === '/rh/chamados') markAllRead();
    navigate(path);
  };

  const isCurrent = (path: string) => location.pathname.startsWith(path);
  const onOpenTicket = isCurrent(OPEN_TICKET.path);

  const renderTab = (tab: typeof RH_TABS[number], variant: 'top' | 'bottom') => {
    const badge = tab.path === '/rh/chamados' && unseenCount > 0 ? unseenCount : 0;
    return (
      <button
        key={tab.path}
        type="button"
        className={`rhs-tab rhs-tab--${variant}`}
        aria-current={isCurrent(tab.path) ? 'page' : undefined}
        onClick={() => go(tab.path)}
      >
        <span className="rhs-tab__icon" aria-hidden="true">
          <i className={`ti ${tab.icon}`} />
          {badge > 0 && <span className="rhs-tab__badge">{badge > 9 ? '9+' : badge}</span>}
        </span>
        <span className="rhs-tab__label">{tab.label}</span>
        {badge > 0 && <span className="pub-sr-only">({badge} novidades)</span>}
      </button>
    );
  };

  return (
    <>
      <header className="rhs-header">
        <div className="rhs-header__bar">
          <button type="button" className="rhs-brand" onClick={() => go('/rh/dashboard')}>
            <span className="pub-brand__mark" aria-hidden="true" />
            <span className="rhs-brand__copy">
              <strong>Recursos Humanos</strong>
              <small>Portal de Serviços</small>
            </span>
          </button>

          <nav className="rhs-tabs" aria-label="Áreas do RH">
            {RH_TABS.map((tab) => renderTab(tab, 'top'))}
          </nav>

          <button
            type="button"
            className="rhs-open"
            aria-current={onOpenTicket ? 'page' : undefined}
            onClick={() => go(OPEN_TICKET.path)}
          >
            <i className={`ti ${OPEN_TICKET.icon}`} aria-hidden="true" />
            {OPEN_TICKET.label}
          </button>

          <div className="rhs-user">
            <span className="rhs-user__avatar" aria-hidden="true">{firstName.charAt(0).toUpperCase()}</span>
            <span className="rhs-user__name">{firstName}</span>
          </div>

          <button type="button" className="rhs-logout" onClick={onLogout}>
            <i className="ti ti-logout" aria-hidden="true" />
            Sair
          </button>
        </div>
      </header>

      <nav className="rhs-bottom" aria-label="Áreas do RH">
        {RH_TABS.map((tab) => renderTab(tab, 'bottom'))}
        {renderTab(OPEN_TICKET, 'bottom')}
      </nav>
    </>
  );
}
