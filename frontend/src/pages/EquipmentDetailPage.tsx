import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import PhotoUploader from '../components/PhotoUploader';
import DocumentUploader from '../components/DocumentUploader';
import '../styles/EquipmentDetailPage.css';
import '../styles/InventoryButtons.css';

// Função para traduzir tipos de movimentação
const translateMovementType = (type: string): string => {
  const translations: { [key: string]: string } = {
    'delivery': 'Entrega',
    'return': 'Devolução',
    'transfer': 'Transferência',
    'maintenance': 'Manutenção',
    'disposal': 'Baixa',
    'entrega': 'Entrega',
    'devolução': 'Devolução',
    'transferência': 'Transferência',
    'manutenção': 'Manutenção',
    'baixa': 'Baixa'
  };
  return translations[type] || type;
};

// Função para traduzir motivos comuns
const translateReason = (reason: string): string => {
  const translations: { [key: string]: string } = {
    'uso_diario': 'Uso diário',
    'daily_use': 'Uso diário',
    'home_office': 'Home office',
    'new_hire': 'Novo contratado',
    'replacement': 'Substituição',
    'project': 'Projeto específico',
    'Devolução': 'Devolução'
  };
  return translations[reason] || reason;
};

interface Movement {
  id: string;
  movement_type: string;
  movement_number: string;
  from_user_name?: string;
  to_user_name?: string;
  from_location?: string;
  to_location?: string;
  from_unit?: string;
  to_unit?: string;
  reason?: string;
  movement_date: string;
  registered_by_name?: string;
}

interface ResponsibilityTerm {
  id: string;
  responsible_name: string;
  issued_date: string;
  returned_date?: string;
  status: 'active' | 'returned' | 'cancelled';
}

interface Photo {
  url: string;
  filename: string;
}

interface Document {
  filename: string;
  url: string;
  type: string;
  description: string;
  uploaded_at: string;
  size: number;
  mimetype: string;
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
  responsible_name?: string;
  acquisition_date: string;
  warranty_expiration: string;
}

export default function EquipmentDetailPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const navigate = useNavigate();
  
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [terms, setTerms] = useState<ResponsibilityTerm[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'movements' | 'terms' | 'uploads'>('overview');

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
      setPhotos(data.photos || []);
      setDocuments(data.documents || []);
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
          {['overview', 'movements', 'terms', 'uploads'].map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab as any)}>
              {tab === 'overview' && <>📋 Visão Geral</>}
              {tab === 'movements' && <>📊 Histórico <span className="badge">{movements.length}</span></>}
              {tab === 'terms' && <>📝 Termos <span className="badge">{terms.length}</span></>}
              {tab === 'uploads' && <>📎 Arquivos <span className="badge">{photos.length + documents.length}</span></>}
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
                    <dt>Responsável</dt><dd>{equipment.responsible_name || '-'}</dd>
                    <dt>Aquisição</dt><dd>{equipment.acquisition_date ? new Date(equipment.acquisition_date).toLocaleDateString('pt-BR') : '-'}</dd>
                    <dt>Garantia</dt><dd>{equipment.warranty_expiration ? (new Date(equipment.warranty_expiration) > new Date() ? new Date(equipment.warranty_expiration).toLocaleDateString('pt-BR') : `Expirada em ${new Date(equipment.warranty_expiration).toLocaleDateString('pt-BR')}`) : 'Sem garantia'}</dd>
                  </dl>
                </div>
              </div>
              <div className="card card-actions">
                <h3>⚡ Ações Rápidas</h3>
                <div className="action-buttons-grid">
                  <button className="btn btn-new-term" onClick={() => navigate(`/inventario/equipamento/${equipmentId}/assinar-termo`)}>
                    <span className="btn-icon">✍️</span> Novo Termo
                  </button>
                  <button className="btn btn-move" onClick={() => navigate(`/inventario/equipamento/${equipmentId}/movimentar`)}>
                    <span className="btn-icon">↔️</span> Movimentar
                  </button>
                  <button className="btn btn-print" onClick={() => window.print()}>
                    <span className="btn-icon">🖨️</span> Imprimir
                  </button>
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
                  {movements.map(m => {
                    const typeTranslated = translateMovementType(m.movement_type);
                    const fromInfo = m.from_user_name || m.from_location || 'Estoque TI';
                    const toInfo = m.to_user_name || m.to_location || 'Estoque TI';
                    
                    return (
                      <div key={m.id} className="timeline-item">
                        <div className="timeline-marker">
                          {['delivery', 'entrega'].includes(m.movement_type) && '📤'}
                          {['return', 'devolução'].includes(m.movement_type) && '📥'}
                          {['transfer', 'transferência'].includes(m.movement_type) && '↔️'}
                          {['maintenance', 'manutenção'].includes(m.movement_type) && '🔧'}
                          {['disposal', 'baixa'].includes(m.movement_type) && '🗑️'}
                        </div>
                        <div className="timeline-card">
                          <h4>{typeTranslated}</h4>
                          <time>{m.movement_date ? new Date(m.movement_date).toLocaleDateString('pt-BR') : '-'}</time>
                          <p><strong>De:</strong> {fromInfo}{m.from_unit ? ` (${m.from_unit})` : ''}</p>
                          <p><strong>Para:</strong> {toInfo}{m.to_unit ? ` (${m.to_unit})` : ''}</p>
                          {m.reason && <p><strong>Motivo:</strong> {translateReason(m.reason)}</p>}
                          {m.registered_by_name && <p className="text-muted"><small>Registrado por: {m.registered_by_name}</small></p>}
                        </div>
                      </div>
                    );
                  })}
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
                        <div><h4>{t.responsible_name}</h4><p>{t.issued_date ? new Date(t.issued_date).toLocaleDateString('pt-BR') : '-'} {t.returned_date && `- ${new Date(t.returned_date).toLocaleDateString('pt-BR')}`}</p></div>
                        <span className={`badge badge-${t.status}`}>
                          {t.status === 'active' && '✓ Ativo'}
                          {t.status === 'returned' && '📥 Devolvido'}
                          {t.status === 'cancelled' && '❌ Cancelado'}
                          {t.status === 'transferred' && '↔️ Transferido'}
                        </span>
                      </div>
                      <div className="term-actions">
                        <button 
                          className="btn btn-small" 
                          onClick={() => {
                            const token = localStorage.getItem('internal_token');
                            window.open(`/api/inventory/terms/${t.id}/delivery-pdf?token=${token}`, '_blank');
                          }}
                        >
                          📄 Ver PDF
                        </button>
                        {t.status === 'active' && <button className="btn btn-small btn-danger" onClick={() => navigate(`/inventario/termo/${t.id}/devolucao`)}>📥 Devolver</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'uploads' && (
            <div className="tab-pane">
              <div className="uploads-section">
                <div className="card">
                  <h3>📸 Fotos do Equipamento</h3>
                  <p className="help-text">Adicione fotos para documentar o estado físico e identificação do equipamento</p>
                  <PhotoUploader
                    equipmentId={equipmentId!}
                    photos={photos}
                    onPhotosChange={setPhotos}
                  />
                </div>

                <div className="card">
                  <h3>📄 Documentos Anexados</h3>
                  <p className="help-text">Anexe notas fiscais, manuais, garantias ou outros documentos relacionados</p>
                  <DocumentUploader
                    equipmentId={equipmentId!}
                    documents={documents}
                    onDocumentsChange={setDocuments}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </InventoryLayout>
  );
}
