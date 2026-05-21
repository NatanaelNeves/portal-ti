import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationService, EquipmentType, AvailabilityResult } from '../services/reservationService';
import { useAuthStore } from '../stores/authStore';
import '../styles/ReservationPublicPage.css';

function getMinDate(): string {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

export default function CreateReservationPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [form, setForm] = useState({
    equipment_type_id: '',
    quantity: 1,
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    purpose: '',
  });
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    reservationService.getTypes().then(setTypes).catch(() => setError('Erro ao carregar tipos'));
  }, []);

  const checkAvailability = useCallback(async () => {
    if (!form.equipment_type_id || !form.date || !form.start_time || !form.end_time) return;
    if (form.start_time >= form.end_time) return;
    setCheckingAvailability(true);
    try {
      const result = await reservationService.checkAvailability(
        form.equipment_type_id, form.date, form.start_time, form.end_time, form.quantity,
      );
      setAvailability(result);
    } catch {
      setAvailability(null);
    } finally {
      setCheckingAvailability(false);
    }
  }, [form.equipment_type_id, form.date, form.start_time, form.end_time, form.quantity]);

  useEffect(() => {
    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [checkAvailability]);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (availability && !availability.available) {
      setError('Horário indisponível');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await reservationService.create({ ...form, quantity: Number(form.quantity) });
      navigate('/reservas', { state: { success: result.reservation_number } });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Erro ao criar reserva');
    } finally {
      setSubmitting(false);
    }
  };

  const capacityBadge = () => {
    if (!availability && !checkingAvailability) return null;
    if (checkingAvailability) return <span className="avail-badge avail-checking">Verificando...</span>;
    if (!availability) return null;
    if (availability.available) {
      const color = availability.capacity_status === 'partial' ? 'partial' : 'ok';
      return <span className={`avail-badge avail-${color}`}>{color === 'ok' ? '🟢 Disponível' : '🟡 Parcialmente ocupado'}</span>;
    }
    return (
      <span className="avail-badge avail-unavailable">
        🔴 Indisponível
        {availability.next_available && <span className="avail-next"> — Próximo: {availability.next_available}</span>}
      </span>
    );
  };

  return (
    <div className="res-public-page">
      <div className="res-public-container">
        <header className="res-public-header">
          <button className="btn-res-ghost btn-res-sm" onClick={() => navigate('/reservas')} style={{ marginBottom: 8 }}>
            ← Voltar
          </button>
          <h1>Nova Reserva</h1>
          <p>Reservando como <strong>{user?.name}</strong></p>
        </header>

        <form className="res-public-form" onSubmit={handleSubmit}>
          <section className="res-form-section">
            <h3>Equipamento</h3>
            <div className="res-type-chips">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`res-type-chip ${form.equipment_type_id === t.id ? 'active' : ''}`}
                  onClick={() => handleChange('equipment_type_id', t.id)}
                >
                  {t.icon} {t.name}
                </button>
              ))}
            </div>
            <label className="res-label" htmlFor="qty" style={{ marginTop: 12 }}>Quantidade</label>
            <input
              id="qty"
              type="number"
              min={1}
              className="res-input"
              value={form.quantity}
              onChange={(e) => handleChange('quantity', parseInt(e.target.value, 10) || 1)}
              required
            />
          </section>

          <section className="res-form-section">
            <h3>Data e Horário</h3>
            <div className="res-datetime-grid">
              <div>
                <label className="res-label">Data</label>
                <input
                  type="date"
                  className="res-input"
                  min={getMinDate()}
                  value={form.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="res-label">Início</label>
                <input
                  type="time"
                  className="res-input"
                  value={form.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="res-label">Término</label>
                <input
                  type="time"
                  className="res-input"
                  value={form.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="res-availability-indicator">{capacityBadge()}</div>
            {availability && !availability.available && (
              <p className="avail-msg avail-msg-warning">
                {availability.reason === 'buffer'
                  ? `Buffer de ${availability.buffer_minutes}min necessário entre reservas.`
                  : `Apenas ${availability.remaining} disponível(is) para este horário.`}
                {availability.next_available && ` Próximo: ${availability.next_available}`}
              </p>
            )}
          </section>

          <section className="res-form-section">
            <label className="res-label">Local de uso</label>
            <input
              type="text"
              className="res-input"
              placeholder="Ex: Sala de Treinamento — Bloco A"
              value={form.location}
              onChange={(e) => handleChange('location', e.target.value)}
              required
            />
            <label className="res-label" style={{ marginTop: 12 }}>Finalidade</label>
            <textarea
              className="res-input res-textarea"
              placeholder="Descreva o uso dos equipamentos"
              value={form.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
              rows={3}
              required
            />
          </section>

          {error && <p className="res-error">{error}</p>}

          <button
            type="submit"
            className="btn-res-primary btn-res-full"
            disabled={submitting || (availability !== null && !availability.available)}
          >
            {submitting ? 'Processando...' : 'Confirmar Reserva'}
          </button>
        </form>
      </div>
    </div>
  );
}
