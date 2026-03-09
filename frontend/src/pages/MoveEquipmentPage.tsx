import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import InventoryLayout from '../components/InventoryLayout';
import { showToast } from '../utils/toast';
import '../styles/MoveEquipmentPage.css';
import { INSTITUTION_UNITS } from '../utils/institutionOptions';

interface Equipment {
  id: string;
  internal_code: string;
  category: string;
  type: string;
  brand: string;
  model: string;
  current_status: string;
  responsible_name?: string;
  current_location?: string;
  current_unit?: string;
}

export default function MoveEquipmentPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [transferType, setTransferType] = useState<'employee' | 'location'>('employee');
  const [transferReason, setTransferReason] = useState('');

  // Campos manuais do novo responsável
  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleCpf, setResponsibleCpf] = useState('');
  const [responsibleEmail, setResponsibleEmail] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState('');
  const [responsiblePosition, setResponsiblePosition] = useState('');
  const [responsibleDepartment, setResponsibleDepartment] = useState('');
  const [responsibleUnit, setResponsibleUnit] = useState('');

  // Campos de localização
  const [newLocation, setNewLocation] = useState('');
  const [newUnit, setNewUnit] = useState('');

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const response = await api.get(`/inventory/equipment/${equipmentId}`);
        setEquipment(response.data.equipment);
      } catch (err: any) {
        setError('Erro ao carregar equipamento');
      }
    };
    fetchEquipment();
  }, [equipmentId]);

  const formatCPF = (value: string) =>
    value.replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');

  const formatPhone = (value: string) =>
    value.replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const currentUser = JSON.parse(localStorage.getItem('internalUser') || localStorage.getItem('internal_user') || '{}');

      let payload: any = {
        equipment_id: equipmentId,
        transfer_type: transferType,
        notes,
        registered_by_id: currentUser.id,
        registered_by_name: currentUser.full_name || currentUser.name
      };

      if (transferType === 'employee') {
        if (!responsibleName.trim()) {
          setError('Informe o nome do novo responsável');
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          new_responsible_name: responsibleName,
          new_responsible_cpf: responsibleCpf,
          new_responsible_email: responsibleEmail,
          new_responsible_phone: responsiblePhone,
          new_responsible_position: responsiblePosition,
          new_responsible_department: responsibleDepartment,
          new_responsible_unit: responsibleUnit,
          transfer_reason: transferReason || 'Transferência de colaborador'
        };
      } else {
        if (!newLocation || !newUnit) {
          setError('Preencha localização e unidade');
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          new_location: newLocation,
          new_unit: newUnit,
          transfer_reason: transferReason || 'Mudança de unidade'
        };
      }

      await api.post('/inventory/movements/transfer', payload);
      showToast.success('Equipamento movimentado com sucesso!');
      navigate(`/inventario/equipamento/${equipmentId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao movimentar equipamento');
    } finally {
      setLoading(false);
    }
  };

  if (!equipment) {
    return (
      <InventoryLayout>
        <div className="move-equipment-page">
          <div className="loading-state">Carregando equipamento...</div>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="move-equipment-page">

        {/* HEADER */}
        <div className="move-header">
          <button className="btn-back-move" onClick={() => navigate(`/inventario/equipamento/${equipmentId}`)}>
            ← Voltar
          </button>
          <div className="move-header-info">
            <h1>↔️ Movimentar Equipamento</h1>
            <p>Transfira a posse ou altere a localização do equipamento</p>
          </div>
        </div>

        {/* CARD DO EQUIPAMENTO */}
        <div className="equipment-card-move">
          <div className="equipment-card-icon">💻</div>
          <div className="equipment-card-details">
            <span className="equipment-code-move">{equipment.internal_code}</span>
            <span className="equipment-name-move">{equipment.brand} {equipment.model} · {equipment.type}</span>
            {equipment.responsible_name && (
              <span className="equipment-responsible-move">👤 Responsável atual: <strong>{equipment.responsible_name}</strong></span>
            )}
            {equipment.current_unit && (
              <span className="equipment-unit-move">📍 Unidade: <strong>{equipment.current_unit}</strong></span>
            )}
          </div>
        </div>

        {error && <div className="alert-move error">{error}</div>}

        <form onSubmit={handleSubmit} className="move-form">

          {/* TIPO DE MOVIMENTAÇÃO */}
          <div className="move-section">
            <div className="section-title">
              <span className="section-number">1</span>
              <h2>Tipo de Movimentação</h2>
            </div>
            <div className="transfer-type-cards">
              <div
                className={`transfer-type-card ${transferType === 'employee' ? 'active' : ''}`}
                onClick={() => setTransferType('employee')}
              >
                <input type="radio" checked={transferType === 'employee'} onChange={() => setTransferType('employee')} />
                <div className="transfer-type-icon">👤</div>
                <div className="transfer-type-text">
                  <strong>Transferir para Colaborador</strong>
                  <span>Passar a responsabilidade para outra pessoa</span>
                </div>
              </div>

              <div
                className={`transfer-type-card ${transferType === 'location' ? 'active' : ''}`}
                onClick={() => setTransferType('location')}
              >
                <input type="radio" checked={transferType === 'location'} onChange={() => setTransferType('location')} />
                <div className="transfer-type-icon">📍</div>
                <div className="transfer-type-text">
                  <strong>Mudar de Unidade/Local</strong>
                  <span>Mover o equipamento para outro local</span>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO COLABORADOR */}
          {transferType === 'employee' && (
            <div className="move-section">
              <div className="section-title">
                <span className="section-number">2</span>
                <h2>Dados do Novo Responsável</h2>
              </div>
              <p className="section-hint">Preencha os dados da pessoa que ficará responsável pelo equipamento.</p>

              <div className="form-row-move">
                <div className="form-group-move">
                  <label>Nome Completo *</label>
                  <input
                    type="text"
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    placeholder="Nome do colaborador"
                    required
                  />
                </div>
                <div className="form-group-move">
                  <label>CPF</label>
                  <input
                    type="text"
                    value={responsibleCpf}
                    onChange={(e) => setResponsibleCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
              </div>

              <div className="form-row-move">
                <div className="form-group-move">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={responsibleEmail}
                    onChange={(e) => setResponsibleEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="form-group-move">
                  <label>Telefone</label>
                  <input
                    type="text"
                    value={responsiblePhone}
                    onChange={(e) => setResponsiblePhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="form-row-move">
                <div className="form-group-move">
                  <label>Cargo / Função</label>
                  <input
                    type="text"
                    value={responsiblePosition}
                    onChange={(e) => setResponsiblePosition(e.target.value)}
                    placeholder="Ex: Educador, Coordenador, Auxiliar"
                  />
                </div>
                <div className="form-group-move">
                  <label>Setor / Departamento</label>
                  <input
                    type="text"
                    value={responsibleDepartment}
                    onChange={(e) => setResponsibleDepartment(e.target.value)}
                    placeholder="Ex: Educação, Administrativo, Acolhimento"
                  />
                </div>
              </div>

              <div className="form-group-move">
                <label>Unidade</label>
                <select value={responsibleUnit} onChange={(e) => setResponsibleUnit(e.target.value)}>
                  <option value="">Selecione a unidade...</option>
                  {INSTITUTION_UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-move">
                <label>Motivo da Transferência *</label>
                <select value={transferReason} onChange={(e) => setTransferReason(e.target.value)} required>
                  <option value="">Selecione o motivo</option>
                  <option value="Colaborador desligado">Colaborador desligado</option>
                  <option value="Mudança de função">Mudança de função</option>
                  <option value="Mudança de setor">Mudança de setor</option>
                  <option value="Realocação interna">Realocação interna</option>
                  <option value="Substituição de equipamento">Substituição de equipamento</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
          )}

          {/* SEÇÃO LOCALIZAÇÃO */}
          {transferType === 'location' && (
            <div className="move-section">
              <div className="section-title">
                <span className="section-number">2</span>
                <h2>Nova Localização</h2>
              </div>

              <div className="form-row-move">
                <div className="form-group-move">
                  <label>Unidade *</label>
                  <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} required>
                    <option value="">Selecione a unidade...</option>
                    {INSTITUTION_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group-move">
                  <label>Local Específico *</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Ex: Sala TI, Recepção, Almoxarifado"
                    required
                  />
                </div>
              </div>

              <div className="form-group-move">
                <label>Motivo da Mudança *</label>
                <select value={transferReason} onChange={(e) => setTransferReason(e.target.value)} required>
                  <option value="">Selecione o motivo</option>
                  <option value="Abertura de nova unidade">Abertura de nova unidade</option>
                  <option value="Redistribuição de recursos">Redistribuição de recursos</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Reorganização interna">Reorganização interna</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
          )}

          {/* OBSERVAÇÕES */}
          <div className="move-section">
            <div className="section-title">
              <span className="section-number">3</span>
              <h2>Observações</h2>
            </div>
            <div className="form-group-move">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais sobre esta movimentação..."
                rows={3}
              />
            </div>
          </div>

          {/* AÇÕES */}
          <div className="move-actions">
            <button
              type="button"
              className="btn-cancel-move"
              onClick={() => navigate(`/inventario/equipamento/${equipmentId}`)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-confirm-move" disabled={loading}>
              {loading ? '⏳ Processando...' : '✓ Confirmar Movimentação'}
            </button>
          </div>
        </form>
      </div>
    </InventoryLayout>
  );
}
