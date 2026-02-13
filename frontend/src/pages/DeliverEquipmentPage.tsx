import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/DeliverEquipmentPage.css';

interface Equipment {
  id: string;
  internal_code: string;
  category: string;
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  processor?: string;
  memory_ram?: string;
  storage?: string;
  current_status: string;
}

interface DeliveryForm {
  equipmentId: string;
  responsibleName: string;
  responsibleCpf: string;
  responsibleEmail: string;
  responsiblePhone: string;
  responsiblePosition: string;
  responsibleDepartment: string;
  responsibleUnit: string;
  deliveryReason: string;
  deliveryNotes: string;
}

const DeliverEquipmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState<DeliveryForm>({
    equipmentId: '',
    responsibleName: '',
    responsibleCpf: '',
    responsibleEmail: '',
    responsiblePhone: '',
    responsiblePosition: '',
    responsibleDepartment: '',
    responsibleUnit: '',
    deliveryReason: '',
    deliveryNotes: ''
  });

  const deliveryReasons = [
    { value: 'uso_diario', label: 'Uso Diário' },
    { value: 'projeto_especifico', label: 'Projeto Específico' },
    { value: 'substituicao', label: 'Substituição de Equipamento' },
    { value: 'nova_contratacao', label: 'Nova Contratação' },
    { value: 'emprestimo_temporario', label: 'Empréstimo Temporário' },
    { value: 'trabalho_remoto', label: 'Trabalho Remoto' },
    { value: 'outro', label: 'Outro' }
  ];

  const units = [
    'Unidade Central',
    'Unidade Carlos Prates',
    'Unidade Floresta',
    'Unidade Santa Tereza',
    'Unidade Contagem'
  ];

  useEffect(() => {
    fetchAvailableEquipment();
  }, []);

  const fetchAvailableEquipment = async () => {
    try {
      const token = localStorage.getItem('internal_token');
      
      // Buscar todos os equipamentos e filtrar os disponíveis
      const response = await axios.get('/api/inventory/equipment', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allEquipment = response.data.equipment || [];
      
      // Filtrar equipamentos disponíveis (in_stock ou available)
      const available = allEquipment.filter((eq: Equipment) => 
        eq.current_status === 'in_stock' || eq.current_status === 'available'
      );
      
      console.log('Total equipment:', allEquipment.length);
      console.log('Available equipment:', available.length);
      
      setAvailableEquipment(available);
      
      if (available.length === 0) {
        setError('Nenhum equipamento disponível para entrega no momento');
      }
    } catch (err: any) {
      console.error('Erro ao buscar equipamentos:', err);
      setError('Erro ao carregar equipamentos disponíveis');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData(prev => ({ ...prev, responsibleCpf: formatted }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, responsiblePhone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.equipmentId) {
      setError('Selecione um equipamento');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('internal_token');
      const userStr = localStorage.getItem('internalUser');
      const user = userStr ? JSON.parse(userStr) : null;

      // Enviar dados no formato que o backend espera (snake_case)
      const payload = {
        equipment_id: formData.equipmentId,
        responsible_name: formData.responsibleName,
        responsible_cpf: formData.responsibleCpf,
        responsible_email: formData.responsibleEmail,
        responsible_phone: formData.responsiblePhone,
        responsible_department: formData.responsibleDepartment,
        responsible_unit: formData.responsibleUnit,
        delivery_reason: formData.deliveryReason,
        delivery_notes: formData.deliveryNotes,
        issued_by_id: user?.id || null,
        issued_by_name: user?.full_name || 'Sistema'
      };

      console.log('📤 Enviando requisição:', payload);

      const response = await axios.post(
        '/api/inventory/movements/deliver',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Resposta recebida:', response.data);

      setSuccess('Equipamento entregue com sucesso! Termo de responsabilidade gerado.');
      
      // Abrir PDF do termo em nova aba
      const termId = response.data.termId || response.data.term?.id;
      console.log('📄 Term ID:', termId);
      
      if (termId) {
        window.open(`/api/inventory/terms/${termId}/delivery-pdf?token=${token}`, '_blank');
      } else {
        console.error('❌ termId não encontrado na resposta');
      }

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/inventario/responsabilidades');
      }, 2000);
    } catch (err: any) {
      console.error('❌ Erro ao entregar equipamento:', err);
      console.error('Detalhes:', err.response?.data);
      
      const errorMsg = err.response?.data?.details || 
                       err.response?.data?.error || 
                       err.response?.data?.message || 
                       'Erro ao entregar equipamento';
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const selectedEquipment = availableEquipment.find(eq => eq.id === formData.equipmentId);

  return (
    <div className="deliver-equipment-page">
      <div className="page-header">
        <h1>📦 Entregar Equipamento</h1>
        <button className="btn-back" onClick={() => navigate('/inventario')}>
          ← Voltar
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="delivery-form">
        <div className="form-section">
          <h2>1. Selecionar Equipamento</h2>
          <div className="form-group">
            <label htmlFor="equipmentId">Equipamento *</label>
            <select
              id="equipmentId"
              name="equipmentId"
              value={formData.equipmentId}
              onChange={handleInputChange}
              required
            >
              <option value="">Selecione um equipamento...</option>
              {availableEquipment.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.internal_code} - {eq.type} {eq.brand} {eq.model}
                  {eq.category === 'NOTEBOOK' && eq.processor && ` (${eq.processor})`}
                </option>
              ))}
            </select>
          </div>

          {selectedEquipment && (
            <div className="equipment-preview">
              <h3>Detalhes do Equipamento</h3>
              <div className="equipment-details">
                <p><strong>Código:</strong> {selectedEquipment.internal_code}</p>
                <p><strong>Categoria:</strong> {selectedEquipment.category}</p>
                <p><strong>Tipo:</strong> {selectedEquipment.type}</p>
                <p><strong>Marca/Modelo:</strong> {selectedEquipment.brand} {selectedEquipment.model}</p>
                {selectedEquipment.serial_number !== 'S/N' && (
                  <p><strong>Número de Série:</strong> {selectedEquipment.serial_number}</p>
                )}
                {selectedEquipment.category === 'NOTEBOOK' && (
                  <>
                    {selectedEquipment.processor && <p><strong>Processador:</strong> {selectedEquipment.processor}</p>}
                    {selectedEquipment.memory_ram && <p><strong>RAM:</strong> {selectedEquipment.memory_ram}</p>}
                    {selectedEquipment.storage && <p><strong>Armazenamento:</strong> {selectedEquipment.storage}</p>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>2. Dados do Responsável</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="responsibleName">Nome Completo *</label>
              <input
                type="text"
                id="responsibleName"
                name="responsibleName"
                value={formData.responsibleName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="responsibleCpf">CPF *</label>
              <input
                type="text"
                id="responsibleCpf"
                name="responsibleCpf"
                value={formData.responsibleCpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="responsibleEmail">E-mail *</label>
              <input
                type="email"
                id="responsibleEmail"
                name="responsibleEmail"
                value={formData.responsibleEmail}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="responsiblePhone">Telefone *</label>
              <input
                type="text"
                id="responsiblePhone"
                name="responsiblePhone"
                value={formData.responsiblePhone}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                maxLength={15}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="responsiblePosition">Cargo *</label>
              <input
                type="text"
                id="responsiblePosition"
                name="responsiblePosition"
                value={formData.responsiblePosition}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="responsibleDepartment">Departamento *</label>
              <input
                type="text"
                id="responsibleDepartment"
                name="responsibleDepartment"
                value={formData.responsibleDepartment}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="responsibleUnit">Unidade *</label>
            <select
              id="responsibleUnit"
              name="responsibleUnit"
              value={formData.responsibleUnit}
              onChange={handleInputChange}
              required
            >
              <option value="">Selecione uma unidade...</option>
              {units.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h2>3. Informações da Entrega</h2>
          <div className="form-group">
            <label htmlFor="deliveryReason">Motivo da Entrega *</label>
            <select
              id="deliveryReason"
              name="deliveryReason"
              value={formData.deliveryReason}
              onChange={handleInputChange}
              required
            >
              <option value="">Selecione um motivo...</option>
              {deliveryReasons.map(reason => (
                <option key={reason.value} value={reason.value}>{reason.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="deliveryNotes">Observações</label>
            <textarea
              id="deliveryNotes"
              name="deliveryNotes"
              value={formData.deliveryNotes}
              onChange={handleInputChange}
              rows={4}
              placeholder="Informações adicionais sobre a entrega..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/inventario')}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processando...' : '📄 Gerar Termo e Entregar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliverEquipmentPage;
