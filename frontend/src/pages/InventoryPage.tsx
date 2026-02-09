import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import '../styles/InventoryPage.css';

type TabType = 'notebooks' | 'peripherals';

interface Notebook {
  id: string;
  internal_code: string;
  brand: string;
  model: string;
  serial_number: string;
  processor?: string;
  ram?: string;
  storage?: string;
  screen_size?: string;
  operating_system?: string;
  current_unit: string;
  current_status: string;
  physical_condition: string;
  current_responsible_name?: string;
}

interface Peripheral {
  id: string;
  internal_code: string;
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  current_unit: string;
  current_status: string;
  physical_condition?: string;
  acquisition_date?: string;
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('notebooks');
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [peripherals, setPeripherals] = useState<Peripheral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');

  const units = [
    'Unidade Agapito',
    'Unidade Senador',
    'Unidade Caucaia',
    'Unidade Maracanau',
    'Unidade VP',
    'Unidade Maranguape'
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('internal_token');
      
      const endpoint = activeTab === 'notebooks' 
        ? '/api/inventory/notebooks'
        : '/api/inventory/peripherals';

      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar dados');

      const data = await response.json();
      
      if (activeTab === 'notebooks') {
        setNotebooks(data.notebooks || []);
      } else {
        setPeripherals(data.peripherals || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar notebooks
  const filteredNotebooks = notebooks.filter(nb => {
    const matchesSearch = searchQuery === '' || 
      nb.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nb.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nb.internal_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (nb.serial_number && nb.serial_number.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || nb.current_status === statusFilter;
    const matchesUnit = unitFilter === 'all' || nb.current_unit === unitFilter;
    
    return matchesSearch && matchesStatus && matchesUnit;
  });

  // Filtrar periféricos
  const filteredPeripherals = peripherals.filter(per => {
    const matchesSearch = searchQuery === '' || 
      per.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      per.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      per.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      per.internal_code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || per.current_status === statusFilter;
    const matchesUnit = unitFilter === 'all' || per.current_unit === unitFilter;
    
    return matchesSearch && matchesStatus && matchesUnit;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'available': '#10b981',
      'in_use': '#3b82f6',
      'in_maintenance': '#f59e0b',
      'lowered': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'available': '✓ Disponível',
      'in_use': '👤 Em Uso',
      'in_maintenance': '🔧 Manutenção',
      'lowered': '🗑️ Baixado'
    };
    return labels[status] || status;
  };

  const getConditionIcon = (condition: string) => {
    const icons: Record<string, string> = {
      'new': '⭐',
      'good': '✓',
      'regular': '~',
      'bad': '✗'
    };
    return icons[condition] || '';
  };

  return (
    <InventoryLayout>
      <div className="inventory-page">
        
        {/* HEADER */}
        <div className="page-header-inventory">
          <div className="header-top">
            <div>
              <h1>📦 Inventário de Equipamentos</h1>
              <p>Gerenciar notebooks, periféricos e equipamentos</p>
            </div>
            <button 
              className="btn-add-equipment"
              onClick={() => navigate('/inventario/novo-equipamento')}
            >
              ➕ Novo Equipamento
            </button>
          </div>

          {/* TABS */}
          <div className="tabs-inventory">
            <button
              className={`tab-btn-inventory ${activeTab === 'notebooks' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('notebooks');
                setSearchQuery('');
                setStatusFilter('all');
                setUnitFilter('all');
              }}
            >
              <span className="tab-icon">💻</span>
              <span className="tab-label">Notebooks</span>
              <span className="tab-count">{notebooks.length}</span>
            </button>
            <button
              className={`tab-btn-inventory ${activeTab === 'peripherals' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('peripherals');
                setSearchQuery('');
                setStatusFilter('all');
                setUnitFilter('all');
              }}
            >
              <span className="tab-icon">🖱️</span>
              <span className="tab-label">Periféricos</span>
              <span className="tab-count">{peripherals.length}</span>
            </button>
          </div>
        </div>

        {error && <div className="alert-error">⚠️ {error}</div>}

        {/* FILTROS */}
        <div className="filters-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={activeTab === 'notebooks' ? 'Buscar por marca, modelo, código...' : 'Buscar por tipo, marca, modelo...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="available">Disponível</option>
            <option value="in_use">Em Uso</option>
            <option value="in_maintenance">Manutenção</option>
            <option value="lowered">Baixado</option>
          </select>

          <select
            className="filter-select"
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
          >
            <option value="all">Todas as Unidades</option>
            {units.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>

          <button className="btn-reset-filters" onClick={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setUnitFilter('all');
          }}>
            🔄 Limpar Filtros
          </button>
        </div>

        {/* CONTEÚDO */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando {activeTab === 'notebooks' ? 'notebooks' : 'periféricos'}...</p>
          </div>
        ) : activeTab === 'notebooks' ? (
          // NOTEBOOKS TABLE VIEW
          <div className="notebooks-section">
            {filteredNotebooks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>Nenhum notebook encontrado</h3>
                <p>Adicione notebooks ao inventário ou ajuste os filtros</p>
                <button className="btn-primary" onClick={() => navigate('/inventario/novo-equipamento')}>
                  ➕ Adicionar Notebook
                </button>
              </div>
            ) : (
              <div className="notebooks-table-container">
                <table className="notebooks-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Marca/Modelo</th>
                      <th>Especificações</th>
                      <th>Unidade</th>
                      <th>Status</th>
                      <th>Responsável</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotebooks.map(notebook => (
                      <tr key={notebook.id} onClick={() => navigate(`/inventario/equipamento/${notebook.id}`)} className="clickable-row">
                        <td>
                          <code className="equipment-code">{notebook.internal_code}</code>
                        </td>
                        <td>
                          <div className="equipment-info">
                            <strong>{notebook.brand} {notebook.model}</strong>
                            <small>{notebook.serial_number}</small>
                          </div>
                        </td>
                        <td>
                          <div className="specs">
                            {notebook.processor && <span className="spec-badge">🔹 {notebook.processor}</span>}
                            {notebook.ram && <span className="spec-badge">💾 {notebook.ram}</span>}
                            {notebook.storage && <span className="spec-badge">💿 {notebook.storage}</span>}
                            {notebook.screen_size && <span className="spec-badge">📺 {notebook.screen_size}</span>}
                          </div>
                        </td>
                        <td>
                          <span className="unit-badge">{notebook.current_unit}</span>
                        </td>
                        <td>
                          <span 
                            className="status-badge-inline"
                            style={{ backgroundColor: getStatusColor(notebook.current_status) }}
                          >
                            {getStatusLabel(notebook.current_status)}
                          </span>
                        </td>
                        <td>
                          {notebook.current_responsible_name ? (
                            <span className="responsible-name">👤 {notebook.current_responsible_name}</span>
                          ) : (
                            <span className="no-responsible">—</span>
                          )}
                        </td>
                        <td>
                          <button 
                            className="btn-table-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/inventario/equipamento/${notebook.id}`);
                            }}
                          >
                            📄 Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          // PERIPHERALS CARDS VIEW
          <div className="peripherals-section">
            {filteredPeripherals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>Nenhum periférico encontrado</h3>
                <p>Adicione periféricos ao inventário ou ajuste os filtros</p>
                <button className="btn-primary" onClick={() => navigate('/inventario/novo-equipamento')}>
                  ➕ Adicionar Periférico
                </button>
              </div>
            ) : (
              <div className="peripherals-grid">
                {filteredPeripherals.map(peripheral => (
                  <div 
                    key={peripheral.id} 
                    className="peripheral-card"
                    onClick={() => navigate(`/inventario/equipamento/${peripheral.id}`)}
                  >
                    <div className="card-header-peripheral">
                      <div className="card-type">
                        <span className="type-icon">🖱️</span>
                        <span className="type-label">{peripheral.type}</span>
                      </div>
                      <span 
                        className="status-badge-card"
                        style={{ backgroundColor: getStatusColor(peripheral.current_status) }}
                      >
                        {getStatusLabel(peripheral.current_status)}
                      </span>
                    </div>

                    <div className="card-body-peripheral">
                      <h3>{peripheral.brand} {peripheral.model}</h3>
                      <div className="card-details">
                        <div className="detail-row">
                          <span className="detail-label">Código:</span>
                          <code>{peripheral.internal_code}</code>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Unidade:</span>
                          <span>{peripheral.current_unit}</span>
                        </div>
                        {peripheral.physical_condition && (
                          <div className="detail-row">
                            <span className="detail-label">Condição:</span>
                            <span>{getConditionIcon(peripheral.physical_condition)} {peripheral.physical_condition}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="card-footer-peripheral">
                      <button 
                        className="btn-card-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/inventario/equipamento/${peripheral.id}`);
                        }}
                      >
                        📄 Ver Detalhes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </InventoryLayout>
  );
}
