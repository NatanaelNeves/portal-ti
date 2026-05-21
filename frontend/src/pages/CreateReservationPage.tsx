import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationService, EquipmentType, AvailabilityResult } from '../services/reservationService';
import { useAuthStore } from '../stores/authStore';
import '../styles/ReservationPublicPage.css';

function getMinDate(): string {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0];
}

export default function CreateReservationPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
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
    reservationService.getTypes().then(setTypes).catch(() => null).finally(() => setTypesLoading(false));
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

  const set = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (availability && !availability.available) { setError('Horário indisponível'); return; }
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

  const selectedType = types.find((t) => t.id === form.equipment_type_id);
  const typeSelected = !!form.equipment_type_id;
  const datetimeReady = typeSelected && form.date && form.start_time && form.end_time && form.start_time < form.end_time;

  const availStatus: 'idle' | 'checking' | 'ok' | 'partial' | 'unavailable' = checkingAvailability
    ? 'checking'
    : !availability ? 'idle'
      : !availability.available ? 'unavailable'
        : availability.capacity_status === 'partial' ? 'partial' : 'ok';

  return (
    <div className="rp-page">
      <div className="rp-container">
        <div className="rp-hero">
          <div className="rp-hero-icon">💻</div>
          <h1>Nova Reserva</h1>
          <p>Reservando como <strong>{user?.name}</strong></p>
        </div>

        <form className="rp-form" onSubmit={handleSubmit} noValidate>

          <div className="rp-card">
            <div className="rp-card-step">1</div>
            <div className="rp-card-body">
              <h2 className="rp-card-title">Qual equipamento?</h2>
              {typesLoading ? (
                <div className="rp-type-skeleton-row">
                  <div className="rp-skeleton rp-skeleton-chip" />
                </div>
              ) : (
                <div className="rp-type-grid">
                  {types.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`rp-type-card ${form.equipment_type_id === t.id ? 'rp-type-card--active' : ''}`}
                      onClick={() => set('equipment_type_id', t.id)}
                    >
                      <span className="rp-type-icon">{t.icon || '📦'}</span>
                      <span className="rp-type-name">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {typeSelected && (
            <div className="rp-card rp-card-reveal">
              <div className="rp-card-step">2</div>
              <div className="rp-card-body">
                <h2 className="rp-card-title">Quantos {selectedType?.name.toLowerCase()}?</h2>
                <div className="rp-stepper">
                  <button type="button" className="rp-stepper-btn" onClick={() => set('quantity', Math.max(1, form.quantity - 1))}>−</button>
                  <span className="rp-stepper-value">{form.quantity}</span>
                  <button type="button" className="rp-stepper-btn" onClick={() => set('quantity', form.quantity + 1)}>+</button>
                </div>
              </div>
            </div>
          )}

          {typeSelected && (
            <div className="rp-card rp-card-reveal">
              <div className="rp-card-step">3</div>
              <div className="rp-card-body">
                <h2 className="rp-card-title">Quando?</h2>
                <div className="rp-datetime-grid">
                  <div className="rp-field">
                    <label className="rp-label">Data</label>
                    <input type="date" className="rp-input" min={getMinDate()} value={form.date}
                      onChange={(e) => { set('date', e.target.value); setAvailability(null); }} required />
                  </div>
                  <div className="rp-field">
                    <label className="rp-label">Início</label>
                    <input type="time" className="rp-input" value={form.start_time}
                      onChange={(e) => { set('start_time', e.target.value); setAvailability(null); }} required />
                  </div>
                  <div className="rp-field">
                    <label className="rp-label">Término</label>
                    <input type="time" className="rp-input" value={form.end_time}
                      onChange={(e) => { set('end_time', e.target.value); setAvailability(null); }} required />
                  </div>
                </div>
                {availStatus !== 'idle' && (
                  <div className={`rp-avail rp-avail--${availStatus}`}>
                    <span className="rp-avail-dot" />
                    <div className="rp-avail-text">
                      {availStatus === 'checking' && 'Verificando...'}
                      {availStatus === 'ok' && 'Disponível'}
                      {availStatus === 'partial' && 'Parcialmente ocupado'}
                      {availStatus === 'unavailable' && <>Indisponível{availability?.next_available && <span className="rp-avail-next"> · Próximo: <strong>{availability.next_available}</strong></span>}</>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {datetimeReady && (
            <div className="rp-card rp-card-reveal">
              <div className="rp-card-step">4</div>
              <div className="rp-card-body">
                <h2 className="rp-card-title">Onde e para quê?</h2>
                <div className="rp-field">
                  <label className="rp-label">Local de uso</label>
                  <input type="text" className="rp-input" placeholder="Ex: Sala de Treinamento — Bloco A"
                    value={form.location} onChange={(e) => set('location', e.target.value)} required />
                </div>
                <div className="rp-field" style={{ marginTop: 14 }}>
                  <label className="rp-label">Finalidade</label>
                  <textarea className="rp-input rp-textarea" rows={3} placeholder="Descreva o uso"
                    value={form.purpose} onChange={(e) => set('purpose', e.target.value)} required />
                </div>
              </div>
            </div>
          )}

          {datetimeReady && (
            <div className="rp-card-reveal">
              {error && <div className="rp-error-banner"><span>⚠️</span> {error}</div>}
              <button type="submit" className="rp-btn-submit"
                disabled={submitting || availStatus === 'unavailable' || availStatus === 'checking'}>
                {submitting ? <><span className="rp-spinner" /> Processando...</> : 'Confirmar Reserva'}
              </button>
              <p className="rp-submit-note" style={{ textAlign: 'center', marginTop: 10 }}>
                <button type="button" className="rp-link-btn" onClick={() => navigate('/reservas')}>← Voltar para minhas reservas</button>
              </p>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
