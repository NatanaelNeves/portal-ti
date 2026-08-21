import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import GlobalSearch from './GlobalSearch';
import ChatWidget from './ChatWidget';
import { useNotifications } from '../contexts/NotificationContext';
import '../styles/Navigation.css';
import '../styles/AdminNavigationShell.css';

type NavIconName = 'panel' | 'tickets' | 'help' | 'calendar' | 'inventory' | 'repeat' | 'document' | 'report' | 'kpi' | 'team';

const NavIcon = ({ name }: { name: NavIconName }) => {
  const paths: Record<NavIconName, JSX.Element> = {
    panel: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6"/></>,
    tickets: <><path d="M5 5h14v4a2 2 0 0 0 0 4v6H5v-6a2 2 0 0 0 0-4z"/><path d="M9 8h6M9 12h4"/></>,
    help: <><path d="M5 5.5A3.5 3.5 0 0 1 8.5 2h7A3.5 3.5 0 0 1 19 5.5v9a3.5 3.5 0 0 1-3.5 3.5H10l-5 4v-4.8A3.5 3.5 0 0 1 3 14V7.5"/><path d="M10 8.2a2.2 2.2 0 1 1 3 2.1c-.8.4-1 1-1 1.7M12 15h.01"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    inventory: <><path d="m4 7 8-4 8 4-8 4z"/><path d="m4 7v10l8 4 8-4V7M12 11v10"/></>,
    repeat: <><path d="M20 7h-9a5 5 0 0 0-5 5v1"/><path d="m17 4 3 3-3 3M4 17h9a5 5 0 0 0 5-5v-1"/><path d="m7 20-3-3 3-3"/></>,
    document: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    report: <><path d="M5 20V10M12 20V4M19 20v-7"/><path d="M3 20h18"/></>,
    kpi: <><circle cx="12" cy="12" r="9"/><path d="M12 12 16 8M7 15h10"/></>,
    team: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 5.2a3 3 0 0 1 0 5.6M18 14a4 4 0 0 1 3 3.9V20"/></>,
  };

  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout } = useAuthStore();
  const { unseenCount, clearUnseen } = useNotifications();
  const isInternalUser = !!localStorage.getItem('internal_token');

  const handleLogout = () => {
    logout();
    localStorage.removeItem('internal_token');
    localStorage.removeItem('internal_user');
    navigate('/admin/login');
  };

  // Navegação para usuários públicos (não autenticados)
  if (!isInternalUser) {
    return (
      <>
      <ChatWidget />
      <nav className="navbar navbar-public">
        <div className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <h1>Portal de Serviços Internos</h1>
          <small style={{ fontSize: '0.75rem', opacity: 0.9 }}>Cuidando de quem transforma vidas</small>
        </div>
        <div className="navbar-menu">
          <button onClick={() => navigate('/')} className="nav-link">
            Início
          </button>
          <button onClick={() => navigate('/abrir-chamado')} className="nav-link">
            Solicitar Apoio
          </button>
          <button onClick={() => navigate('/meus-chamados')} className="nav-link">
            Minhas Solicitações
          </button>
          <button onClick={() => navigate('/central')} className="nav-link">
            Central de Dúvidas
          </button>
          <button onClick={() => navigate('/reservar')} className="nav-link">
            Reservas de Notebooks
          </button>
        </div>
        <div className="navbar-user">
          <button onClick={() => navigate('/admin/login')} className="btn-login">
            Acesso Interno
          </button>
        </div>
      </nav>
      </>
    );
  }

  // Navegação para usuários internos autenticados
  const internalUser = localStorage.getItem('internal_user');
  const userData = internalUser ? JSON.parse(internalUser) : null;
  const userRole = userData?.role;
  
  const showAssetsLink = userRole === 'admin' || userRole === 'it_staff';
  const showReservationsLink = userRole === 'admin' || userRole === 'it_staff';
  const showAdminReservationsLink = showReservationsLink;
  const showUsersLink = userRole === 'admin' || userRole === 'it_staff';
  const showKnowledgeLink = userRole === 'admin' || userRole === 'it_staff';
  const showDocumentsLink = userRole === 'admin' || userRole === 'it_staff';
  const showReportsLink = userRole === 'admin' || userRole === 'it_staff' || userRole === 'admin_staff' || userRole === 'manager' || userRole === 'gestor';
  const showRhReportsLink = userRole === 'rh_staff';

  // Definir rota do dashboard baseado no papel
  const getDashboardRoute = () => {
    if (!userData) return '/admin/dashboard';
    if (userData.role === 'manager' || userData.role === 'gestor') return '/gestor/dashboard';
    if (userData.role === 'admin_staff') return '/admin/auxiliar/dashboard';
    if (userData.role === 'rh_staff') return '/rh/dashboard';
    return '/admin/dashboard';
  };

  const dashboardRoute = getDashboardRoute();

  // Todos os links em uma única lista (sem dropdown)
  const navLinks: Array<{ label: string; icon: NavIconName; action: () => void; badge?: number; active: boolean }> = [
    { label: 'Painel', icon: 'panel', active: location.pathname === dashboardRoute, action: () => navigate(dashboardRoute) },
    {
      label: 'Solicitações',
      icon: 'tickets',
      badge: unseenCount > 0 ? unseenCount : undefined,
      active: location.pathname.includes('/chamados') || location.pathname.includes('/solicitacoes'),
      action: () => {
        clearUnseen();
        if (userRole === 'manager' || userRole === 'gestor') navigate('/gestor/solicitacoes');
        else if (userRole === 'rh_staff') navigate('/rh/chamados');
        else navigate('/admin/chamados');
      },
    },
  ];

  if (showKnowledgeLink) {
    navLinks.push({ label: 'Central de Dúvidas', icon: 'help', active: location.pathname.startsWith('/admin/conhecimento'), action: () => navigate('/admin/conhecimento') });
  }

  if (showReservationsLink) {
    navLinks.push({ label: 'Reservas', icon: 'calendar', active: location.pathname.includes('/reservas'), action: () => navigate(showAdminReservationsLink ? '/admin/reservas' : '/reservas') });
  }

  if (showAssetsLink) {
    navLinks.push({ label: 'Inventário', icon: 'inventory', active: location.pathname.startsWith('/inventario'), action: () => navigate('/inventario') });
    navLinks.push({ label: 'Recorrentes', icon: 'repeat', active: location.pathname.startsWith('/admin/recorrentes'), action: () => navigate('/admin/recorrentes') });
  }

  if (showDocumentsLink) {
    navLinks.push({ label: 'Documentos', icon: 'document', active: location.pathname.startsWith('/admin/documentos'), action: () => navigate('/admin/documentos') });
  }

  if (showReportsLink) {
    navLinks.push({ label: 'Relatórios', icon: 'report', active: location.pathname.startsWith('/admin/relatorios'), action: () => navigate('/admin/relatorios') });
    navLinks.push({ label: 'KPIs', icon: 'kpi', active: location.pathname.startsWith('/admin/kpis'), action: () => navigate('/admin/kpis') });
  }

  if (showRhReportsLink) {
    navLinks.push({ label: 'Relatórios', icon: 'report', active: location.pathname.startsWith('/rh/relatorios'), action: () => navigate('/rh/relatorios') });
  }

  if (showUsersLink) {
    navLinks.push({ label: 'Equipe', icon: 'team', active: location.pathname.startsWith('/admin/usuarios'), action: () => navigate('/admin/usuarios') });
  }

  const initials = (userData?.name || 'Equipe')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('');
  const roleLabel = userRole === 'admin' ? 'Administrador' : userRole === 'it_staff' ? 'Equipe de TI' : userRole === 'admin_staff' ? 'Administrativo' : userRole === 'rh_staff' ? 'Recursos Humanos' : 'Área interna';
  const todayLabel = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());

  return (
    <nav className={`navbar navbar-internal ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      <aside className="internal-sidebar" aria-label="Navegação interna">
        <button type="button" className="navbar-brand" onClick={() => navigate(dashboardRoute)}>
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-copy"><strong>Portal de<br />Serviços Internos</strong><small>Área interna</small></span>
        </button>

        <div className="navbar-menu" id="internal-navigation-menu">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => {
                link.action();
                setMobileMenuOpen(false);
              }}
              className={`nav-link ${link.active ? 'active' : ''}`}
              aria-current={link.active ? 'page' : undefined}
            >
              <NavIcon name={link.icon} />
              <span>{link.label}</span>
              {link.badge !== undefined && (
                <span className="nav-badge">{link.badge > 99 ? '99+' : link.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <span className="sidebar-footer-label">Portal de Serviços Internos</span>
          <button onClick={handleLogout} className="logout-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg>
            Sair
          </button>
        </div>
      </aside>

      <div className="internal-topbar">
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-expanded={mobileMenuOpen}
          aria-controls="internal-navigation-menu"
          aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            {mobileMenuOpen ? <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
          </svg>
          <span>Menu</span>
        </button>
        <div className="navbar-search">
          <GlobalSearch />
        </div>
        <div className="topbar-date" aria-label={`Data de hoje: ${todayLabel}`}>
          <strong>{todayLabel}</strong>
          <span>Portal de Serviços Internos</span>
        </div>
        <button type="button" className="topbar-notifications" aria-label={`${unseenCount} notificações não vistas`} onClick={clearUnseen}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
          {unseenCount > 0 && <span>{unseenCount > 9 ? '9+' : unseenCount}</span>}
        </button>
        <div className="navbar-user">
          <span className="user-avatar" aria-hidden="true">{initials || 'PS'}</span>
          <span className="user-copy"><strong>{userData?.name || 'Equipe'}</strong><small>{roleLabel}</small></span>
        </div>
      </div>
    </nav>
  );
}
