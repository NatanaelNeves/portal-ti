import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import '../styles/EquipmentDetailPage.css';

interface Movement {
  id: string;
  movement_type: string;
  from_location: string;
  to_location: string;
  reason: string;
  movement_date: string;
}

interface ResponsibilityTerm {
  id: string;
  responsible_name: string;
  issued_date: string;
  returned_date?: string;
  status: 'active' | 'returned' | 'cancelled';
}

interface Equipment {
  id: string;
  internal_code: string;
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  physical_condition: string;
  current_status: string;
  current_location: string;
  current_responsible_name: string;
  acquisition_date: string;
  warranty_expiration: string;
}

export default function EquipmentDetailPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const navigate = useNavigate();
  
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [terms, setTerms] = useState<ResponsibilityTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'movements' | 'terms'>('overview');

  useEffect(() => {
    fetchEquipmentDetails();
  }, [equipmentId]);

  const fetchEquipmentDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      
      const response = await fetch(`/api/inventory/equipment/${equipmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Equipamento não encontrado');

      const data = await response.json();
      setEquipment(data.equipment);
      setMovements(data.movements || []);
      setTerms(data.terms || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <InventoryLayout>
        <div className="equipment-detail-page">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando detalhes...</p>
          </div>
        </div>
      </InventoryLayout>
    );
  }

  if (!equipment) {
    return (
      <InventoryLayout>
        <div className="equipment-detail-page">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2>Equipamento não encontrado</h2>
            <button onClick={() => navigate('/inventario/equipamentos')} className="btn btn-primary">
              ← Voltar
            </button>
          </div>
        </div>
      </InventoryLayout>
    );
  }

  const statusColors: Record<string, string> = {
    in_use: '#10b981', in_stock: '#3b82f6', in_maintenance: '#f59e0b', lowered: '#ef4444'
  };

  const statusLabels: Record<string, string> = {
    in_use: '✓ Em Uso', in_stock: '📦 Estoque', in_maintenance: '🔧 Manutenção', lowered: '🗑️ Baixado'
  };

  return (
    <InventoryLayout>
      <div className="equipment-detail-page">
        {/* Header */}
        <div className="detail-header">
          <button onClick={() => navigate('/inventario/equipamentos')} className="btn-back">← Voltar</button>
          <div className="header-main">
            <div><h1>{equipment.brand} {equipment.model}</h1><p>Código: <strong>{equipment.internal_code}</strong></p></div>
            <span className="status-badge-main" style={{ backgroundColor: statusColors[equipment.current_status] }}>
              {statusLabels[equipment.current_status]}
            </span>
          </div>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {/* Tabs */}
        <div className="tabs-nav">
          {['overview', 'movements', 'terms'].map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab as any)}>
              {tab === 'overview' && <>📋 Visão Geral</>}
              {tab === 'movements' && <>📊 Histórico <span className="badge">{movements.length}</span></>}
              {tab === 'terms' && <>📝 Termos <span className="badge">{terms.length}</span></>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="tabs-content">
          {activeTab === 'overview' && (
            <div className="tab-pane">
              <div className="grid-2">
                <div className="card">
                  <h3>⚙️ Especificações</h3>
                  <dl className="info-list">
                    <dt>Tipo</dt><dd>{equipment.type}</dd>
                    <dt>Marca</dt><dd>{equipment.brand}</dd>
                    <dt>Modelo</dt><dd>{equipment.model}</dd>
                    <dt>Série</dt><dd>{equipment.serial_number || '-'}</dd>
                    <dt>Condição</dt><dd>{equipment.physical_condition || '-'}</dd>
                  </dl>
                </div>
                <div className="card">
                  <h3>🏛️ Institucional</h3>
                  <dl className="info-list">
                    <dt>Status</dt><dd><span className="badge" style={{ backgroundColor: statusColors[equipment.current_status] }}>{statusLabels[equipment.current_status]}</span></dd>
                    <dt>Localização</dt><dd>{equipment.current_location || '-'}</dd>
                    <dt>Responsável</dt><dd>{equipment.current_responsible_name || '-'}</dd>
                    <dt>Aquisição</dt><dd>{equipment.acquisition_date ? new Date(equipment.acquisition_date).toLocaleDateString('pt-BR') : '-'}</dd>
                    <dt>Garantia</dt><dd>{equipment.warranty_expiration ? new Date(equipment.warranty_expiration).toLocaleDateString('pt-BR') : 'Expirada'}</dd>
                  </dl>
                </div>
              </div>
              <div className="card card-actions">
                <h3>⚡ Ações</h3>
                <div className="action-buttons">
                  <button className="btn btn-primary" onClick={() => navigate(`/inventario/equipamento/${equipmentId}/assinar-termo`)}>✍️ Novo Termo</button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/inventario/equipamento/${equipmentId}/movimentar`)}>↔️ Movimentar</button>
                  <button className="btn btn-outline" onClick={() => window.print()}>🖨️ Imprimir</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'movements' && (
            <div className="tab-pane">
              {movements.length === 0 ? (
                <div className="empty-state">📭 Sem movimentações</div>
              ) : (
                <div className="timeline">
                  {movements.map(m => (
                    <div key={m.id} className="timeline-item">
                      <div className="timeline-marker">
                        {m.movement_type === 'entrega' && '📤'}
                        {m.movement_type === 'devolução' && '📥'}
                        {m.movement_type === 'transferência' && '↔️'}
                        {m.movement_type === 'manutenção' && '🔧'}
                        {m.movement_type === 'baixa' && '🗑️'}
                      </div>
                      <div className="timeline-card">
                        <h4>{m.movement_type}</h4>
                        <time>{new Date(m.movement_date).toLocaleDateString('pt-BR')}</time>
                        <p><strong>De:</strong> {m.from_location}</p>
                        <p><strong>Para:</strong> {m.to_location}</p>
                        {m.reason && <p><strong>Motivo:</strong> {m.reason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="tab-pane">
              {terms.length === 0 ? (
                <div className="empty-state">📋 Sem termos<button className="btn btn-primary" onClick={() => navigate(`/inventario/equipamento/${equipmentId}/assinar-termo`)}>✍️ Criar Termo</button></div>
              ) : (
                <div className="terms-list">
                  {terms.map(t => (
                    <div key={t.id} className={`term-card status-${t.status}`}>
                      <div className="term-main">
                        <div><h4>{t.responsible_name}</h4><p>{new Date(t.issued_date).toLocaleDateString('pt-BR')} {t.returned_date && `- ${new Date(t.returned_date).toLocaleDateString('pt-BR')}`}</p></div>
                        <span className={`badge badge-${t.status}`}>
                          {t.status === 'active' && '✓ Ativo'}
                          {t.status === 'returned' && '📥 Devolvido'}
                          {t.status === 'cancelled' && '❌ Cancelado'}
                        </span>
                      </div>
                      <div className="term-actions">
                        <button className="btn btn-small" onClick={() => navigate(`/inventario/termo/${t.id}/pdf`)}>📄 Ver</button>
                        {t.status === 'active' && <button className="btn btn-small btn-danger" onClick={() => navigate(`/inventario/termo/${t.id}/devolucao`)}>📥 Devolver</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </InventoryLayout>
  );
}
