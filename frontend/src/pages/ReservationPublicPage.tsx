import { useState, useEffect, useCallback } from 'react';
import { reservationService, EquipmentType, AvailabilityResult } from '../services/reservationService';
import '../styles/ReservationPublicPage.css';

type Step = 'form' | 'success';

interface FormData {
  equipment_type_id: string;
  quantity: number;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  purpose: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
}

const INITIAL_FORM: FormData = {
  equipment_type_id: '',
  quantity: 1,
  date: '',
  start_time: '',
  end_time: '',
  location: '',
  purpose: '',
  requester_name: '',
  requester_email: '',
  requester_phone: '',
};

function getMinDate(): string {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

function getMinTime(date: string): string {
  const now = new Date();
  const selectedDate = new Date(date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate.getTime() === today.getTime()) {
    const minTime = new Date(now.getTime() + 30 * 60 * 1000);
    return `${String(minTime.getHours()).padStart(2, '0')}:${String(minTime.getMinutes()).padStart(2, '0')}`;
  }
  return '00:00';
}

export default function ReservationPublicPage() {
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [successData, setSuccessData] = useState<{ number: string; token: string } | null>(null);

  useEffect(() => {
    reservationService.getTypes().then(setTypes).catch(() => setError('Erro ao carregar tipos de equipamento'));
  }, []);

  const checkAvailability = useCallback(async () => {
    if (!form.equipment_type_id || !form.date || !form.start_time || !form.end_time || !form.quantity) return;
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

  const handleChange = (field: keyof FormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (availability && !availability.available) {
      setError('Horário indisponível. Escolha outro horário.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await reservationService.createPublic({
        ...form,
        quantity: Number(form.quantity),
      });
      setSuccessData({ number: result.reservation_number, token: result.access_token });
      setStep('success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao criar reserva';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const capacityBadge = () => {
    if (!availability) return null;
    if (checkingAvailability) return <span className="avail-badge avail-checking">Verificando...</span>;
    if (availability.available) {
      const color = availability.capacity_status === 'partial' ? 'partial' : 'ok';
      return <span className={`avail-badge avail-${color}`}>{color === 'ok' ? '🟢 Disponível' : '🟡 Parcialmente ocupado'}</span>;
    }
    return (
      <span className="avail-badge avail-unavailable">
        🔴 Indisponível
        {availability.next_available && (
          <span className="avail-next"> — Próximo: {availability.next_available}</span>
        )}
      </span>
    );
  };

  const unavailableMessage = () => {
    if (!availability || availability.available) return null;
    if (availability.reason === 'buffer') {
      return (
        <p className="avail-msg avail-msg-warning">
          Indisponível devido ao tempo de preparação/devolução ({availability.buffer_minutes}min).
          {availability.next_available && ` Próximo horário disponível: ${availability.next_available}.`}
        </p>
      );
    }
    return (
      <p className="avail-msg avail-msg-warning">
        {availability.remaining === 0
          ? 'Sem disponibilidade para este horário.'
          : `Apenas ${availability.remaining} equipamento(s) disponível(is) para este horário.`}
      </p>
    );
  };

  if (step === 'success' && successData) {
    return (
      <div className="res-public-page">
        <div className="res-success-card">
          <div className="res-success-icon">✅</div>
          <h2>Reserva Confirmada!</h2>
          <p className="res-success-number">{successData.number}</p>
          <p className="res-success-msg">Você receberá a confirmação por e-mail com todos os detalhes.</p>
          <div className="res-success-actions">
            <a
              href={`/reservar/acompanhar/${successData.token}`}
              className="btn-res-primary"
            >
              Acompanhar Reserva
            </a>
            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reservations/public/${successData.token}/ics`}
              className="btn-res-secondary"
              download
            >
              📅 Adicionar ao Calendário
            </a>
          </div>
          <button className="btn-res-ghost" onClick={() => { setStep('form'); setForm(INITIAL_FORM); setAvailability(null); }}>
            Fazer outra reserva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="res-public-page">
      <div className="res-public-container">
        <header className="res-public-header">
          <h1>Reservar Equipamentos</h1>
          <p>Solicite notebooks para aulas, treinamentos e eventos</p>
        </header>

        <form className="res-public-form" onSubmit={handleSubmit}>
          {/* Tipo */}
          <section className="res-form-section">
            <h3>Qual equipamento você precisa?</h3>
            <div className="res-type-chips">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`res-type-chip ${form.equipment_type_id === t.id ? 'active' : ''}`}
                  onClick={() => handleChange('equipment_type_id', t.id)}
                >
                  {t.icon && <span>{t.icon}</span>} {t.name}
                </button>
              ))}
            </div>
          </section>

          {/* Quantidade */}
          <section className="res-form-section">
            <label className="res-label" htmlFor="quantity">Quantidade</label>
            <input
              id="quantity"
              type="number"
              min={1}
              className="res-input"
              value={form.quantity}
              onChange={(e) => handleChange('quantity', parseInt(e.target.value, 10) || 1)}
              required
            />
          </section>

          {/* Data e Horário */}
          <section className="res-form-section">
            <h3>Quando?</h3>
            <div className="res-datetime-grid">
              <div>
                <label className="res-label" htmlFor="date">Data</label>
                <input
                  id="date"
                  type="date"
                  className="res-input"
                  min={getMinDate()}
                  value={form.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="res-label" htmlFor="start_time">Início</label>
                <input
                  id="start_time"
                  type="time"
                  className="res-input"
                  min={form.date ? getMinTime(form.date) : undefined}
                  value={form.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="res-label" htmlFor="end_time">Término</label>
                <input
                  id="end_time"
                  type="time"
                  className="res-input"
                  min={form.start_time || undefined}
                  value={form.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="res-availability-indicator">
              {capacityBadge()}
              {unavailableMessage()}
            </div>
          </section>

          {/* Local e Finalidade */}
          <section className="res-form-section">
            <label className="res-label" htmlFor="location">Local de uso</label>
            <input
              id="location"
              type="text"
              className="res-input"
              placeholder="Ex: Laboratório de Informática — Bloco B"
              value={form.location}
              onChange={(e) => handleChange('location', e.target.value)}
              required
            />

            <label className="res-label" htmlFor="purpose" style={{ marginTop: 12 }}>Finalidade</label>
            <textarea
              id="purpose"
              className="res-input res-textarea"
              placeholder="Descreva brevemente o uso dos equipamentos"
              value={form.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
              rows={3}
              required
            />
          </section>

          {/* Dados do solicitante */}
          <section className="res-form-section">
            <h3>Seus dados</h3>
            <label className="res-label" htmlFor="requester_name">Nome completo</label>
            <input
              id="requester_name"
              type="text"
              className="res-input"
              value={form.requester_name}
              onChange={(e) => handleChange('requester_name', e.target.value)}
              required
            />
            <label className="res-label" htmlFor="requester_email" style={{ marginTop: 12 }}>E-mail</label>
            <input
              id="requester_email"
              type="email"
              className="res-input"
              value={form.requester_email}
              onChange={(e) => handleChange('requester_email', e.target.value)}
              required
            />
            <label className="res-label" htmlFor="requester_phone" style={{ marginTop: 12 }}>Telefone (opcional)</label>
            <input
              id="requester_phone"
              type="tel"
              className="res-input"
              value={form.requester_phone}
              onChange={(e) => handleChange('requester_phone', e.target.value)}
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
