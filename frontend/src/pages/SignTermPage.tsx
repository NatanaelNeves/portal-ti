import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import { showToast } from '../utils/toast';
import '../styles/SignTermPage.css';
import { BACKEND_URL } from '../services/api';

interface EquipmentData {
  internal_code: string;
  brand: string;
  model: string;
  serial_number: string;
  processor?: string;
  memory_ram?: string;
  current_responsible_name?: string;
  current_unit?: string;
}

interface FormData {
  responsible_name: string;
  responsible_cpf: string;
  responsible_position: string;
  responsible_department: string;
  equipment_code: string;
  equipment_brand: string;
  equipment_model: string;
  equipment_serial: string;
  equipment_processor: string;
  equipment_ram: string;
  accessories: {
    charger: boolean;
    mouse: boolean;
    case: boolean;
    other: string;
  };
  terms_accepted: boolean;
  tracking_authorized: boolean;
  signature_method: 'digital' | 'manual';
  signature_date: string;
}

export default function SignTermPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const retroMode = new URLSearchParams(location.search).get('retro') === '1';

  const [formData, setFormData] = useState<FormData>({
    responsible_name: '',
    responsible_cpf: '',
    responsible_position: '',
    responsible_department: '',
    equipment_code: '',
    equipment_brand: '',
    equipment_model: '',
    equipment_serial: '',
    equipment_processor: '',
    equipment_ram: '',
    accessories: { charger: false, mouse: false, case: false, other: '' },
    terms_accepted: false,
    tracking_authorized: false,
    signature_method: 'digital',
    signature_date: new Date().toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [equipment, setEquipment] = useState<EquipmentData | null>(null);

  useEffect(() => {
    const loadEquipment = async () => {
      if (!equipmentId) return;

      try {
        const token = localStorage.getItem('internal_token');
        const response = await fetch(`${BACKEND_URL}/api/inventory/equipment/${equipmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return;

        const data = await response.json();
        const eq = data.equipment;
        if (eq) {
          setEquipment(eq);
          setFormData(prev => ({
            ...prev,
            equipment_code: eq.internal_code || prev.equipment_code,
            equipment_brand: eq.brand || prev.equipment_brand,
            equipment_model: eq.model || prev.equipment_model,
            equipment_serial: eq.serial_number || prev.equipment_serial,
            equipment_processor: eq.processor || prev.equipment_processor,
            equipment_ram: eq.memory_ram || prev.equipment_ram,
            responsible_name: retroMode ? (eq.current_responsible_name || prev.responsible_name) : prev.responsible_name,
            responsible_department: retroMode ? (eq.current_unit || prev.responsible_department) : prev.responsible_department,
          }));
        }
      } catch {
        // Prefill is optional; keep the form usable even if fetch fails.
      }
    };

    void loadEquipment();
  }, [equipmentId, retroMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checkbox = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      if (name.startsWith('accessories.')) {
        const accessory = name.split('.')[1];
        setFormData(prev => ({
          ...prev,
          accessories: { ...prev.accessories, [accessory]: checkbox.checked }
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
      if (!formData.responsible_name.trim()) {
        setError('Nome do colaborador é obrigatório');
        return false;
      }
      if (!formData.responsible_cpf.trim()) {
        setError('CPF é obrigatório');
        return false;
      }
      if (!formData.responsible_position.trim()) {
        setError('Cargo é obrigatório');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.equipment_code.trim()) {
        setError('Código do equipamento é obrigatório');
        return false;
      }
      if (!formData.equipment_brand.trim()) {
        setError('Marca é obrigatória');
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.terms_accepted) {
        setError('Você deve aceitar as responsabilidades');
        return false;
      }
      if (!formData.tracking_authorized) {
        setError('Você deve autorizar o rastreamento para fins de segurança');
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
    if (!validateStep(3)) return;

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('internal_token');
      const currentUser = JSON.parse(localStorage.getItem('internal_user') || '{}');

      const deliveryData = {
        equipment_id: equipmentId,
        responsible_id: null, // Pode ser null se for usuário externo
        responsible_name: formData.responsible_name,
        responsible_department: formData.responsible_department,
        responsible_unit: formData.responsible_department, // Usar o mesmo valor
        responsible_email: '', // Pode adicionar campo no form se necessário
        responsible_phone: '', // Pode adicionar campo no form se necessário
        responsible_cpf: formData.responsible_cpf,
        delivery_reason: `Entrega de equipamento - ${formData.responsible_position}`,
        delivery_notes: `Acessórios: ${Object.entries(formData.accessories).filter(([_, v]) => v).map(([k]) => k).join(', ')}`,
        issued_by_id: currentUser.id,
        issued_by_name: currentUser.name,
        issued_date: formData.signature_date,
      };

      const endpoint = retroMode
        ? `${BACKEND_URL}/api/inventory/terms/retroactive`
        : `${BACKEND_URL}/api/inventory/movements/deliver`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar termo de responsabilidade');
      }

      const responseData = await response.json();
      const termId = responseData.termId || responseData.term?.id;
      showToast.success(retroMode ? 'Termo retroativo criado com sucesso!' : 'Termo criado com sucesso!');

      if (termId) {
        const token = localStorage.getItem('internal_token');
        const url = `${BACKEND_URL}/api/inventory/terms/${termId}/delivery-pdf?token=${token}`;
        window.open(url, '_blank');
      }

      navigate(`/inventario/equipamento/${equipmentId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / 3) * 100;

  return (
    <InventoryLayout>
      <div className="sign-term-page">
        <div className="page-header">
          <button onClick={() => navigate(`/inventario/equipamento/${equipmentId}`)} className="btn-back">← Voltar</button>
          <h1>{retroMode ? '🗂️ Termo Retroativo' : '✍️ Novo Termo de Responsabilidade'}</h1>
          <p>{retroMode ? 'Registre um termo histórico para equipamento já cadastrado' : 'Preencha todos os campos para criar um novo termo'}</p>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <div className="form-container">
          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-text">Passo {step} de 3</div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Colaborador */}
            {step === 1 && (
              <div className="form-step">
                <h2>👤 Dados do Colaborador</h2>
                <div className="form-group">
                  <label>Nome Completo *</label>
                  <input type="text" name="responsible_name" value={formData.responsible_name} onChange={handleInputChange} placeholder="Digite o nome completo" />
                </div>
                <div className="form-group">
                  <label>CPF *</label>
                  <input type="text" name="responsible_cpf" value={formData.responsible_cpf} onChange={handleInputChange} placeholder="XXX.XXX.XXX-XX" />
                </div>
                <div className="form-group">
                  <label>Cargo *</label>
                  <input type="text" name="responsible_position" value={formData.responsible_position} onChange={handleInputChange} placeholder="Ex: Analista de TI" />
                </div>
                <div className="form-group">
                  <label>Unidade/Departamento</label>
                  <input type="text" name="responsible_department" value={formData.responsible_department} onChange={handleInputChange} placeholder="Ex: TI" />
                </div>
              </div>
            )}

            {/* Step 2: Equipamento */}
            {step === 2 && (
              <div className="form-step">
                <h2>💻 Identificação do Equipamento</h2>
                {retroMode && equipment && (
                  <div className="alert alert-info">
                    <strong>Equipamento carregado:</strong> {equipment.internal_code} - {equipment.brand} {equipment.model}
                  </div>
                )}
                <div className="form-group">
                  <label>Código Patrimonial *</label>
                  <input type="text" name="equipment_code" value={formData.equipment_code} onChange={handleInputChange} placeholder="Ex: TI-2024-001" />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Marca *</label>
                    <input type="text" name="equipment_brand" value={formData.equipment_brand} onChange={handleInputChange} placeholder="Ex: Dell" />
                  </div>
                  <div className="form-group">
                    <label>Modelo</label>
                    <input type="text" name="equipment_model" value={formData.equipment_model} onChange={handleInputChange} placeholder="Ex: Inspiron 15" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Número de Série</label>
                  <input type="text" name="equipment_serial" value={formData.equipment_serial} onChange={handleInputChange} placeholder="Ex: ABC123" />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Processador</label>
                    <input type="text" name="equipment_processor" value={formData.equipment_processor} onChange={handleInputChange} placeholder="Ex: Intel i7" />
                  </div>
                  <div className="form-group">
                    <label>Memória RAM</label>
                    <input type="text" name="equipment_ram" value={formData.equipment_ram} onChange={handleInputChange} placeholder="Ex: 16GB" />
                  </div>
                </div>

                <div className="accessories-section">
                  <h3>Acessórios Inclusos</h3>
                  <div className="checkbox-group">
                    <label><input type="checkbox" name="accessories.charger" checked={formData.accessories.charger} onChange={handleInputChange} /> Carregador Original</label>
                    <label><input type="checkbox" name="accessories.mouse" checked={formData.accessories.mouse} onChange={handleInputChange} /> Mouse/Trackpad</label>
                    <label><input type="checkbox" name="accessories.case" checked={formData.accessories.case} onChange={handleInputChange} /> Case/Bolsa</label>
                  </div>
                  <input type="text" name="accessories.other" value={formData.accessories.other} onChange={handleInputChange} placeholder="Outros acessórios" className="other-input" />
                </div>
              </div>
            )}

            {/* Step 3: Termos */}
            {step === 3 && (
              <div className="form-step">
                <h2>📋 Termos e Condições</h2>
                
                <div className="responsibilities-box">
                  <h3>Responsabilidades do Colaborador</h3>
                  <ol className="responsibilities-list">
                    <li>Utilizar o equipamento exclusivamente para fins profissionais</li>
                    <li>Manter a integridade do hardware e software</li>
                    <li>Não emprestar o equipamento sem autorização formal</li>
                    <li>Reportar problemas técnicos imediatamente ao setor de TI</li>
                    <li>Não instalar software não autorizado</li>
                    <li>Manter atualizações de segurança do sistema operacional</li>
                    <li>Devolver o equipamento quando solicitado</li>
                    <li>Compensar financeiramente danos causados por negligência</li>
                  </ol>
                </div>

                <div className="lgpd-box">
                  <h3>🔒 Rastreamento e Proteção de Dados (LGPD)</h3>
                  <p>Autorizo que o equipamento seja rastreado para fins de segurança, localização e proteção contra roubo/perda. Este rastreamento <strong>NÃO</strong> será utilizado para monitoramento de jornada ou produtividade do colaborador.</p>
                </div>

                <div className="form-group checkbox-large">
                  <label>
                    <input type="checkbox" name="terms_accepted" checked={formData.terms_accepted} onChange={handleInputChange} />
                    <span>Aceito todas as responsabilidades listadas acima</span>
                  </label>
                </div>

                <div className="form-group checkbox-large">
                  <label>
                    <input type="checkbox" name="tracking_authorized" checked={formData.tracking_authorized} onChange={handleInputChange} />
                    <span>Autorizo o rastreamento de segurança conforme LGPD</span>
                  </label>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Método de Assinatura</label>
                    <select name="signature_method" value={formData.signature_method} onChange={handleInputChange}>
                      <option value="digital">🔏 Digital</option>
                      <option value="manual">✍️ Manual</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Data da Assinatura</label>
                    <input type="date" name="signature_date" value={formData.signature_date} onChange={handleInputChange} />
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
              {step < 3 ? (
                <button type="button" onClick={handleNextStep} className="btn btn-primary">
                  Próximo →
                </button>
              ) : (
                <button type="submit" disabled={loading} className="btn btn-success">
                  {loading ? '⏳ Assinando...' : '✍️ Assinar Termo'}
                </button>
              )}
              <button type="button" onClick={() => navigate(`/inventario/equipamento/${equipmentId}`)} className="btn btn-outline">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </InventoryLayout>
  );
}
