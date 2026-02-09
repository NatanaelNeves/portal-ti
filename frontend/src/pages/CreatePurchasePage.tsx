import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import '../styles/CreatePurchasePage.css';

export default function CreatePurchasePage() {
  const [formData, setFormData] = useState({
    item_description: '',
    quantity: 1,
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
    if (!formData.item_description || !formData.quantity) {
      setError('Preenchimento obrigatório: Descrição e Quantidade');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');

      const response = await fetch('/api/inventory/requisitions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity.toString()),
          estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        }),
      });

      if (!response.ok) throw new Error('Erro ao criar solicitação de compra');

      setSuccess(true);
      setFormData({
        item_description: '',
        quantity: 1,
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
                <label htmlFor="notes">Observações</label>
                <textarea
                  id="notes"
                  name="notes"
                  placeholder="Adicione observações sobre a solicitação..."
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
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
