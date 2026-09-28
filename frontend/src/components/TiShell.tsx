import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';
import { useNotifications, type AppNotification, type NotificationKind } from '../contexts/NotificationContext';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  /** Prefixos de rota que marcam o item como ativo. */
  match: string[];
  badge?: number;
}

interface TiShellProps {
  userName: string;
  role: string;
  onLogout: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  it_staff: 'Equipe de TI',
  admin_staff: 'Administrativo',
  manager: 'Gestão',
  gestor: 'Gestão',
};

const AREA_LABEL: Record<string, string> = {
  admin: 'Tecnologia da Informação',
  it_staff: 'Tecnologia da Informação',
  admin_staff: 'Administrativo',
  manager: 'Gestão',
  gestor: 'Gestão',
};

const KIND_ICON: Record<NotificationKind, string> = {
  new: 'ti-ticket',
  updated: 'ti-refresh',
  resolved: 'ti-circle-check',
  reopened: 'ti-arrow-back-up',
  warning: 'ti-alert-triangle',
};

const KIND_LABEL: Record<NotificationKind, string> = {
  new: 'Novo',
  updated: 'Atualização',
  resolved: 'Resolvido',
  reopened: 'Reaberto',
  warning: 'Prazo',
};

const relativeTime = (iso: string) => {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'agora mesmo';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `há ${Math.floor(s / 86400)} d`;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(ts);
};

const isManager = (role: string) => role === 'manager' || role === 'gestor';

/**
 * Moldura da área interna (TI, administrador, Administrativo e gestão).
 * Barra lateral fixa com as áreas em uso, barra de cima com busca (Ctrl+K)
 * e avisos, e "Sair" sempre à vista. Alt+1…9 troca de área pelo teclado.
 */
export default function TiShell({ userName, role, onLogout }: TiShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { notifications, unseenCount, markAllRead, markRead, dismiss, clearAll } = useNotifications();

  const dashboardRoute = isManager(role) ? '/gestor/dashboard' : role === 'admin_staff' ? '/admin/auxiliar/dashboard' : '/admin/dashboard';
  const ticketsRoute = isManager(role) ? '/gestor/solicitacoes' : '/admin/chamados';
  const itTeam = role === 'admin' || role === 'it_staff';

  const items: NavItem[] = [
    { label: 'Painel', icon: 'ti-layout-dashboard', path: dashboardRoute, match: [dashboardRoute] },
    {
      label: 'Solicitações',
      icon: 'ti-inbox',
      path: ticketsRoute,
      match: ['/admin/chamados', '/gestor/solicitacoes'],
      badge: unseenCount > 0 ? unseenCount : undefined,
    },
    ...(itTeam ? [
      { label: 'Central de dúvidas', icon: 'ti-help-circle', path: '/admin/conhecimento', match: ['/admin/conhecimento'] },
      { label: 'Inventário', icon: 'ti-packages', path: '/inventario', match: ['/inventario', '/admin/estoque'] },
      { label: 'Documentos', icon: 'ti-file-text', path: '/admin/documentos', match: ['/admin/documentos'] },
    ] : []),
    { label: 'Relatórios', icon: 'ti-chart-bar', path: '/admin/relatorios', match: ['/admin/relatorios'] },
    ...(itTeam ? [{ label: 'Equipe', icon: 'ti-users', path: '/admin/usuarios', match: ['/admin/usuarios'] }] : []),
  ];

  const isActive = (item: NavItem) => item.match.some((prefix) => location.pathname.startsWith(prefix));
  const current = items.find(isActive);

  const go = (item: NavItem) => {
    if (item.label === 'Solicitações') markAllRead();
    setMenuOpen(false);
    navigate(item.path);
  };

  // Alt+1…9 abre a área correspondente.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < items.length) {
        event.preventDefault();
        go(items[index]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Fecha o menu do celular ao trocar de página.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Painel de avisos: fecha ao clicar fora ou com Esc.
  useEffect(() => {
    if (!panelOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setPanelOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setPanelOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [panelOpen]);

  const notificationRoute = (n: AppNotification) => {
    if (!n.ticketId || isManager(role)) return ticketsRoute;
    return `/admin/chamados/${n.ticketId}`;
  };

  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'PS';

  return (
    <div className={`tsh-shell ${menuOpen ? 'is-menu-open' : ''}`}>
      <aside className="tsh-sidebar" aria-label="Navegação interna">
        <button type="button" className="tsh-brand" onClick={() => navigate(dashboardRoute)}>
          <span className="pub-brand__mark" aria-hidden="true" />
          <span className="tsh-brand__copy">
            <strong>Portal de Serviços</strong>
            <small>{AREA_LABEL[role] || 'Área interna'}</small>
          </span>
        </button>

        <button type="button" className="tsh-register" onClick={() => { setMenuOpen(false); navigate('/abrir-chamado'); }}>
          <i className="ti ti-plus" aria-hidden="true" />
          Registrar chamado
        </button>

        <nav className="tsh-nav" id="tsh-nav" aria-label="Áreas">
          {items.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className="tsh-nav__item"
              aria-current={isActive(item) ? 'page' : undefined}
              title={index < 9 ? `${item.label} (Alt+${index + 1})` : item.label}
              onClick={() => go(item)}
            >
              <i className={`ti ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="tsh-nav__badge" aria-label={`${item.badge} novidades`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="tsh-user">
          <span className="tsh-user__avatar" aria-hidden="true">{initials}</span>
          <span className="tsh-user__copy">
            <strong>{userName}</strong>
            <small>{ROLE_LABEL[role] || 'Área interna'}</small>
          </span>
        </div>
        <button type="button" className="tsh-logout" onClick={onLogout}>
          <i className="ti ti-logout" aria-hidden="true" />
          Sair da conta
        </button>
      </aside>

      <button
        type="button"
        className="tsh-scrim"
        aria-label="Fechar menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <header className="tsh-topbar">
        <button
          type="button"
          className="tsh-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="tsh-nav"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'}`} aria-hidden="true" />
          <span>Menu</span>
        </button>

        <span className="tsh-topbar__where" aria-hidden="true">{current?.label ?? ''}</span>

        <div className="tsh-topbar__search">
          <GlobalSearch />
        </div>

        <div className="tsh-bell" ref={panelRef}>
          <button
            type="button"
            className={`tsh-bell__button ${panelOpen ? 'is-open' : ''}`}
            aria-label={`Avisos: ${unseenCount} não vistos`}
            aria-expanded={panelOpen}
            aria-haspopup="dialog"
            aria-controls="ti-notifications"
            onClick={() => setPanelOpen((open) => !open)}
          >
            <i className="ti ti-bell" aria-hidden="true" />
            {unseenCount > 0 && <span className="tsh-bell__count">{unseenCount > 9 ? '9+' : unseenCount}</span>}
          </button>

          {panelOpen && (
            <div className="tsh-notif" id="ti-notifications" role="dialog" aria-label="Avisos">
              <header className="tsh-notif__head">
                <div>
                  <strong>Avisos</strong>
                  <small>{unseenCount > 0 ? `${unseenCount} não ${unseenCount > 1 ? 'lidos' : 'lido'}` : 'Tudo em dia'}</small>
                </div>
                {unseenCount > 0 && (
                  <button type="button" className="tsh-notif__action" onClick={markAllRead}>Marcar todos como lidos</button>
                )}
              </header>

              {notifications.length === 0 ? (
                <div className="tsh-notif__empty">
                  <i className="ti ti-bell-off" aria-hidden="true" />
                  <strong>Nenhum aviso</strong>
                  <span>Chamados novos e atualizações aparecem aqui.</span>
                </div>
              ) : (
                <>
                  <ul className="tsh-notif__list">
                    {notifications.map((n) => (
                      <li key={n.id} className={n.read ? '' : 'is-unread'}>
                        <button
                          type="button"
                          className="tsh-notif__main"
                          onClick={() => { markRead(n.id); setPanelOpen(false); navigate(notificationRoute(n)); }}
                        >
                          <span className={`tsh-notif__icon kind-${n.kind}`} aria-hidden="true"><i className={`ti ${KIND_ICON[n.kind]}`} /></span>
                          <span className="tsh-notif__copy">
                            <strong>{n.title}</strong>
                            {n.body && <span>{n.body}</span>}
                            <small>{KIND_LABEL[n.kind]}, {relativeTime(n.createdAt)}</small>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="tsh-notif__dismiss"
                          aria-label={`Remover aviso: ${n.title}`}
                          onClick={() => dismiss(n.id)}
                        >
                          <i className="ti ti-x" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <footer className="tsh-notif__foot">
                    <button type="button" className="tsh-notif__action" onClick={() => { setPanelOpen(false); navigate(ticketsRoute); }}>
                      Ver todas as solicitações
                    </button>
                    <button type="button" className="tsh-notif__action is-danger" onClick={clearAll}>Limpar</button>
                  </footer>
                </>
              )}
            </div>
          )}
        </div>

        <button type="button" className="tsh-topbar__logout" onClick={onLogout} aria-label="Sair da conta">
          <i className="ti ti-logout" aria-hidden="true" />
          <span>Sair</span>
        </button>
      </header>
    </div>
  );
}
