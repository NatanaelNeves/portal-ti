import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import InventoryLayout from '../components/InventoryLayout';
import { showToast } from '../utils/toast';
import '../styles/MoveEquipmentPage.css';

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

interface InternalUser {
  id: string;
  name: string;
  email: string;
  department: string;
  unit: string;
  phone: string;
  cpf: string;
}

export default function MoveEquipmentPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [transferType, setTransferType] = useState<'employee' | 'location'>('employee');
  
  // Para transferência de colaborador
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  
  // Para mudança de localização
  const [newLocation, setNewLocation] = useState('');
  const [newUnit, setNewUnit] = useState('');
  
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Buscar equipamento
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const token = localStorage.getItem('internal_token');
        const response = await axios.get(
          `/api/inventory/equipment/${equipmentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEquipment(response.data.equipment);
      } catch (err: any) {
        setError('Erro ao carregar equipamento');
        console.error(err);
      }
    };

    fetchEquipment();
  }, [equipmentId]);

  // Buscar usuários internos para transferência
  useEffect(() => {
    if (transferType === 'employee') {
      const fetchUsers = async () => {
        try {
          const token = localStorage.getItem('internal_token');
          const response = await axios.get(
            '/api/internal-auth/users',
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setUsers(response.data);
        } catch (err: any) {
          console.error('Erro ao carregar usuários:', err);
        }
      };

      fetchUsers();
    }
  }, [transferType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('internal_token');
      const currentUser = JSON.parse(localStorage.getItem('internal_user') || '{}');

      let payload: any = {
        equipment_id: equipmentId,
        transfer_type: transferType,
        notes,
        registered_by_id: currentUser.id,
        registered_by_name: currentUser.name
      };

      if (transferType === 'employee') {
        const selectedUser = users.find(u => u.id === selectedUserId);
        if (!selectedUser) {
          setError('Selecione um colaborador');
          setLoading(false);
          return;
        }

        payload = {
          ...payload,
          new_responsible_id: selectedUser.id,
          new_responsible_name: selectedUser.name,
          new_responsible_department: selectedUser.department,
          new_responsible_unit: selectedUser.unit,
          new_responsible_email: selectedUser.email,
          new_responsible_phone: selectedUser.phone,
          new_responsible_cpf: selectedUser.cpf,
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

      await axios.post(
        '/api/inventory/movements/transfer',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast.success('Equipamento movimentado com sucesso!');
      navigate(`/inventario/equipamento/${equipmentId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao movimentar equipamento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!equipment) {
    return (
      <InventoryLayout>
        <div className="move-equipment-page">
          <p>Carregando equipamento...</p>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="move-equipment-page">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate(`/inventario/equipamento/${equipmentId}`)}>
            ← Voltar
          </button>
          <h1>↔️ Movimentar Equipamento</h1>
        </div>

        <div className="equipment-summary">
          <h3>📦 {equipment.internal_code}</h3>
          <p>{equipment.brand} {equipment.model} ({equipment.type})</p>
          <p><strong>Status:</strong> {equipment.current_status}</p>
          {equipment.responsible_name && (
            <p><strong>Responsável Atual:</strong> {equipment.responsible_name}</p>
          )}
          {equipment.current_location && (
            <p><strong>Localização Atual:</strong> {equipment.current_location}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="move-form">
          <div className="form-section">
            <h3>Tipo de Movimentação</h3>
            <div className="radio-group">
              <label className={transferType === 'employee' ? 'active' : ''}>
                <input
                  type="radio"
                  value="employee"
                  checked={transferType === 'employee'}
                  onChange={(e) => setTransferType(e.target.value as 'employee')}
                />
                <div className="radio-content">
                  <strong>👤 Transferir para Outro Colaborador</strong>
                  <span>Quando um colaborador sai ou muda de função</span>
                </div>
              </label>

              <label className={transferType === 'location' ? 'active' : ''}>
                <input
                  type="radio"
                  value="location"
                  checked={transferType === 'location'}
                  onChange={(e) => setTransferType(e.target.value as 'location')}
                />
                <div className="radio-content">
                  <strong>📍 Mudar de Unidade/Localização</strong>
                  <span>Mover equipamento para outro local</span>
                </div>
              </label>
            </div>
          </div>

          {transferType === 'employee' && (
            <div className="form-section">
              <h3>Novo Responsável</h3>
              <div className="form-group">
                <label>Colaborador *</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                >
                  <option value="">Selecione um colaborador</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.department} ({user.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Motivo da Transferência *</label>
                <select
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  required
                >
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

          {transferType === 'location' && (
            <div className="form-section">
              <h3>Nova Localização</h3>
              <div className="form-group">
                <label>Unidade *</label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  required
                >
                  <option value="">Selecione a unidade</option>
                  <option value="Maracanaú">Maracanaú</option>
                  <option value="Fortaleza">Fortaleza</option>
                  <option value="Caucaia">Caucaia</option>
                  <option value="Sede Administrativa">Sede Administrativa</option>
                </select>
              </div>

              <div className="form-group">
                <label>Localização Específica *</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Ex: Sala TI, Recepção, Almoxarifado..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Motivo da Mudança *</label>
                <select
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  required
                >
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

          <div className="form-section">
            <div className="form-group">
              <label>Observações</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione informações adicionais sobre a movimentação..."
                rows={4}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/inventario/equipamento/${equipmentId}`)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processando...' : '✓ Confirmar Movimentação'}
            </button>
          </div>
        </form>
      </div>
    </InventoryLayout>
  );
}
