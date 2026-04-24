import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { BACKEND_URL } from '../services/api';
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
  returnedItems: {
    charger: boolean;
    mouse: boolean;
    bag: boolean;
    keyboard: boolean;
    headset: boolean;
    other: boolean;
  };
  otherItems: string;
}

const ReturnEquipmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('equipment') || '';
  const [inUseEquipment, setInUseEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generateTerm, setGenerateTerm] = useState(false);
  
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
    },
    returnedItems: {
      charger: false,
      mouse: false,
      bag: false,
      keyboard: false,
      headset: false,
      other: false
    },
    otherItems: ''
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

  // Auto-select equipment from query param
  useEffect(() => {
    if (preselectedId && inUseEquipment.length > 0) {
      const found = inUseEquipment.find(eq => eq.id === preselectedId);
      if (found) {
        setFormData(prev => ({ ...prev, equipmentId: preselectedId }));
      }
    }
  }, [preselectedId, inUseEquipment]);

  const fetchInUseEquipment = async () => {
    try {
      const response = await api.get('/inventory/equipment', {
        params: { status: 'in_use' }
      });
      setInUseEquipment(response.data.equipment || []);
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

  const handleReturnedItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      returnedItems: { ...prev.returnedItems, [name]: checked }
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
      const currentUser = JSON.parse(localStorage.getItem('internal_user') || '{}');
      
      // Format payload with snake_case field names to match backend
      const returnedItemsList: string[] = [];
      if (formData.returnedItems.charger) returnedItemsList.push('Carregador');
      if (formData.returnedItems.mouse) returnedItemsList.push('Mouse');
      if (formData.returnedItems.bag) returnedItemsList.push('Bolsa/Mochila');
      if (formData.returnedItems.keyboard) returnedItemsList.push('Teclado Externo');
      if (formData.returnedItems.headset) returnedItemsList.push('Headset/Fone');
      if (formData.returnedItems.other && formData.otherItems.trim()) {
        returnedItemsList.push(`Outros: ${formData.otherItems.trim()}`);
      }

      const payload = {
        equipment_id: formData.equipmentId,
        return_condition: formData.returnCondition,
        return_checklist: formData.checklist,
        return_problems: formData.returnProblems || 'Nenhum problema relatado',
        return_destination: formData.returnDestination,
        returned_items: returnedItemsList,
        received_by_id: currentUser.id || null,
        received_by_name: currentUser.name || currentUser.full_name || 'Sistema',
        generate_term: generateTerm
      };

      const response = await api.post(
        '/inventory/movements/return',
        payload
      );

      setSuccess(generateTerm
        ? 'Equipamento devolvido com sucesso! Termo de devolução gerado.'
        : 'Equipamento devolvido com sucesso! Movimentação registrada sem gerar termo.');
      
      // Abrir PDF do termo em nova aba (somente se houver termo)
      const termId = response.data.term_id;
      if (termId) {
        const token = localStorage.getItem('internal_token');
        const url = token
          ? `${BACKEND_URL}/api/inventory/terms/${termId}/return-pdf?token=${token}`
          : `${BACKEND_URL}/api/inventory/terms/${termId}/return-pdf`;
        window.open(url, '_blank');
      }

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/inventario');
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao devolver equipamento:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Erro ao devolver equipamento');
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
                  {eq.active_term ? ` (Em uso por: ${eq.active_term.responsible_name})` : 
                   eq.current_responsible_name ? ` (Em uso por: ${eq.current_responsible_name})` : ''}
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
          <h2>4. Itens Devolvidos</h2>
          <p className="section-description">Selecione todos os itens que estão sendo devolvidos:</p>

          <div className="checklist">
            <label className="checkbox-item">
              <input
                type="checkbox"
                name="charger"
                checked={formData.returnedItems.charger}
                onChange={handleReturnedItemChange}
              />
              <span className="checkbox-label">
                <strong>Carregador</strong> - Cabo de energia e fonte
              </span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                name="mouse"
                checked={formData.returnedItems.mouse}
                onChange={handleReturnedItemChange}
              />
              <span className="checkbox-label">
                <strong>Mouse</strong> - Mouse externo (se aplicável)
              </span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                name="bag"
                checked={formData.returnedItems.bag}
                onChange={handleReturnedItemChange}
              />
              <span className="checkbox-label">
                <strong>Bolsa/Mochila</strong> - Bolsa de transporte
              </span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                name="keyboard"
                checked={formData.returnedItems.keyboard}
                onChange={handleReturnedItemChange}
              />
              <span className="checkbox-label">
                <strong>Teclado Externo</strong> - Teclado USB (se aplicável)
              </span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                name="headset"
                checked={formData.returnedItems.headset}
                onChange={handleReturnedItemChange}
              />
              <span className="checkbox-label">
                <strong>Headset/Fone</strong> - Fone de ouvido (se aplicável)
              </span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                name="other"
                checked={formData.returnedItems.other}
                onChange={handleReturnedItemChange}
              />
              <span className="checkbox-label">
                <strong>Outros</strong> - Itens adicionais (especificar abaixo)
              </span>
            </label>
          </div>

          {formData.returnedItems.other && (
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="otherItems">Especificar Outros Itens</label>
              <textarea
                id="otherItems"
                name="otherItems"
                value={formData.otherItems}
                onChange={handleInputChange}
                rows={2}
                placeholder="Ex: Monitor USB, docking station, cabo HDMI..."
              />
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>5. Destino do Equipamento</h2>
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

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={generateTerm}
                onChange={(e) => setGenerateTerm(e.target.checked)}
              />
              <span className="checkbox-label">
                <strong>Gerar termo de devolução automaticamente</strong> - Desmarcado = apenas registrar movimentação
              </span>
            </label>
          </div>
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
            {loading ? 'Processando...' : (generateTerm ? '📄 Gerar Termo de Devolução' : '✅ Registrar Devolução (Sem Termo)')}
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
