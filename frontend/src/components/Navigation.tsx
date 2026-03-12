import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import GlobalSearch from './GlobalSearch';
import '../styles/Navigation.css';

export default function Navigation() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
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
      <nav className="navbar">
        <div className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <h1>Central de Apoio OPN</h1>
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
        </div>
        <div className="navbar-user">
          <button onClick={() => navigate('/admin/login')} className="btn-login">
            Acesso Interno
          </button>
        </div>
      </nav>
    );
  }

  // Navegação para usuários internos autenticados
  const internalUser = localStorage.getItem('internal_user');
  const userData = internalUser ? JSON.parse(internalUser) : null;
  const userRole = userData?.role;
  
  const showAssetsLink = userRole === 'admin' || userRole === 'it_staff';
  const showUsersLink = userRole === 'admin' || userRole === 'it_staff';
  const showKnowledgeLink = userRole === 'admin' || userRole === 'it_staff';
  const showDocumentsLink = userRole === 'admin' || userRole === 'it_staff';
  const showReportsLink = userRole === 'admin' || userRole === 'it_staff' || userRole === 'manager' || userRole === 'gestor';

  // Definir rota do dashboard baseado no papel
  const getDashboardRoute = () => {
    if (!userData) return '/admin/dashboard';
    if (userData.role === 'manager' || userData.role === 'gestor') return '/gestor/dashboard';
    if (userData.role === 'admin_staff') return '/admin/auxiliar/dashboard';
    return '/admin/dashboard';
  };

  const dashboardRoute = getDashboardRoute();

  // Todos os links em uma única lista (sem dropdown)
  const navLinks: Array<{ label: string; action: () => void }> = [
    { label: 'Painel', action: () => navigate(dashboardRoute) },
    {
      label: 'Solicitações',
      action: () => navigate(
        userRole === 'manager' || userRole === 'gestor' ? '/gestor/solicitacoes' : '/admin/chamados'
      ),
    },
  ];

  if (showKnowledgeLink) {
    navLinks.push({ label: 'Central de Dúvidas', action: () => navigate('/admin/conhecimento') });
  }

  if (showAssetsLink) {
    navLinks.push({ label: 'Inventário', action: () => navigate('/inventario') });
  }

  if (showDocumentsLink) {
    navLinks.push({ label: 'Documentos', action: () => navigate('/admin/documentos') });
  }

  if (showReportsLink) {
    navLinks.push({ label: 'Relatórios', action: () => navigate('/admin/relatorios') });
  }

  if (showUsersLink) {
    navLinks.push({ label: 'Equipe', action: () => navigate('/admin/usuarios') });
  }

  return (
    <nav className="navbar navbar-internal">
      <div className="navbar-brand" onClick={() => navigate(dashboardRoute)} style={{ cursor: 'pointer' }}>
        <h1>Central de Apoio OPN</h1>
        <small style={{ fontSize: '0.75rem', opacity: 0.9 }}>Área Interna</small>
      </div>

      <div className="navbar-menu">
        {navLinks.map((link) => (
          <button
            key={link.label}
            onClick={link.action}
            className="nav-link"
          >
            {link.label}
          </button>
        ))}
      </div>

      <div className="navbar-right">
        {showAssetsLink && (
          <div className="navbar-search">
            <GlobalSearch />
          </div>
        )}
        <div className="navbar-user">
          <span className="user-info">{userData?.name}</span>
          <button onClick={handleLogout} className="logout-btn">
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}
