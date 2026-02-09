import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/ReturnEquipmentPage.css';

interface Equipment {
  id: string;
  internal_code: string;
  category: string;
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  current_status: string;
  current_responsible_name?: string;
  active_term?: {
    id: string;
    responsible_name: string;
    responsible_unit: string;
    issued_date: string;
  };
}

interface ReturnForm {
  equipmentId: string;
  returnCondition: string;
  returnProblems: string;
  returnDestination: string;
  checklist: {
    physicalIntegrity: boolean;
    accessories: boolean;
    powerCable: boolean;
    functionalTest: boolean;
    cleaningDone: boolean;
  };
}

const ReturnEquipmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [inUseEquipment, setInUseEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState<ReturnForm>({
    equipmentId: '',
    returnCondition: '',
    returnProblems: '',
    returnDestination: 'available',
    checklist: {
      physicalIntegrity: false,
      accessories: false,
      powerCable: false,
      functionalTest: false,
      cleaningDone: false
    }
  });

  const returnConditions = [
    { value: 'excellent', label: 'Excelente - Como novo, sem marcas de uso' },
    { value: 'good', label: 'Bom - Pequenas marcas normais de uso' },
    { value: 'fair', label: 'Regular - Sinais visíveis de uso' },
    { value: 'poor', label: 'Ruim - Desgaste significativo' },
    { value: 'damaged', label: 'Danificado - Requer reparo' }
  ];

  const returnDestinations = [
    { value: 'available', label: 'Disponível para nova entrega' },
    { value: 'maintenance', label: 'Enviar para manutenção' },
    { value: 'storage', label: 'Guardar no estoque' },
    { value: 'disposal', label: 'Descarte/Baixa' }
  ];

  useEffect(() => {
    fetchInUseEquipment();
  }, []);

  const fetchInUseEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/inventory/equipment', {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'in_use' }
      });
      setInUseEquipment(response.data);
    } catch (err: any) {
      console.error('Erro ao buscar equipamentos:', err);
      setError('Erro ao carregar equipamentos em uso');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChecklistChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      checklist: { ...prev.checklist, [name]: checked }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.equipmentId) {
      setError('Selecione um equipamento');
      return;
    }

    if (!formData.returnCondition) {
      setError('Informe o estado do equipamento');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3001/api/inventory/movements/return',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Equipamento devolvido com sucesso! Termo de devolução gerado.');
      
      // Abrir PDF do termo em nova aba
      const termId = response.data.termId;
      window.open(`http://localhost:3001/api/inventory/terms/${termId}/return-pdf`, '_blank');

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/inventario');
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao devolver equipamento:', err);
      setError(err.response?.data?.message || 'Erro ao devolver equipamento');
    } finally {
      setLoading(false);
    }
  };

  const selectedEquipment = inUseEquipment.find(eq => eq.id === formData.equipmentId);
  const allChecksPassed = Object.values(formData.checklist).every(v => v);

  return (
    <div className="return-equipment-page">
      <div className="page-header">
        <h1>↩️ Devolver Equipamento</h1>
        <button className="btn-back" onClick={() => navigate('/inventario')}>
          ← Voltar
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="return-form">
        <div className="form-section">
          <h2>1. Selecionar Equipamento</h2>
          <div className="form-group">
            <label htmlFor="equipmentId">Equipamento em Uso *</label>
            <select
              id="equipmentId"
              name="equipmentId"
              value={formData.equipmentId}
              onChange={handleInputChange}
              required
            >
              <option value="">Selecione um equipamento...</option>
              {inUseEquipment.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.internal_code} - {eq.type} {eq.brand} {eq.model}
                  {eq.active_term && ` (Em uso por: ${eq.active_term.responsible_name})`}
                </option>
              ))}
            </select>
          </div>

          {selectedEquipment && selectedEquipment.active_term && (
            <div className="equipment-preview">
              <h3>Informações da Entrega</h3>
              <div className="equipment-details">
                <p><strong>Código:</strong> {selectedEquipment.internal_code}</p>
                <p><strong>Tipo:</strong> {selectedEquipment.type} {selectedEquipment.brand} {selectedEquipment.model}</p>
                <p><strong>Responsável:</strong> {selectedEquipment.active_term.responsible_name}</p>
                <p><strong>Unidade:</strong> {selectedEquipment.active_term.responsible_unit}</p>
                <p><strong>Data de Entrega:</strong> {selectedEquipment.active_term.issued_date ? new Date(selectedEquipment.active_term.issued_date).toLocaleDateString('pt-BR') : '-'}</p>
                <p>
                  <strong>Tempo de Uso:</strong>{' '}
                  {selectedEquipment.active_term.issued_date ? Math.floor((Date.now() - new Date(selectedEquipment.active_term.issued_date).getTime()) / (1000 * 60 * 60 * 24)) : 0} dias
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>2. Checklist de Inspeção</h2>
          <p className="section-description">Marque todos os itens após verificação:</p>
          
          <div className="checklist">
            <label className="checkbox-item">
              <input
                type="checkbox"
                name="physicalIntegrity"
                checked={formData.checklist.physicalIntegrity}
                onChange={handleChecklistChange}
              />
              <span className="checkbox-label">
                <strong>Integridade Física</strong> - Equipamento sem danos físicos visíveis
              </span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                name="powerCable"
                checked={formData.checklist.powerCable}
                onChange={handleChecklistChange}
              />
              <span className="checkbox-label">
                <strong>Cabo de Força</strong> - Carregador/cabo de alimentação presente e funcional
              </span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                name="accessories"
                checked={formData.checklist.accessories}
                onChange={handleChecklistChange}
              />
              <span className="checkbox-label">
                <strong>Acessórios</strong> - Todos os acessórios entregues foram devolvidos
              </span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                name="functionalTest"
                checked={formData.checklist.functionalTest}
                onChange={handleChecklistChange}
              />
              <span className="checkbox-label">
                <strong>Teste Funcional</strong> - Equipamento liga e funciona corretamente
              </span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                name="cleaningDone"
                checked={formData.checklist.cleaningDone}
                onChange={handleChecklistChange}
              />
              <span className="checkbox-label">
                <strong>Limpeza Realizada</strong> - Equipamento limpo e higienizado
              </span>
            </label>
          </div>

          {allChecksPassed && (
            <div className="checklist-success">
              ✓ Todos os itens do checklist foram verificados
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>3. Estado do Equipamento</h2>
          <div className="form-group">
            <label htmlFor="returnCondition">Condição Geral *</label>
            <select
              id="returnCondition"
              name="returnCondition"
              value={formData.returnCondition}
              onChange={handleInputChange}
              required
            >
              <option value="">Selecione o estado...</option>
              {returnConditions.map(condition => (
                <option key={condition.value} value={condition.value}>
                  {condition.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="returnProblems">Problemas Identificados</label>
            <textarea
              id="returnProblems"
              name="returnProblems"
              value={formData.returnProblems}
              onChange={handleInputChange}
              rows={4}
              placeholder="Descreva quaisquer problemas, danos ou observações sobre o estado do equipamento..."
            />
            <small className="form-hint">
              Seja específico ao descrever problemas: arranhões, teclas com defeito, tela com manchas, etc.
            </small>
          </div>
        </div>

        <div className="form-section">
          <h2>4. Destino do Equipamento</h2>
          <div className="form-group">
            <label htmlFor="returnDestination">Próxima Ação *</label>
            <select
              id="returnDestination"
              name="returnDestination"
              value={formData.returnDestination}
              onChange={handleInputChange}
              required
            >
              {returnDestinations.map(dest => (
                <option key={dest.value} value={dest.value}>
                  {dest.label}
                </option>
              ))}
            </select>
          </div>

          {formData.returnDestination === 'maintenance' && (
            <div className="alert alert-warning">
              ⚠️ Este equipamento será marcado como "Em Manutenção" e não ficará disponível para novas entregas.
            </div>
          )}

          {formData.returnDestination === 'disposal' && (
            <div className="alert alert-warning">
              ⚠️ Este equipamento será marcado para descarte. Certifique-se de que esta é a ação correta.
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/inventario')}>
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || !allChecksPassed}
          >
            {loading ? 'Processando...' : '📄 Gerar Termo de Devolução'}
          </button>
        </div>

        {!allChecksPassed && (
          <p className="form-warning">
            ⚠️ Complete o checklist de inspeção antes de processar a devolução.
          </p>
        )}
      </form>
    </div>
  );
};

export default ReturnEquipmentPage;
