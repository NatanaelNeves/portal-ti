import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
// import { UserRole } from '../types';
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
  
  const showAssetsLink = userData && (userData.role === 'admin' || userData.role === 'it_staff');
  const showUsersLink = userData && (userData.role === 'admin' || userData.role === 'it_staff');
  const showKnowledgeLink = userData && ['it_staff', 'admin'].includes(userData.role);

  // Definir rota do dashboard baseado no papel
  const getDashboardRoute = () => {
    if (!userData) return '/admin/dashboard';
    if (userData.role === 'manager') return '/gestor/dashboard';
    return '/admin/dashboard';
  };

  const dashboardRoute = getDashboardRoute();

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate(dashboardRoute)} style={{ cursor: 'pointer' }}>
        <h1>Central de Apoio OPN</h1>
        <small style={{ fontSize: '0.75rem', opacity: 0.9 }}>Área Interna</small>
      </div>
      <div className="navbar-menu">
        <button onClick={() => navigate(dashboardRoute)} className="nav-link">
          Painel
        </button>
        <button 
          onClick={() => navigate(userData?.role === 'manager' ? '/gestor/solicitacoes' : '/admin/chamados')} 
          className="nav-link"
        >
          Solicitações
        </button>
        {showKnowledgeLink && (
          <button onClick={() => navigate('/admin/conhecimento')} className="nav-link">
            Central de Dúvidas
          </button>
        )}
        {showAssetsLink && (
          <button onClick={() => navigate('/inventario')} className="nav-link">
            📦 Inventário
          </button>
        )}
        {showKnowledgeLink && (
          <button onClick={() => navigate('/admin/relatorios')} className="nav-link">
            📊 Relatórios
          </button>
        )}
        {showUsersLink && (
          <button onClick={() => navigate('/admin/usuarios')} className="nav-link">
            Equipe
          </button>
        )}
      </div>
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
    </nav>
  );
}
