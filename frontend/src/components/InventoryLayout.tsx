import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/InventoryLayout.css';

interface InventoryLayoutProps {
  children: ReactNode;
}

const IcoGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const IcoBox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const IcoLaptop = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

const IcoMouse = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="3" width="12" height="18" rx="6"/><line x1="12" y1="7" x2="12" y2="11"/>
  </svg>
);

const IcoUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const IcoCart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

export default function InventoryLayout({ children }: InventoryLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="inventory-layout">
      <aside className="inventory-sidebar">
        <div className="sidebar-header">
          <IcoBox />
          <h2>Inventário</h2>
        </div>
        <nav className="inventory-nav">
          <button
            className={`nav-item ${isActive('/inventario')}`}
            onClick={() => navigate('/inventario')}
          >
            <span className="icon"><IcoGrid /></span>
            <span>Visão Geral</span>
          </button>

          <div className="nav-section">
            <div className="nav-section-title">Equipamentos</div>
            <button
              className={`nav-item ${isActive('/inventario/equipamentos')}`}
              onClick={() => navigate('/inventario/equipamentos')}
            >
              <span className="icon"><IcoBox /></span>
              <span>Todos</span>
            </button>
            <button
              className={`nav-item ${isActive('/inventario/notebooks')}`}
              onClick={() => navigate('/inventario/notebooks')}
            >
              <span className="icon"><IcoLaptop /></span>
              <span>Notebooks</span>
            </button>
            <button
              className={`nav-item ${isActive('/inventario/perifericos')}`}
              onClick={() => navigate('/inventario/perifericos')}
            >
              <span className="icon"><IcoMouse /></span>
              <span>Periféricos</span>
            </button>
          </div>

          <button
            className={`nav-item ${isActive('/inventario/responsabilidades')}`}
            onClick={() => navigate('/inventario/responsabilidades')}
          >
            <span className="icon"><IcoUser /></span>
            <span>Responsabilidades</span>
          </button>
          <button
            className={`nav-item ${isActive('/inventario/compras')}`}
            onClick={() => navigate('/inventario/compras')}
          >
            <span className="icon"><IcoCart /></span>
            <span>Compras</span>
          </button>
        </nav>
      </aside>
      <main className="inventory-main">
        {children}
      </main>
    </div>
  );
}
