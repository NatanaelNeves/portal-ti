import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import '../styles/CreatePurchasePage.css';

export default function CreatePurchasePage() {
  const [formData, setFormData] = useState({
    item_type: '',
    item_description: '',
    specifications: '',
    quantity: 1,
    priority: 'normal',
    reason: '',
    needed_by_date: '',
    estimated_value: '',
    supplier: '',
    expected_delivery_date: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validação
    if (!formData.item_type || !formData.item_description || !formData.reason || !formData.quantity) {
      setError('Preenchimento obrigatório: Tipo, Descrição, Motivo e Quantidade');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      const userData = localStorage.getItem('internal_user');
      
      if (!userData) {
        throw new Error('Usuário não autenticado');
      }
      
      const user = JSON.parse(userData);

      const response = await fetch('/api/inventory/requisitions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requested_by_id: user.id,
          requester_name: user.name,
          requester_department: user.department || '',
          requester_unit: user.unit || 'Unidade Central',
          item_type: formData.item_type,
          item_description: formData.item_description,
          specifications: formData.specifications || null,
          quantity: parseInt(formData.quantity.toString()),
          priority: formData.priority,
          reason: formData.reason,
          needed_by_date: formData.needed_by_date || null,
          estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
          supplier: formData.supplier || null,
          expected_delivery_date: formData.expected_delivery_date || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar solicitação de compra');
      }

      setSuccess(true);
      setFormData({
        item_type: '',
        item_description: '',
        specifications: '',
        quantity: 1,
        priority: 'normal',
        reason: '',
        needed_by_date: '',
        estimated_value: '',
        supplier: '',
        expected_delivery_date: '',
        notes: ''
      });

      setTimeout(() => {
        navigate('/inventario/compras');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <InventoryLayout>
      <div className="create-purchase-page">
        <div className="container">
          <header className="page-header">
            <h1>🛒 Nova Solicitação de Compra</h1>
            <p>Registre uma nova solicitação de aquisição de equipamento</p>
          </header>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">✅ Solicitação criada com sucesso!</div>}

          <div className="form-container">
            <form onSubmit={handleSubmit} className="create-form">
              <div className="form-group">
                <label htmlFor="item_type">Tipo de Item *</label>
                <select
                  id="item_type"
                  name="item_type"
                  value={formData.item_type}
                  onChange={handleInputChange as any}
                  required
                >
                  <option value="">Selecione o tipo</option>
                  <option value="Notebook">Notebook</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Mouse">Mouse</option>
                  <option value="Teclado">Teclado</option>
                  <option value="Headset">Headset</option>
                  <option value="Webcam">Webcam</option>
                  <option value="Impressora">Impressora</option>
                  <option value="Switch">Switch</option>
                  <option value="Roteador">Roteador</option>
                  <option value="Nobreak">Nobreak</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="item_description">Descrição do Item *</label>
                <input
                  id="item_description"
                  type="text"
                  name="item_description"
                  placeholder="ex: Notebook Dell Latitude 5520"
                  value={formData.item_description}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="specifications">Especificações Técnicas</label>
                <textarea
                  id="specifications"
                  name="specifications"
                  placeholder="ex: Intel i7, 16GB RAM, 512GB SSD, Tela 15.6 Full HD"
                  value={formData.specifications}
                  onChange={handleInputChange}
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label htmlFor="reason">Motivo da Solicitação *</label>
                <textarea
                  id="reason"
                  name="reason"
                  placeholder="Explique por que este item é necessário..."
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={3}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="quantity">Quantidade *</label>
                  <input
                    id="quantity"
                    type="number"
                    name="quantity"
                    min="1"
                    placeholder="1"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="priority">Prioridade</label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange as any}
                  >
                    <option value="low">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="estimated_value">Valor Estimado (R$)</label>
                  <input
                    id="estimated_value"
                    type="number"
                    name="estimated_value"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.estimated_value}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="needed_by_date">Necessário Até</label>
                  <input
                    id="needed_by_date"
                    type="date"
                    name="needed_by_date"
                    value={formData.needed_by_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="supplier">Fornecedor Sugerido</label>
                  <input
                    id="supplier"
                    type="text"
                    name="supplier"
                    placeholder="ex: Dell Computadores"
                    value={formData.supplier}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="expected_delivery_date">Previsão de Entrega</label>
                  <input
                    id="expected_delivery_date"
                    type="date"
                    name="expected_delivery_date"
                    value={formData.expected_delivery_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Observações Adicionais</label>
                <textarea
                  id="notes"
                  name="notes"
                  placeholder="Outras informações relevantes..."
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-submit"
                >
                  {loading ? '⏳ Criando...' : '✅ Criar Solicitação'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/inventario/compras')}
                  className="btn-cancel"
                >
                  ❌ Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </InventoryLayout>
  );
}
