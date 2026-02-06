import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CreateEquipmentPage.css';

export default function CreateEquipmentPage() {
  const [formData, setFormData] = useState({
    code: '',
    brand: '',
    model: '',
    serial_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validação
    if (!formData.code || !formData.brand || !formData.model) {
      setError('Preenchimento obrigatório: Código, Marca e Modelo');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');

      const response = await fetch('/api/inventory/equipment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Erro ao criar equipamento');

      setSuccess(true);
      setFormData({
        code: '',
        brand: '',
        model: '',
        serial_number: ''
      });

      setTimeout(() => {
        navigate('/inventario/equipamentos');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-equipment-page">
      <div className="container">
        <header className="page-header">
          <h1>➕ Novo Equipamento</h1>
          <p>Adicione um novo equipamento ao inventário</p>
        </header>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">✅ Equipamento criado com sucesso!</div>}

        <div className="form-container">
          <form onSubmit={handleSubmit} className="create-form">
            <div className="form-group">
              <label htmlFor="code">Código do Equipamento *</label>
              <input
                id="code"
                type="text"
                name="code"
                placeholder="ex: TECH-2024-001"
                value={formData.code}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="brand">Marca *</label>
                <input
                  id="brand"
                  type="text"
                  name="brand"
                  placeholder="ex: Dell"
                  value={formData.brand}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="model">Modelo *</label>
                <input
                  id="model"
                  type="text"
                  name="model"
                  placeholder="ex: Latitude 5520"
                  value={formData.model}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="serial_number">Número de Série</label>
              <input
                id="serial_number"
                type="text"
                name="serial_number"
                placeholder="ex: ABC123456789"
                value={formData.serial_number}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                disabled={loading}
                className="btn-submit"
              >
                {loading ? '⏳ Criando...' : '✅ Criar Equipamento'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/inventario')}
                className="btn-cancel"
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
