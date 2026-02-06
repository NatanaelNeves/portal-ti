import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/InventoryLayout.css';

interface InventoryLayoutProps {
  children: ReactNode;
}

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
          <h2>📦 Inventário</h2>
        </div>
        <nav className="inventory-nav">
          <button 
            className={`nav-item ${isActive('/inventario')}`}
            onClick={() => navigate('/inventario')}
          >
            <span className="icon">📊</span>
            <span>Visão Geral</span>
          </button>
          <button 
            className={`nav-item ${isActive('/inventario/responsabilidades')}`}
            onClick={() => navigate('/inventario/responsabilidades')}
          >
            <span className="icon">👤</span>
            <span>Responsabilidades</span>
          </button>
          <button 
            className={`nav-item ${isActive('/inventario/equipamentos')}`}
            onClick={() => navigate('/inventario/equipamentos')}
          >
            <span className="icon">🖥️</span>
            <span>Equipamentos</span>
          </button>
          <button 
            className={`nav-item ${isActive('/inventario/compras')}`}
            onClick={() => navigate('/inventario/compras')}
          >
            <span className="icon">🛒</span>
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
