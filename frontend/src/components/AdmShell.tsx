import { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { useSlidingPill } from './adm/useSlidingPill';
import '../styles/AdmShell.css';

const TABS = [
  { path: '/admin/auxiliar/dashboard', label: 'Painel', icon: 'ti-layout-board' },
  { path: '/admin/chamados', label: 'Pedidos', icon: 'ti-inbox' },
  { path: '/admin/relatorios', label: 'Relatórios', icon: 'ti-chart-histogram' },
];

interface AdmShellProps {
  userName: string;
  onLogout: () => void;
}

/**
 * Moldura do Administrativo. São só três áreas, então nada de barra lateral:
 * um cabeçalho da cor do quadro de chaves, com o trilho de latão embaixo e
 * uma pílula que desliza até a aba atual. No celular as abas descem para
 * uma barra fixa no pé da tela.
 */
export default function AdmShell({ userName, onLogout }: AdmShellProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { unseenCount, markAllRead } = useNotifications();
  const tabsRef = useRef<HTMLElement | null>(null);

  const activeIndex = TABS.findIndex((tab) => pathname.startsWith(tab.path));
  const firstName = userName.trim().split(/\s+/)[0] || 'Equipe';
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'AD';

  // A pílula mede a aba ativa e desliza até ela.
  const pill = useSlidingPill(tabsRef, '.axs-tab', activeIndex);

  const go = (path: string) => {
    if (path === '/admin/chamados') markAllRead();
    navigate(path);
  };

  const badgeFor = (path: string) => (path === '/admin/chamados' && unseenCount > 0 ? unseenCount : 0);

  return (
    <>
      <header className="axs-header">
        <div className="axs-bar">
          <button type="button" className="axs-brand" onClick={() => go(TABS[0].path)}>
            <span className="axs-brand__mark" aria-hidden="true"><i className="ti ti-key" /></span>
            <span className="axs-brand__copy">
              <strong>Administrativo</strong>
              <small>Portal de Serviços</small>
            </span>
          </button>

          <nav className="axs-tabs" ref={tabsRef} aria-label="Áreas do Administrativo">
            {pill.visible && <span className="axs-tabs__pill" aria-hidden="true" style={pill.style} />}
            {TABS.map((tab, index) => {
              const badge = badgeFor(tab.path);
              return (
                <button
                  key={tab.path}
                  type="button"
                  className="axs-tab"
                  aria-current={index === activeIndex ? 'page' : undefined}
                  onClick={() => go(tab.path)}
                >
                  <i className={`ti ${tab.icon}`} aria-hidden="true" />
                  {tab.label}
                  {badge > 0 && <span className="axs-badge" aria-label={`${badge} novidades`}>{badge > 9 ? '9+' : badge}</span>}
                </button>
              );
            })}
          </nav>

          <button type="button" className="axs-new" onClick={() => navigate('/abrir-chamado')}>
            <i className="ti ti-plus" aria-hidden="true" />
            <span>Registrar pedido</span>
          </button>

          <span className="axs-user" title={userName}>
            <span className="axs-user__avatar" aria-hidden="true">{initials}</span>
            <span className="axs-user__name">{firstName}</span>
          </span>

          <button type="button" className="axs-logout" onClick={onLogout}>
            <i className="ti ti-logout" aria-hidden="true" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <nav className="axs-bottom" aria-label="Áreas do Administrativo">
        {TABS.map((tab, index) => {
          const badge = badgeFor(tab.path);
          return (
            <button
              key={tab.path}
              type="button"
              className="axs-bottom__tab"
              aria-current={index === activeIndex ? 'page' : undefined}
              onClick={() => go(tab.path)}
            >
              <span className="axs-bottom__icon" aria-hidden="true">
                <i className={`ti ${tab.icon}`} />
                {badge > 0 && <span className="axs-badge">{badge > 9 ? '9+' : badge}</span>}
              </span>
              {tab.label}
            </button>
          );
        })}
        <button type="button" className="axs-bottom__tab axs-bottom__tab--new" onClick={() => navigate('/abrir-chamado')}>
          <span className="axs-bottom__icon" aria-hidden="true"><i className="ti ti-plus" /></span>
          Registrar
        </button>
      </nav>
    </>
  );
}
