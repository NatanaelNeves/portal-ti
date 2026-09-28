import { useEffect, useRef, useState } from 'react';
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
 * Moldura do Administrativo: barra lateral à esquerda, com as abas uma
 * embaixo da outra (o setor prefere assim à barra de abas no topo). Tem a
 * cor do quadro de chaves e o trilho de aço descendo pela borda; a aba
 * atual ganha uma pílula clara que desliza até ela. "Sair" fica sempre no
 * pé da barra. No celular a barra vira uma gaveta aberta pelo botão Menu.
 */
export default function AdmShell({ userName, onLogout }: AdmShellProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { unseenCount, markAllRead } = useNotifications();
  const navRef = useRef<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeIndex = TABS.findIndex((tab) => pathname.startsWith(tab.path));
  const pill = useSlidingPill(navRef, '.axs-tab', activeIndex, 'y');
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'AD';

  const go = (path: string) => {
    if (path === '/admin/chamados') markAllRead();
    setMenuOpen(false);
    navigate(path);
  };

  // Alt+1…3 abre a área correspondente, como na barra lateral da TI.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < TABS.length) {
        event.preventDefault();
        go(TABS[index].path);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // A gaveta do celular fecha ao trocar de página e com Esc.
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const badgeFor = (path: string) => (path === '/admin/chamados' && unseenCount > 0 ? unseenCount : 0);

  return (
    <div className={`axs${menuOpen ? ' is-open' : ''}`}>
      {/* Faixa do celular: só aparece em telas pequenas */}
      <header className="axs-mobile">
        <button
          type="button"
          className="axs-mobile__menu"
          aria-expanded={menuOpen}
          aria-controls="axs-side"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'}`} aria-hidden="true" />
          Menu
        </button>
        <span className="axs-mobile__where">{TABS[activeIndex]?.label ?? 'Administrativo'}</span>
        <button type="button" className="axs-mobile__logout" onClick={onLogout}>
          <i className="ti ti-logout" aria-hidden="true" />
          Sair
        </button>
      </header>

      <aside className="axs-side" id="axs-side" aria-label="Navegação do Administrativo">
        <button type="button" className="axs-brand" onClick={() => go(TABS[0].path)}>
          <span className="pub-brand__mark" aria-hidden="true" />
          <span className="axs-brand__copy">
            <strong>Administrativo</strong>
            <small>Portal de Serviços</small>
          </span>
        </button>

        <button type="button" className="axs-new" onClick={() => { setMenuOpen(false); navigate('/abrir-chamado'); }}>
          <i className="ti ti-plus" aria-hidden="true" />
          Registrar pedido
        </button>

        <nav className="axs-nav" ref={navRef} aria-label="Áreas do Administrativo">
          {pill.visible && <span className="axs-nav__pill" aria-hidden="true" style={pill.style} />}
          {TABS.map((tab, index) => {
            const badge = badgeFor(tab.path);
            return (
              <button
                key={tab.path}
                type="button"
                className="axs-tab"
                aria-current={index === activeIndex ? 'page' : undefined}
                title={`${tab.label} (Alt+${index + 1})`}
                onClick={() => go(tab.path)}
              >
                <i className={`ti ${tab.icon}`} aria-hidden="true" />
                <span>{tab.label}</span>
                {badge > 0 && <span className="axs-badge" aria-label={`${badge} novidades`}>{badge > 9 ? '9+' : badge}</span>}
              </button>
            );
          })}
        </nav>

        <div className="axs-foot">
          <div className="axs-user">
            <span className="axs-user__avatar" aria-hidden="true">{initials}</span>
            <span className="axs-user__copy">
              <strong>{userName}</strong>
              <small>Administrativo</small>
            </span>
          </div>
          <button type="button" className="axs-logout" onClick={onLogout}>
            <i className="ti ti-logout" aria-hidden="true" />
            Sair da conta
          </button>
        </div>
      </aside>

      <button
        type="button"
        className="axs-scrim"
        aria-label="Fechar menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />
    </div>
  );
}
