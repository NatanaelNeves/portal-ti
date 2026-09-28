import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import ChatWidget from './ChatWidget';
import RhShell from './RhShell';
import TiShell from './TiShell';

const PUBLIC_LINKS = [
  { path: '/', label: 'Início', icon: 'ti-home' },
  { path: '/abrir-chamado', label: 'Abrir chamado', icon: 'ti-message-plus' },
  { path: '/meus-chamados', label: 'Meus chamados', icon: 'ti-list-check' },
  { path: '/central', label: 'Central de dúvidas', icon: 'ti-help-circle' },
];

/**
 * Escolhe a moldura: portal público, área do RH ou área interna (TI,
 * administrador, Administrativo e gestão).
 */
export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    // A tela de login da equipe é uma página inteira, com a própria marca.
    if (location.pathname === '/admin/login') return null;

    const go = (path: string) => {
      setMobileMenuOpen(false);
      navigate(path);
    };
    const isCurrent = (path: string) =>
      path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

    return (
      <>
      <ChatWidget />
      <header className="pub-header">
        <div className="pub-wrap pub-header__bar">
          <a
            href="/"
            className="pub-brand"
            onClick={(event) => { event.preventDefault(); go('/'); }}
          >
            <span className="pub-brand__mark" aria-hidden="true" />
            <span className="pub-brand__copy">
              <strong>Portal de Serviços</strong>
              <small>O Pequeno Nazareno</small>
            </span>
          </a>

          <nav className="pub-nav" aria-label="Portal público">
            {PUBLIC_LINKS.map((link) => (
              <button
                key={link.path}
                type="button"
                className="pub-nav__link"
                aria-current={isCurrent(link.path) ? 'page' : undefined}
                onClick={() => go(link.path)}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <button type="button" className="pub-header__staff" onClick={() => go('/admin/login')}>
            <i className="ti ti-lock" aria-hidden="true" />
            Acesso da equipe
          </button>

          <button
            type="button"
            className="pub-menu-toggle"
            aria-expanded={mobileMenuOpen}
            aria-controls="pub-sheet"
            onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
          >
            <i className={`ti ${mobileMenuOpen ? 'ti-x' : 'ti-menu-2'}`} aria-hidden="true" />
            {mobileMenuOpen ? 'Fechar' : 'Menu'}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="pub-sheet" id="pub-sheet">
            <nav className="pub-sheet__panel" aria-label="Portal público">
              {PUBLIC_LINKS.map((link) => (
                <button
                  key={link.path}
                  type="button"
                  className="pub-sheet__link"
                  aria-current={isCurrent(link.path) ? 'page' : undefined}
                  onClick={() => go(link.path)}
                >
                  <i className={`ti ${link.icon}`} aria-hidden="true" />
                  {link.label}
                </button>
              ))}
              <button type="button" className="pub-sheet__staff" onClick={() => go('/admin/login')}>
                <i className="ti ti-lock" aria-hidden="true" />
                Acesso da equipe
              </button>
            </nav>
            <button
              type="button"
              className="pub-sheet__backdrop"
              aria-label="Fechar menu"
              onClick={() => setMobileMenuOpen(false)}
            />
          </div>
        )}
      </header>
      </>
    );
  }

  let userData: { name?: string; role?: string } | null = null;
  try {
    userData = JSON.parse(localStorage.getItem('internal_user') || 'null');
  } catch {
    userData = null;
  }
  const userRole = userData?.role || '';

  // O RH tem moldura própria: abas sempre à vista e "Sair" no topo.
  if (userRole === 'rh_staff') {
    return <RhShell userName={userData?.name || 'Equipe de RH'} onLogout={handleLogout} />;
  }

  return <TiShell userName={userData?.name || 'Equipe'} role={userRole} onLogout={handleLogout} />;
}
