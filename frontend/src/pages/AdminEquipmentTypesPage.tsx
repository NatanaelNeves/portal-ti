import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationService, EquipmentTypeAdmin } from '../services/reservationService';
import '../styles/AdminEquipmentTypesPage.css';

interface TypeForm {
  name: string;
  description: string;
  max_quantity: number;
  buffer_minutes: number;
  icon: string;
}

const EMPTY_FORM: TypeForm = { name: '', description: '', max_quantity: 10, buffer_minutes: 30, icon: '💻' };

export default function AdminEquipmentTypesPage() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<EquipmentTypeAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<TypeForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    reservationService.getEquipmentTypes().then(setTypes).catch(() => setError('Erro ao carregar tipos')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (t: EquipmentTypeAdmin) => {
    setEditing(t.id);
    setForm({ name: t.name, description: t.description ?? '', max_quantity: t.max_quantity, buffer_minutes: t.buffer_minutes, icon: t.icon ?? '💻' });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editing) {
        await reservationService.updateEquipmentType(editing, { ...form });
      } else {
        await reservationService.createEquipmentType(form);
      }
      setShowForm(false);
      load();
    } catch {
      setError('Erro ao salvar tipo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (t: EquipmentTypeAdmin) => {
    try {
      await reservationService.updateEquipmentType(t.id, { is_active: !t.is_active });
      load();
    } catch {
      setError('Erro ao alterar status');
    }
  };

  return (
    <div className="eq-types-page">
      <div className="eq-types-header">
        <div>
          <button className="btn-res-ghost btn-res-sm" onClick={() => navigate('/admin/reservas')}>← Voltar</button>
          <h1>Tipos de Equipamento</h1>
          <p>Configure o pool de reservas por tipo</p>
        </div>
        <button className="btn-res-primary" onClick={openCreate}>+ Novo Tipo</button>
      </div>

      {error && <div className="res-alert res-alert-error">{error}</div>}

      {loading ? (
        <div className="eq-types-list">{[1, 2].map((i) => <div key={i} className="eq-type-skeleton" />)}</div>
      ) : (
        <div className="eq-types-list">
          {types.map((t) => (
            <div key={t.id} className={`eq-type-card ${!t.is_active ? 'eq-type-inactive' : ''}`}>
              <div className="eq-type-card-header">
                <span className="eq-type-icon">{t.icon}</span>
                <div className="eq-type-info">
                  <h3>{t.name}</h3>
                  {t.description && <p className="eq-type-desc">{t.description}</p>}
                </div>
                {!t.is_active && <span className="eq-type-inactive-badge">Inativo</span>}
              </div>

              <div className="eq-type-stats">
                <div className="eq-type-stat">
                  <span className="eq-type-stat-label">Pool</span>
                  <span className="eq-type-stat-value">{t.max_quantity}</span>
                </div>
                <div className="eq-type-stat">
                  <span className="eq-type-stat-label">Buffer</span>
                  <span className="eq-type-stat-value">{t.buffer_minutes}min</span>
                </div>
                <div className="eq-type-stat">
                  <span className="eq-type-stat-label">Reservas ativas</span>
                  <span className="eq-type-stat-value">{t.active_reservations}</span>
                </div>
              </div>

              <div className="eq-type-actions">
                <button className="btn-res-ghost btn-res-sm" onClick={() => openEdit(t)}>Editar</button>
                <button
                  className={`btn-res-sm ${t.is_active ? 'btn-res-danger' : 'btn-res-success'}`}
                  onClick={() => handleToggleActive(t)}
                >
                  {t.is_active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <div className="res-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="res-modal res-modal-lg" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Editar Tipo' : 'Novo Tipo de Equipamento'}</h3>

            <form onSubmit={handleSubmit}>
              <label className="res-label">Nome</label>
              <input
                type="text"
                className="res-input"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />

              <label className="res-label" style={{ marginTop: 12 }}>Descrição (opcional)</label>
              <input
                type="text"
                className="res-input"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />

              <div className="eq-form-grid">
                <div>
                  <label className="res-label">Pool (quantidade máxima)</label>
                  <input
                    type="number"
                    min={1}
                    className="res-input"
                    value={form.max_quantity}
                    onChange={(e) => setForm((p) => ({ ...p, max_quantity: parseInt(e.target.value, 10) || 1 }))}
                    required
                  />
                </div>
                <div>
                  <label className="res-label">Buffer entre reservas (min)</label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    className="res-input"
                    value={form.buffer_minutes}
                    onChange={(e) => setForm((p) => ({ ...p, buffer_minutes: parseInt(e.target.value, 10) || 0 }))}
                    required
                  />
                </div>
              </div>

              <label className="res-label" style={{ marginTop: 12 }}>Ícone (emoji)</label>
              <input
                type="text"
                className="res-input"
                value={form.icon}
                onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                placeholder="💻"
                maxLength={4}
              />

              <p className="eq-form-note">
                ⚠️ O pool é o número máximo de equipamentos disponíveis para reserva, não o inventário real.
                {form.buffer_minutes > 0 && ` Com buffer de ${form.buffer_minutes}min, há um tempo de preparação obrigatório entre reservas.`}
              </p>

              {error && <p className="res-error">{error}</p>}

              <div className="res-modal-actions" style={{ marginTop: 16 }}>
                <button type="button" className="btn-res-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-res-primary" disabled={submitting}>
                  {submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar tipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
