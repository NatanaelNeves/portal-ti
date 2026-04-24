import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import '../styles/ReturnTermPage.css';
import { BACKEND_URL } from '../services/api';

interface EquipmentSummary {
  internal_code: string;
  brand: string;
  model: string;
  current_responsible_name?: string;
  current_unit?: string;
  acquisition_date?: string;
}

interface ChecklistItem {
  name: string;
  checked: boolean;
}

interface ReturnFormData {
  return_date: string;
  return_reason: 'desligamento' | 'troca' | 'manutencao' | 'outro';
  reason_other: string;
  received_by: string;
  equipment_condition: 'perfeito' | 'desgaste' | 'avarias';
  checklist: {
    tela: ChecklistItem;
    teclado: ChecklistItem;
    touchpad: ChecklistItem;
    portas: ChecklistItem;
    carcaca: ChecklistItem;
    bateria: ChecklistItem;
    carregador: ChecklistItem;
    so: ChecklistItem;
  };
  damage_description: string;
  witness_name: string;
  acknowledge_return: boolean;
  data_deletion_acknowledged: boolean;
}

export default function ReturnTermPage() {
  const { termId, equipmentId } = useParams<{ termId?: string; equipmentId?: string }>();
  const navigate = useNavigate();
  const retroMode = Boolean(equipmentId) && !termId;

  const [formData, setFormData] = useState<ReturnFormData>({
    return_date: new Date().toISOString().split('T')[0],
    return_reason: 'desligamento',
    reason_other: '',
    received_by: '',
    equipment_condition: 'perfeito',
    checklist: {
      tela: { name: 'Tela (sem rachaduras/pixels mortos)', checked: false },
      teclado: { name: 'Teclado (todas teclas funcionando)', checked: false },
      touchpad: { name: 'Touchpad/Mouse', checked: false },
      portas: { name: 'Portas USB/HDMI', checked: false },
      carcaca: { name: 'Carcaça (sem amassados/quebras)', checked: false },
      bateria: { name: 'Bateria (carga funcionando)', checked: false },
      carregador: { name: 'Carregador original', checked: false },
      so: { name: 'Sistema operacional funcional', checked: false },
    },
    damage_description: '',
    witness_name: '',
    acknowledge_return: false,
    data_deletion_acknowledged: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [equipment, setEquipment] = useState<EquipmentSummary | null>(null);

  useEffect(() => {
    const loadEquipment = async () => {
      if (!equipmentId || !retroMode) return;

      try {
        const token = localStorage.getItem('internal_token');
        const response = await fetch(`${BACKEND_URL}/api/inventory/equipment/${equipmentId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data.equipment) {
          setEquipment(data.equipment);
        }
      } catch {
        // prefill opcional
      }
    };

    void loadEquipment();
  }, [equipmentId, retroMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checkbox = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      if (name.startsWith('checklist.')) {
        const item = name.split('.')[1];
        setFormData(prev => ({
          ...prev,
          checklist: {
            ...prev.checklist,
            [item]: { ...prev.checklist[item as keyof typeof prev.checklist], checked: checkbox.checked }
          }
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: checkbox.checked }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!formData.return_date) {
        setError('Data de devolução é obrigatória');
        return false;
      }
      if (!formData.return_reason) {
        setError('Motivo da devolução é obrigatório');
        return false;
      }
      if (formData.return_reason === 'outro' && !formData.reason_other.trim()) {
        setError('Especifique o motivo da devolução');
        return false;
      }
      if (!formData.received_by.trim()) {
        setError('Nome de quem recebeu é obrigatório');
        return false;
      }
    } else if (currentStep === 2) {
      const checkedItems = Object.values(formData.checklist).filter(item => item.checked).length;
      if (checkedItems === 0) {
        setError('Marque pelo menos um componente na vistoria');
        return false;
      }
      if (formData.equipment_condition === 'avarias' && !formData.damage_description.trim()) {
        setError('Descreva os danos encontrados');
        return false;
      }
      if (!formData.acknowledge_return) {
        setError('Confirme a devolução');
        return false;
      }
      if (!formData.data_deletion_acknowledged) {
        setError('Aceite a exclusão de dados conforme LGPD');
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(2)) return;

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('internal_token');

      const endpoint = retroMode
        ? `${BACKEND_URL}/api/inventory/terms/retroactive-return`
        : `${BACKEND_URL}/api/inventory/terms/${termId}/devolucao`;

      const payload = retroMode ? {
        equipment_id: equipmentId,
        issued_date: equipment?.acquisition_date || formData.return_date,
        return_date: formData.return_date,
        return_reason: formData.return_reason,
        reason_other: formData.reason_other,
        received_by: formData.received_by,
        equipment_condition: formData.equipment_condition,
        checklist: formData.checklist,
        damage_description: formData.damage_description,
        witness_name: formData.witness_name,
        return_destination: formData.equipment_condition === 'avarias' ? 'maintenance' : 'available',
        return_problems: formData.damage_description || 'Nenhum problema relatado',
        return_checklist: formData.checklist,
        returned_items: []
      } : {
        return_date: formData.return_date,
        return_reason: formData.return_reason,
        reason_other: formData.reason_other,
        received_by: formData.received_by,
        equipment_condition: formData.equipment_condition,
        checklist: formData.checklist,
        damage_description: formData.damage_description,
        witness_name: formData.witness_name,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Erro ao registrar devolução');
      }

      const data = await response.json();
      const termIdToOpen = data.termId || data.term_id;
      if (termIdToOpen) {
        window.open(`${BACKEND_URL}/api/inventory/terms/${termIdToOpen}/return-pdf?token=${token}`, '_blank');
      }

      navigate('/inventario/responsabilidades');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / 2) * 100;
  const checkedItems = Object.values(formData.checklist).filter(item => item.checked).length;

  return (
    <InventoryLayout>
      <div className="return-term-page">
        <div className="page-header">
          <button onClick={() => navigate(-1)} className="btn-back">← Voltar</button>
          <h1>{retroMode ? '🗂️ Termo de Devolução Retroativo' : '📥 Devolver Equipamento'}</h1>
          <p>{retroMode ? 'Gere um termo de devolução sem depender de um termo de entrega anterior' : 'Registre a devolução e faça a vistoria do equipamento'}</p>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <div className="form-container">
          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-text">Passo {step} de 2</div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Return Info */}
            {step === 1 && (
              <div className="form-step">
                <h2>📋 Informações de Devolução</h2>

                {retroMode && equipment && (
                  <div className="alert alert-info">
                    <strong>Equipamento:</strong> {equipment.internal_code} - {equipment.brand} {equipment.model}
                    <br />
                    <strong>Responsável atual:</strong> {equipment.current_responsible_name || 'Não informado'}
                  </div>
                )}
                
                <div className="form-group">
                  <label>Data da Devolução *</label>
                  <input type="date" name="return_date" value={formData.return_date} onChange={handleInputChange} />
                </div>

                <div className="form-group">
                  <label>Motivo da Devolução *</label>
                  <select name="return_reason" value={formData.return_reason} onChange={handleInputChange}>
                    <option value="desligamento">👋 Desligamento do Colaborador</option>
                    <option value="troca">🔄 Troca de Equipamento</option>
                    <option value="manutencao">🔧 Manutenção/Reparo</option>
                    <option value="outro">❓ Outro</option>
                  </select>
                </div>

                {formData.return_reason === 'outro' && (
                  <div className="form-group">
                    <label>Especifique o Motivo *</label>
                    <input type="text" name="reason_other" value={formData.reason_other} onChange={handleInputChange} placeholder="Descreva o motivo" />
                  </div>
                )}

                <div className="form-group">
                  <label>Recebido Por (Responsável TI) *</label>
                  <input type="text" name="received_by" value={formData.received_by} onChange={handleInputChange} placeholder="Nome completo" />
                </div>

                <div className="form-group">
                  <label>Estado Geral do Equipamento *</label>
                  <div className="radio-group">
                    <label><input type="radio" name="equipment_condition" value="perfeito" checked={formData.equipment_condition === 'perfeito'} onChange={handleInputChange} /> ✓ Perfeito</label>
                    <label><input type="radio" name="equipment_condition" value="desgaste" checked={formData.equipment_condition === 'desgaste'} onChange={handleInputChange} /> ➜ Desgaste Normal</label>
                    <label><input type="radio" name="equipment_condition" value="avarias" checked={formData.equipment_condition === 'avarias'} onChange={handleInputChange} /> ⚠️ Com Avarias</label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Inspection */}
            {step === 2 && (
              <div className="form-step">
                <h2>🔍 Vistoria e Aceites</h2>

                <div className="checklist-section">
                  <h3>Checklist de Componentes ({checkedItems}/8)</h3>
                  <div className="checklist-grid">
                    {Object.entries(formData.checklist).map(([key, item]) => (
                      <label key={key} className="checkbox-item">
                        <input type="checkbox" name={`checklist.${key}`} checked={item.checked} onChange={handleInputChange} />
                        <span>{item.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {formData.equipment_condition === 'avarias' && (
                  <div className="form-group">
                    <label>Descrição de Danos/Avarias *</label>
                    <textarea name="damage_description" value={formData.damage_description} onChange={handleInputChange} placeholder="Descreva detalhadamente os danos encontrados..." rows={4}></textarea>
                  </div>
                )}

                <div className="form-group">
                  <label>Testemunha/Gestor (Opcional)</label>
                  <input type="text" name="witness_name" value={formData.witness_name} onChange={handleInputChange} placeholder="Nome de quem acompanhou a devolução" />
                </div>

                <div className="terms-box">
                  <h3>📋 Aceites Finais</h3>
                  
                  <div className="form-group checkbox-large">
                    <label>
                      <input type="checkbox" name="acknowledge_return" checked={formData.acknowledge_return} onChange={handleInputChange} />
                      <span>Confirmo que o equipamento foi devolvido e a vistoria foi realizada</span>
                    </label>
                  </div>

                  <div className="lgpd-box">
                    <h3>🔒 Exclusão de Dados (LGPD)</h3>
                    <p>Os dados do colaborador armazenados no equipamento serão deletados conforme a Lei Geral de Proteção de Dados.</p>
                    <div className="form-group checkbox-large">
                      <label>
                        <input type="checkbox" name="data_deletion_acknowledged" checked={formData.data_deletion_acknowledged} onChange={handleInputChange} />
                        <span>Autorizo a exclusão de dados pessoais conforme LGPD</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="form-actions">
              {step > 1 && (
                <button type="button" onClick={handlePrevStep} className="btn btn-secondary">
                  ← Anterior
                </button>
              )}
              {step < 2 ? (
                <button type="button" onClick={handleNextStep} className="btn btn-primary">
                  Próximo →
                </button>
              ) : (
                <button type="submit" disabled={loading} className="btn btn-success">
                  {loading ? '⏳ Registrando...' : '✅ Registrar Devolução'}
                </button>
              )}
              <button type="button" onClick={() => navigate(-1)} className="btn btn-outline">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </InventoryLayout>
  );
}
