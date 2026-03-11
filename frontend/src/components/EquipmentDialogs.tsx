import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../services/api';
import { INSTITUTION_UNITS } from '../utils/institutionOptions';
import '../styles/EquipmentDialogs.css';

/* ============================================================
   TYPES
   ============================================================ */

export interface EquipmentData {
  id: string;
  internal_code: string;
  category?: string;
  type?: string;
  brand: string;
  model: string;
  serial_number?: string;
  description?: string;
  processor?: string;
  memory_ram?: string;
  storage?: string;
  screen_size?: string;
  operating_system?: string;
  physical_condition?: string;
  current_status?: string;
  current_unit?: string;
  current_location?: string;
  acquisition_date?: string;
  purchase_value?: string | number;
  warranty_expiration?: string;
  notes?: string;
}

/* ============================================================
   EDIT DIALOG
   ============================================================ */

interface EditDialogProps {
  equipment: EquipmentData;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponível' },
  { value: 'in_use', label: 'Em Uso' },
  { value: 'in_stock', label: 'Em Estoque' },
  { value: 'in_maintenance', label: 'Manutenção' },
  { value: 'retired', label: 'Baixado' },
  { value: 'lowered', label: 'Baixado (permanente)' },
];

const CONDITION_OPTIONS = [
  { value: 'new', label: 'Novo' },
  { value: 'good', label: 'Bom' },
  { value: 'regular', label: 'Regular' },
  { value: 'bad', label: 'Com Defeito' },
];

const PERIPHERAL_TYPES = [
  'Mouse', 'Teclado', 'Monitor', 'Headset', 'Webcam', 'Impressora', 'Carregador', 'Hub USB', 'Outro'
];

export function EditEquipmentDialog({ equipment, open, onClose, onSaved }: EditDialogProps) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isNotebook = equipment.category === 'NOTEBOOK';

  useEffect(() => {
    if (open) {
      setForm({
        brand: equipment.brand || '',
        model: equipment.model || '',
        serial_number: equipment.serial_number || '',
        description: equipment.description || '',
        type: equipment.type || '',
        processor: equipment.processor || '',
        memory_ram: equipment.memory_ram || '',
        storage: equipment.storage || '',
        screen_size: equipment.screen_size || '',
        operating_system: equipment.operating_system || '',
        physical_condition: equipment.physical_condition || '',
        current_status: equipment.current_status || '',
        current_unit: equipment.current_unit || '',
        current_location: equipment.current_location || '',
        acquisition_date: equipment.acquisition_date ? equipment.acquisition_date.substring(0, 10) : '',
        purchase_value: equipment.purchase_value?.toString() || '',
        warranty_expiration: equipment.warranty_expiration ? equipment.warranty_expiration.substring(0, 10) : '',
        notes: equipment.notes || '',
      });
      setError('');
    }
  }, [open, equipment]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const token = localStorage.getItem('internal_token');

      const body: Record<string, any> = {};
      for (const [key, value] of Object.entries(form)) {
        if (value !== '' || key === 'notes' || key === 'description') {
          body[key] = value;
        }
      }

      const response = await fetch(`${BACKEND_URL}/api/inventory/equipment/${equipment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="eq-dialog-overlay" onClick={onClose}>
      <div className="eq-dialog eq-dialog-edit" onClick={e => e.stopPropagation()}>
        <div className="eq-dialog-header">
          <h2>✏️ Editar {isNotebook ? 'Notebook' : 'Periférico'}</h2>
          <span className="eq-dialog-code">{equipment.internal_code}</span>
          <button className="eq-dialog-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="eq-dialog-error">⚠️ {error}</div>}

        <div className="eq-dialog-body">
          {/* Informações Básicas */}
          <div className="eq-dialog-section">
            <h3>Informações Básicas</h3>
            <div className="eq-dialog-grid">
              {!isNotebook && (
                <div className="eq-field">
                  <label>Tipo</label>
                  <select value={form.type} onChange={e => handleChange('type', e.target.value)}>
                    <option value="">Selecione...</option>
                    {PERIPHERAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              <div className="eq-field">
                <label>Marca</label>
                <input value={form.brand} onChange={e => handleChange('brand', e.target.value)} placeholder="Ex: Dell, Lenovo..." />
              </div>
              <div className="eq-field">
                <label>Modelo</label>
                <input value={form.model} onChange={e => handleChange('model', e.target.value)} placeholder="Ex: Latitude 5420..." />
              </div>
              <div className="eq-field">
                <label>Número de Série</label>
                <input value={form.serial_number} onChange={e => handleChange('serial_number', e.target.value)} placeholder="S/N" />
              </div>
            </div>
          </div>

          {/* Especificações (Notebook only) */}
          {isNotebook && (
            <div className="eq-dialog-section">
              <h3>Especificações</h3>
              <div className="eq-dialog-grid">
                <div className="eq-field">
                  <label>Processador</label>
                  <input value={form.processor} onChange={e => handleChange('processor', e.target.value)} placeholder="Ex: Intel i5-1135G7" />
                </div>
                <div className="eq-field">
                  <label>Memória RAM</label>
                  <input value={form.memory_ram} onChange={e => handleChange('memory_ram', e.target.value)} placeholder="Ex: 8GB DDR4" />
                </div>
                <div className="eq-field">
                  <label>Armazenamento</label>
                  <input value={form.storage} onChange={e => handleChange('storage', e.target.value)} placeholder="Ex: SSD 256GB" />
                </div>
                <div className="eq-field">
                  <label>Tela</label>
                  <input value={form.screen_size} onChange={e => handleChange('screen_size', e.target.value)} placeholder='Ex: 14"' />
                </div>
                <div className="eq-field">
                  <label>Sistema Operacional</label>
                  <input value={form.operating_system} onChange={e => handleChange('operating_system', e.target.value)} placeholder="Ex: Windows 11 Pro" />
                </div>
              </div>
            </div>
          )}

          {/* Status e Localização */}
          <div className="eq-dialog-section">
            <h3>Status e Localização</h3>
            <div className="eq-dialog-grid">
              <div className="eq-field">
                <label>Condição Física</label>
                <select value={form.physical_condition} onChange={e => handleChange('physical_condition', e.target.value)}>
                  <option value="">Selecione...</option>
                  {CONDITION_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="eq-field">
                <label>Status</label>
                <select value={form.current_status} onChange={e => handleChange('current_status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="eq-field">
                <label>Unidade</label>
                <select value={form.current_unit} onChange={e => handleChange('current_unit', e.target.value)}>
                  <option value="">Selecione...</option>
                  {INSTITUTION_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Aquisição */}
          <div className="eq-dialog-section">
            <h3>Aquisição</h3>
            <div className="eq-dialog-grid">
              <div className="eq-field">
                <label>Data de Aquisição</label>
                <input type="date" value={form.acquisition_date} onChange={e => handleChange('acquisition_date', e.target.value)} />
              </div>
              <div className="eq-field">
                <label>Valor de Compra (R$)</label>
                <input type="number" step="0.01" value={form.purchase_value} onChange={e => handleChange('purchase_value', e.target.value)} placeholder="0.00" />
              </div>
              <div className="eq-field">
                <label>Garantia até</label>
                <input type="date" value={form.warranty_expiration} onChange={e => handleChange('warranty_expiration', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="eq-dialog-section">
            <h3>Observações</h3>
            <textarea
              className="eq-textarea"
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Observações sobre o equipamento..."
              rows={3}
            />
          </div>
        </div>

        <div className="eq-dialog-footer">
          <button className="eq-btn-cancel" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="eq-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : '💾 Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DELETE DIALOG
   ============================================================ */

interface DeleteDialogProps {
  equipment: { id: string; internal_code: string; brand?: string; model?: string; current_status?: string };
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteEquipmentDialog({ equipment, open, onClose, onDeleted }: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (open) {
      setConfirmText('');
      setError('');
    }
  }, [open]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError('');
      const token = localStorage.getItem('internal_token');

      const response = await fetch(`${BACKEND_URL}/api/inventory/equipment/${equipment.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir');
      }

      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  const canDelete = confirmText === equipment.internal_code;

  return (
    <div className="eq-dialog-overlay" onClick={onClose}>
      <div className="eq-dialog eq-dialog-delete" onClick={e => e.stopPropagation()}>
        <div className="eq-dialog-header eq-dialog-header-danger">
          <h2>🗑️ Excluir Equipamento</h2>
          <button className="eq-dialog-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="eq-dialog-error">⚠️ {error}</div>}

        <div className="eq-dialog-body">
          <div className="eq-delete-warning">
            <div className="eq-delete-icon">⚠️</div>
            <p>
              Você está prestes a excluir permanentemente o equipamento:
            </p>
            <div className="eq-delete-info">
              <strong>{equipment.internal_code}</strong>
              {equipment.brand && ` — ${equipment.brand} ${equipment.model || ''}`}
            </div>
            <p className="eq-delete-note">
              Esta ação não pode ser desfeita. Todo o histórico de movimentações será removido.
            </p>
          </div>

          <div className="eq-confirm-field">
            <label>
              Digite <strong>{equipment.internal_code}</strong> para confirmar:
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={equipment.internal_code}
              autoFocus
            />
          </div>
        </div>

        <div className="eq-dialog-footer">
          <button className="eq-btn-cancel" onClick={onClose} disabled={deleting}>Cancelar</button>
          <button
            className="eq-btn-delete"
            onClick={handleDelete}
            disabled={!canDelete || deleting}
          >
            {deleting ? 'Excluindo...' : '🗑️ Excluir Permanentemente'}
          </button>
        </div>
      </div>
    </div>
  );
}
