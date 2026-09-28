import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/InventoryLayout.css';

interface InventoryLayoutProps {
  children: ReactNode;
}

const TABS = [
  { path: '/inventario', label: 'Visão geral', icon: 'ti-layout-dashboard', exact: true },
  { path: '/inventario/equipamentos', label: 'Todos', icon: 'ti-packages', also: ['/inventario/equipamento/'] },
  { path: '/inventario/notebooks', label: 'Notebooks', icon: 'ti-device-laptop' },
  { path: '/inventario/perifericos', label: 'Periféricos', icon: 'ti-mouse' },
  { path: '/inventario/responsabilidades', label: 'Responsabilidades', icon: 'ti-user-check', also: ['/inventario/termo/'] },
  { path: '/inventario/compras', label: 'Compras', icon: 'ti-shopping-cart' },
];

// Fluxos de tela cheia, que não pertencem a uma aba.
const FLOWS = ['/inventario/equipamentos/novo', '/inventario/equipamentos/entregar', '/inventario/equipamentos/devolver'];

/**
 * Moldura das telas de inventário: abas na horizontal (a terceira coluna
 * vertical tirava espaço das tabelas) e as ações mais usadas sempre à vista.
 */
export default function InventoryLayout({ children }: InventoryLayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (tab: typeof TABS[number]) => {
    if (FLOWS.some((flow) => pathname.startsWith(flow))) return false;
    if (tab.exact) return pathname === tab.path;
    return pathname.startsWith(tab.path) || (tab.also ?? []).some((p) => pathname.startsWith(p));
  };

  return (
    <div className="inventory-layout invx">
      <nav className="invx-bar" aria-label="Inventário">
        <div className="invx-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.path}
              type="button"
              className="invx-tab"
              aria-current={isActive(tab) ? 'page' : undefined}
              onClick={() => navigate(tab.path)}
            >
              <i className={`ti ${tab.icon}`} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="invx-actions">
          <button type="button" className="invx-action" onClick={() => navigate('/inventario/equipamentos/entregar')} title="Entregar equipamento">
            <i className="ti ti-arrow-up-right" aria-hidden="true" /><span>Entregar</span>
          </button>
          <button type="button" className="invx-action" onClick={() => navigate('/inventario/equipamentos/devolver')} title="Receber devolução">
            <i className="ti ti-arrow-down-left" aria-hidden="true" /><span>Receber devolução</span>
          </button>
          <button type="button" className="invx-action invx-action--primary" onClick={() => navigate('/inventario/equipamentos/novo')} title="Cadastrar equipamento">
            <i className="ti ti-plus" aria-hidden="true" /><span>Cadastrar</span>
          </button>
        </div>
      </nav>
      <main className="inventory-main">{children}</main>
    </div>
  );
}
