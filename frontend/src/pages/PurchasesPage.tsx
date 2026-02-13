import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import { ExcelExportService } from '../services/excelExportService';
import { showToast } from '../utils/toast';
import '../styles/PurchasesPage.css';
import '../styles/InventoryButtons.css';

interface Purchase {
  id: string;
  request_number: string;
  item_description: string;
  quantity: number;
  status: string;
  estimated_value: string | number;
  actual_value: string | number | null;
  expected_delivery_date: string | null;
  supplier: string | null;
  purchase_date: string | null;
  actual_delivery_date: string | null;
  received_date: string | null;
  approval_date: string | null;
  rejection_reason: string | null;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [actionModal, setActionModal] = useState<'approve' | 'reject' | 'purchase' | 'receive' | null>(null);
  const [actionData, setActionData] = useState<any>({});
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPurchases();
  }, [filterStatus]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      
      const response = await fetch('/api/inventory/requisitions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar compras');
      }

      const data = await response.json();
      let allPurchases = data.requisitions || [];

      // Aplicar filtro
      if (filterStatus !== 'all') {
        allPurchases = allPurchases.filter((p: Purchase) => p.status === filterStatus);
      }

      setPurchases(allPurchases);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: { icon: '⏳', text: 'Pendente', class: 'status-pending' },
      approved: { icon: '✅', text: 'Aprovado', class: 'status-approved' },
      purchased: { icon: '🛒', text: 'Comprado', class: 'status-purchased' },
      received: { icon: '📦', text: 'Recebido', class: 'status-received' },
      completed: { icon: '✓', text: 'Concluído', class: 'status-completed' },
      rejected: { icon: '❌', text: 'Rejeitado', class: 'status-rejected' }
    };
    return badges[status] || { icon: '⚪', text: status, class: 'status-unknown' };
  };

  const handleApprove = async () => {
    if (!selectedPurchase) return;
    try {
      setActionLoading(true);
      const token = localStorage.getItem('internal_token');
      const userData = localStorage.getItem('internal_user');
      const user = JSON.parse(userData || '{}');

      const response = await fetch(`/api/inventory/requisitions/${selectedPurchase.id}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved_by_id: user.id,
          approved_by_name: user.name,
          notes: actionData.notes || null
        }),
      });

      if (!response.ok) throw new Error('Erro ao aprovar solicitação');

      setActionModal(null);
      setSelectedPurchase(null);
      setActionData({});
      fetchPurchases();
    } catch (err: any) {
      showToast.error('Erro: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPurchase || !actionData.rejection_reason) {
      showToast.warning('Motivo da rejeição é obrigatório');
      return;
    }
    try {
      setActionLoading(true);
      const token = localStorage.getItem('internal_token');

      const response = await fetch(`/api/inventory/requisitions/${selectedPurchase.id}/reject`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejection_reason: actionData.rejection_reason
        }),
      });

      if (!response.ok) throw new Error('Erro ao rejeitar solicitação');

      setActionModal(null);
      setSelectedPurchase(null);
      setActionData({});
      fetchPurchases();
    } catch (err: any) {
      showToast.error('Erro: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPurchase || !actionData.purchase_date || !actionData.actual_value) {
      showToast.warning('Data e valor da compra são obrigatórios');
      return;
    }
    try {
      setActionLoading(true);
      const token = localStorage.getItem('internal_token');

      const response = await fetch(`/api/inventory/requisitions/${selectedPurchase.id}/purchase`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchase_date: actionData.purchase_date,
          actual_value: parseFloat(actionData.actual_value),
          supplier: actionData.supplier || selectedPurchase.supplier,
          invoice_file: actionData.invoice_file || null
        }),
      });

      if (!response.ok) throw new Error('Erro ao registrar compra');

      setActionModal(null);
      setSelectedPurchase(null);
      setActionData({});
      fetchPurchases();
    } catch (err: any) {
      showToast.error('Erro: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!selectedPurchase || !actionData.received_date) {
      showToast.warning('Data de recebimento é obrigatória');
      return;
    }
    try {
      setActionLoading(true);
      const token = localStorage.getItem('internal_token');
      const userData = localStorage.getItem('internal_user');
      const user = JSON.parse(userData || '{}');

      const response = await fetch(`/api/inventory/requisitions/${selectedPurchase.id}/receive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          received_by_id: user.id,
          received_by_name: user.name,
          received_date: actionData.received_date,
          actual_delivery_date: actionData.actual_delivery_date || actionData.received_date
        }),
      });

      if (!response.ok) throw new Error('Erro ao confirmar recebimento');

      setActionModal(null);
      setSelectedPurchase(null);
      setActionData({});
      fetchPurchases();
    } catch (err: any) {
      showToast.error('Erro: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };


  const stats = {
    total: purchases.length,
    pending: purchases.filter(p => p.status === 'pending').length,
    approved: purchases.filter(p => p.status === 'approved').length,
    purchased: purchases.filter(p => p.status === 'purchased').length,
    received: purchases.filter(p => p.status === 'received').length,
    rejected: purchases.filter(p => p.status === 'rejected').length,
    completed: purchases.filter(p => p.status === 'completed').length
  };

  const totalValue = purchases.reduce((sum, p) => sum + (parseFloat(String(p.estimated_value)) || 0) * p.quantity, 0);
  
  const formatCurrency = (value: number) => {
    if (value === 0) return 'R$ 0,00';
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k`;
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  if (loading) {
    return (
      <InventoryLayout>
        <div className="purchases-page">
          <div className="loading">Carregando compras...</div>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="purchases-page">
        <div className="page-header">
          <div>
            <h1>🛒 Compras & Solicitações</h1>
            <p>Gestão de requisições e pedidos</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-outline"
              onClick={() => {
                const exportData = purchases.map(p => ({
                  item_description: p.item_description,
                  quantity: p.quantity,
                  estimated_value: p.estimated_value,
                  supplier: p.supplier || '-',
                  expected_delivery_date: p.expected_delivery_date,
                  status: p.status
                }));
                ExcelExportService.exportToExcel(
                  exportData,
                  [
                    { header: 'Descrição', field: 'item_description', width: 30 },
                    { header: 'Quantidade', field: 'quantity', width: 12 },
                    { header: 'Valor Unit.', field: 'estimated_value', width: 15, format: (v) => v ? `R$ ${v.toFixed(2)}` : '-' },
                    { header: 'Fornecedor', field: 'supplier', width: 25 },
                    { header: 'Previsão', field: 'expected_delivery_date', width: 15, format: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '-' },
                    { header: 'Status', field: 'status', width: 15 }
                  ],
                  'compras',
                  'Compras e Solicitações'
                );
              }}
              disabled={purchases.length === 0}
              title="Exportar lista para Excel"
            >
              <span className="btn-icon">📊</span> Exportar Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/inventario/compras/nova')}
              title="Criar nova solicitação de compra"
            >
              <span className="btn-icon">➕</span> Nova Solicitação
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total de Solicitações</div>
          </div>
          <div className="stat-card stat-value">
            <div className="stat-icon">💰</div>
            <div className="stat-value">{formatCurrency(totalValue)}</div>
            <div className="stat-label">Valor Total Estimado</div>
          </div>
        </div>

        <div className="stats-grid stats-workflow">
          <div className="stat-card stat-pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pendentes</div>
          </div>
          <div className="stat-card stat-approved">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Aprovados</div>
          </div>
          <div className="stat-card stat-purchased">
            <div className="stat-icon">🛒</div>
            <div className="stat-value">{stats.purchased}</div>
            <div className="stat-label">Comprados</div>
          </div>
          <div className="stat-card stat-received">
            <div className="stat-icon">📦</div>
            <div className="stat-value">{stats.received}</div>
            <div className="stat-label">Recebidos</div>
          </div>
          <div className="stat-card stat-completed">
            <div className="stat-icon">✓</div>
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Concluídos</div>
          </div>
          <div className="stat-card stat-rejected">
            <div className="stat-icon">❌</div>
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">Rejeitados</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="pending">⏳ Pendente</option>
              <option value="approved">✅ Aprovado</option>
              <option value="purchased">🛒 Comprado</option>
              <option value="received">📦 Recebido</option>
              <option value="completed">✓ Concluído</option>
              <option value="rejected">❌ Rejeitado</option>
            </select>
          </div>
        </div>

        {/* Purchases Table */}
        <div className="purchases-table">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Qtd</th>
                <th>Valor Unit.</th>
                <th>Valor Total</th>
                <th>Fornecedor</th>
                <th>Previsão</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase, index) => {
                const status = getStatusBadge(purchase.status);
                const estimatedValue = parseFloat(String(purchase.estimated_value)) || 0;
                const totalItemValue = estimatedValue * purchase.quantity;
                
                return (
                  <tr key={`${purchase.id}-${index}`}>
                    <td>
                      <strong>{purchase.item_description}</strong>
                    </td>
                    <td>
                      <span className="quantity-badge">{purchase.quantity}x</span>
                    </td>
                    <td>
                      R$ {estimatedValue.toFixed(2)}
                    </td>
                    <td>
                      <strong>R$ {totalItemValue.toFixed(2)}</strong>
                    </td>
                    <td>
                      {purchase.supplier || <span className="text-muted">-</span>}
                    </td>
                    <td>
                      {purchase.expected_delivery_date 
                        ? new Date(purchase.expected_delivery_date).toLocaleDateString('pt-BR')
                        : <span className="text-muted">-</span>
                      }
                    </td>
                    <td>
                      <span className={`status-badge ${status.class}`}>
                        {status.icon} {status.text}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-view"
                          onClick={() => setSelectedPurchase(purchase)}
                          title="Ver detalhes"
                        >
                          <span className="btn-icon">📋</span> Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {purchases.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <h3>Nenhuma compra encontrada</h3>
            <p>Você pode criar uma nova solicitação de compra.</p>
          </div>
        )}

        {/* Modal de Detalhes */}
        {selectedPurchase && (
          <div className="modal-overlay" onClick={() => setSelectedPurchase(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📋 Detalhes da Solicitação</h2>
                <button className="modal-close" onClick={() => setSelectedPurchase(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="detail-section">
                  <h3>Informações do Item</h3>
                  <dl>
                    <dt>Descrição:</dt>
                    <dd>{selectedPurchase.item_description}</dd>
                    <dt>Quantidade:</dt>
                    <dd>{selectedPurchase.quantity} unidade(s)</dd>
                    <dt>Valor Unitário Estimado:</dt>
                    <dd>R$ {parseFloat(String(selectedPurchase.estimated_value)).toFixed(2)}</dd>
                    <dt>Valor Total:</dt>
                    <dd><strong>R$ {(parseFloat(String(selectedPurchase.estimated_value)) * selectedPurchase.quantity).toFixed(2)}</strong></dd>
                  </dl>
                </div>

                <div className="detail-section">
                  <h3>Fornecedor e Entrega</h3>
                  <dl>
                    <dt>Fornecedor:</dt>
                    <dd>{selectedPurchase.supplier || <span className="text-muted">Não informado</span>}</dd>
                    <dt>Previsão de Entrega:</dt>
                    <dd>
                      {selectedPurchase.expected_delivery_date 
                        ? new Date(selectedPurchase.expected_delivery_date).toLocaleDateString('pt-BR')
                        : <span className="text-muted">Não informada</span>
                      }
                    </dd>
                  </dl>
                </div>

                <div className="detail-section">
                  <h3>Status Atual</h3>
                  <dl>
                    <dt>Status:</dt>
                    <dd>
                      <span className={`status-badge ${getStatusBadge(selectedPurchase.status).class}`}>
                        {getStatusBadge(selectedPurchase.status).icon} {getStatusBadge(selectedPurchase.status).text}
                      </span>
                    </dd>
                    {selectedPurchase.actual_value && (
                      <>
                        <dt>Valor Real Pago:</dt>
                        <dd>R$ {parseFloat(String(selectedPurchase.actual_value)).toFixed(2)}</dd>
                      </>
                    )}
                  </dl>
                </div>
              </div>
              <div className="modal-footer">
                {selectedPurchase.status === 'pending' && (
                  <>
                    <button 
                      className="btn btn-success" 
                      onClick={() => { setActionModal('approve'); setActionData({}); }}
                    >
                      ✅ Aprovar
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => { setActionModal('reject'); setActionData({}); }}
                    >
                      ❌ Rejeitar
                    </button>
                  </>
                )}
                {selectedPurchase.status === 'approved' && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => { 
                      setActionModal('purchase'); 
                      setActionData({ 
                        purchase_date: new Date().toISOString().split('T')[0],
                        supplier: selectedPurchase.supplier || ''
                      }); 
                    }}
                  >
                    🛒 Registrar Compra
                  </button>
                )}
                {selectedPurchase.status === 'purchased' && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => { 
                      setActionModal('receive'); 
                      setActionData({ received_date: new Date().toISOString().split('T')[0] }); 
                    }}
                  >
                    📦 Confirmar Recebimento
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => setSelectedPurchase(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Aprovação */}
        {actionModal === 'approve' && selectedPurchase && (
          <div className="modal-overlay" onClick={() => setActionModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>✅ Aprovar Solicitação</h2>
                <button className="modal-close" onClick={() => setActionModal(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p>Você está aprovando a solicitação:</p>
                <div className="detail-section">
                  <dl>
                    <dt>Item:</dt>
                    <dd>{selectedPurchase.item_description}</dd>
                    <dt>Quantidade:</dt>
                    <dd>{selectedPurchase.quantity} unidade(s)</dd>
                    <dt>Valor Total:</dt>
                    <dd><strong>R$ {(parseFloat(String(selectedPurchase.estimated_value)) * selectedPurchase.quantity).toFixed(2)}</strong></dd>
                  </dl>
                </div>
                <div className="form-group">
                  <label>Observações (opcional):</label>
                  <textarea
                    rows={3}
                    value={actionData.notes || ''}
                    onChange={(e) => setActionData({ ...actionData, notes: e.target.value })}
                    placeholder="Adicione observações sobre a aprovação..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-success" 
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Aprovando...' : '✅ Confirmar Aprovação'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setActionModal(null)}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Rejeição */}
        {actionModal === 'reject' && selectedPurchase && (
          <div className="modal-overlay" onClick={() => setActionModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>❌ Rejeitar Solicitação</h2>
                <button className="modal-close" onClick={() => setActionModal(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p>Você está rejeitando a solicitação:</p>
                <div className="detail-section">
                  <dl>
                    <dt>Item:</dt>
                    <dd>{selectedPurchase.item_description}</dd>
                  </dl>
                </div>
                <div className="form-group">
                  <label>Motivo da Rejeição: <span className="required">*</span></label>
                  <textarea
                    rows={4}
                    value={actionData.rejection_reason || ''}
                    onChange={(e) => setActionData({ ...actionData, rejection_reason: e.target.value })}
                    placeholder="Explique o motivo da rejeição..."
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-danger" 
                  onClick={handleReject}
                  disabled={actionLoading || !actionData.rejection_reason}
                >
                  {actionLoading ? 'Rejeitando...' : '❌ Confirmar Rejeição'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setActionModal(null)}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Compra */}
        {actionModal === 'purchase' && selectedPurchase && (
          <div className="modal-overlay" onClick={() => setActionModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>🛒 Registrar Compra</h2>
                <button className="modal-close" onClick={() => setActionModal(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Data da Compra: <span className="required">*</span></label>
                  <input
                    type="date"
                    value={actionData.purchase_date || ''}
                    onChange={(e) => setActionData({ ...actionData, purchase_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Valor Real Pago: <span className="required">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    value={actionData.actual_value || ''}
                    onChange={(e) => setActionData({ ...actionData, actual_value: e.target.value })}
                    placeholder="Ex: 1500.00"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fornecedor:</label>
                  <input
                    type="text"
                    value={actionData.supplier || ''}
                    onChange={(e) => setActionData({ ...actionData, supplier: e.target.value })}
                    placeholder="Nome do fornecedor"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-primary" 
                  onClick={handlePurchase}
                  disabled={actionLoading || !actionData.purchase_date || !actionData.actual_value}
                >
                  {actionLoading ? 'Salvando...' : '🛒 Confirmar Compra'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setActionModal(null)}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Recebimento */}
        {actionModal === 'receive' && selectedPurchase && (
          <div className="modal-overlay" onClick={() => setActionModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📦 Confirmar Recebimento</h2>
                <button className="modal-close" onClick={() => setActionModal(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p>Confirme o recebimento dos itens:</p>
                <div className="detail-section">
                  <dl>
                    <dt>Item:</dt>
                    <dd>{selectedPurchase.item_description}</dd>
                    <dt>Quantidade:</dt>
                    <dd>{selectedPurchase.quantity} unidade(s)</dd>
                  </dl>
                </div>
                <div className="form-group">
                  <label>Data de Recebimento: <span className="required">*</span></label>
                  <input
                    type="date"
                    value={actionData.received_date || ''}
                    onChange={(e) => setActionData({ ...actionData, received_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Data de Entrega Real:</label>
                  <input
                    type="date"
                    value={actionData.actual_delivery_date || actionData.received_date || ''}
                    onChange={(e) => setActionData({ ...actionData, actual_delivery_date: e.target.value })}
                  />
                  <small>Se diferente da data de recebimento</small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-primary" 
                  onClick={handleReceive}
                  disabled={actionLoading || !actionData.received_date}
                >
                  {actionLoading ? 'Confirmando...' : '📦 Confirmar Recebimento'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setActionModal(null)}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </InventoryLayout>
  );
}
