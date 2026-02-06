import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/InventoryPage.css';

interface InventoryItem {
  id: string;
  name: string;
  item_type: string;
  serial_number: string;
  status: string;
  location: string;
  assigned_to_id?: string;
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    item_type: '',
    serial_number: '',
    location: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    fetchItems(token);
  }, [filterStatus, navigate]);

  const fetchItems = async (token: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`/api/inventory?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar inventário');
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar inventário');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('internal_token');
    if (!token) return;

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Erro ao adicionar item');
      }

      setFormData({
        name: '',
        item_type: '',
        serial_number: '',
        location: '',
      });
      setShowForm(false);
      fetchItems(token);
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar item');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'status-available';
      case 'in_use':
        return 'status-in-use';
      case 'maintenance':
        return 'status-maintenance';
      case 'retired':
        return 'status-retired';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponível';
      case 'in_use':
        return 'Em Uso';
      case 'maintenance':
        return 'Manutenção';
      case 'retired':
        return 'Descartado';
      default:
        return status;
    }
  };

  if (!localStorage.getItem('internal_token')) {
    return null;
  }

  return (
    <div className="inventory-page">
      <div className="page-header">
        <h1>📦 Estoque de TI</h1>
        <p>Gerenciar equipamentos e recursos</p>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancelar' : '+ Adicionar Equipamento'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form onSubmit={handleAddItem} className="add-item-form">
          <div className="form-row">
            <div className="form-group">
              <label>Nome do Equipamento</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <input
                type="text"
                value={formData.item_type}
                onChange={(e) =>
                  setFormData({ ...formData, item_type: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Serial Number</label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) =>
                  setFormData({ ...formData, serial_number: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Localização</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            Adicionar Equipamento
          </button>
        </form>
      )}

      <div className="filters-section">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="all">Todos os Status</option>
          <option value="available">Disponível</option>
          <option value="in_use">Em Uso</option>
          <option value="maintenance">Manutenção</option>
          <option value="retired">Descartado</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Carregando inventário...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum equipamento encontrado</p>
        </div>
      ) : (
        <div className="inventory-grid">
          {items.map((item) => (
            <div key={item.id} className="inventory-card">
              <div className="card-header">
                <h3>{item.name}</h3>
                <span className={`status-badge ${getStatusColor(item.status)}`}>
                  {getStatusLabel(item.status)}
                </span>
              </div>
              <div className="card-body">
                <p><strong>Tipo:</strong> {item.item_type}</p>
                {item.serial_number && (
                  <p><strong>Serial:</strong> {item.serial_number}</p>
                )}
                <p><strong>Localização:</strong> {item.location}</p>
              </div>
              <div className="card-footer">
                <button
                  className="btn btn-small btn-primary"
                  onClick={() => navigate(`/admin/estoque/${item.id}`)}
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
