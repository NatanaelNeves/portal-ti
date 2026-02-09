import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import '../styles/ReceiveEquipmentPage.css';

interface Equipment {
  id: string;
  code: string;
  brand: string;
  model: string;
  status: string;
  serial_number: string;
}

export default function ReceiveEquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState({
    received_date: new Date().toISOString().split('T')[0],
    received_by: '',
    condition: 'perfeito',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  // const navigate = useNavigate();

  useEffect(() => {
    fetchEquipments();
  }, []);

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      const response = await fetch('/api/inventory/equipment?status=in_use', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erro ao carregar equipamentos');
      const data = await response.json();
      setEquipments(data.equipment || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipments = equipments.filter(eq =>
    eq.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectEquipment = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) {
      setError('Selecione um equipamento');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const token = localStorage.getItem('internal_token');

      const response = await fetch(`/api/inventory/equipment/${selectedEquipment.id}/receive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          received_date: formData.received_date,
          received_by: formData.received_by,
          condition: formData.condition,
          notes: formData.notes,
        }),
      });

      if (!response.ok) throw new Error('Erro ao registrar recebimento');

      alert('✅ Equipamento recebido com sucesso!');
      setSelectedEquipment(null);
      setFormData({
        received_date: new Date().toISOString().split('T')[0],
        received_by: '',
        condition: 'perfeito',
        notes: ''
      });
      fetchEquipments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <InventoryLayout><div className="container"><p>Carregando...</p></div></InventoryLayout>;

  return (
    <InventoryLayout>
      <div className="receive-equipment-page">
        <div className="container">
          <header className="page-header">
            <h1>📥 Recebimento de Equipamentos</h1>
            <p>Registre o recebimento de equipamentos devolvidos ou novos</p>
          </header>

        {error && <div className="error-message">{error}</div>}

        <div className="page-content">
          {/* Coluna esquerda: Lista de equipamentos */}
          <div className="equipment-list-section">
            <h2>Equipamentos Disponíveis</h2>
            
            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar por código, marca ou modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="equipment-list">
              {filteredEquipments.length === 0 ? (
                <p className="empty-message">Nenhum equipamento disponível</p>
              ) : (
                filteredEquipments.map(eq => (
                  <div
                    key={eq.id}
                    className={`equipment-item ${selectedEquipment?.id === eq.id ? 'selected' : ''}`}
                    onClick={() => handleSelectEquipment(eq)}
                  >
                    <div className="equipment-info">
                      <h4>{eq.code}</h4>
                      <p>{eq.brand} {eq.model}</p>
                      <small>SN: {eq.serial_number}</small>
                    </div>
                    <span className={`status status-${eq.status}`}>{eq.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Coluna direita: Formulário */}
          <div className="form-section">
            {selectedEquipment ? (
              <>
                <div className="selected-equipment-info">
                  <h3>Equipamento Selecionado</h3>
                  <div className="info-box">
                    <p><strong>Código:</strong> {selectedEquipment.code}</p>
                    <p><strong>Marca:</strong> {selectedEquipment.brand}</p>
                    <p><strong>Modelo:</strong> {selectedEquipment.model}</p>
                    <p><strong>Serial:</strong> {selectedEquipment.serial_number}</p>
                    <p><strong>Status:</strong> <span className={`status status-${selectedEquipment.status}`}>{selectedEquipment.status}</span></p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="receive-form">
                  <h3>Registrar Recebimento</h3>

                  <div className="form-group">
                    <label>Data do Recebimento *</label>
                    <input
                      type="date"
                      name="received_date"
                      value={formData.received_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Recebido Por *</label>
                    <input
                      type="text"
                      name="received_by"
                      placeholder="Nome de quem recebeu"
                      value={formData.received_by}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Condição do Equipamento *</label>
                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="perfeito">✅ Perfeito</option>
                      <option value="bom">👍 Bom</option>
                      <option value="desgaste">⚠️ Com Desgaste</option>
                      <option value="defeituoso">❌ Defeituoso</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Observações</label>
                    <textarea
                      name="notes"
                      placeholder="Adicione observações sobre o equipamento..."
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={4}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-submit"
                  >
                    {submitting ? '⏳ Registrando...' : '✅ Registrar Recebimento'}
                  </button>
                </form>
              </>
            ) : (
              <div className="no-selection">
                <p>👈 Selecione um equipamento para registrar o recebimento</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </InventoryLayout>
  );
}
