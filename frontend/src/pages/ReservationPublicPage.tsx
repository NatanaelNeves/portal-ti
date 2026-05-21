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
  return new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0];
}

function getMinTime(date: string): string {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(date + 'T00:00:00');
  if (selected.getTime() === today.getTime()) {
    const m = new Date(now.getTime() + 30 * 60 * 1000);
    return `${String(m.getHours()).padStart(2, '0')}:${String(m.getMinutes()).padStart(2, '0')}`;
  }
  return '00:00';
}

export default function ReservationPublicPage() {
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [successData, setSuccessData] = useState<{ number: string; token: string } | null>(null);

  const loadTypes = () => {
    setTypesLoading(true);
    setTypesError(false);
    reservationService
      .getTypes()
      .then(setTypes)
      .catch(() => setTypesError(true))
      .finally(() => setTypesLoading(false));
  };

  useEffect(() => { loadTypes(); }, []);

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

  const set = (field: keyof FormData, value: string | number) => {
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
      const result = await reservationService.createPublic({ ...form, quantity: Number(form.quantity) });
      setSuccessData({ number: result.reservation_number, token: result.access_token });
      setStep('success');
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
    : !availability
      ? 'idle'
      : !availability.available
        ? 'unavailable'
        : availability.capacity_status === 'partial'
          ? 'partial'
          : 'ok';

  // ─── Tela de sucesso ───────────────────────────────────────────────
  if (step === 'success' && successData) {
    return (
      <div className="rp-page">
        <div className="rp-success">
          <div className="rp-success-check">
            <svg viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="25" stroke="#007A33" strokeWidth="2" />
              <path d="M14 27l8 8 16-16" stroke="#007A33" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>Reserva Confirmada!</h2>
          <div className="rp-success-number">{successData.number}</div>
          <p>Você receberá a confirmação por e-mail com todos os detalhes e lembretes automáticos.</p>
          <div className="rp-success-btns">
            <a href={`/reservar/acompanhar/${successData.token}`} className="rp-btn-primary">
              Acompanhar reserva
            </a>
            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reservations/public/${successData.token}/ics`}
              className="rp-btn-outline"
              download
            >
              <span>📅</span> Adicionar ao Calendário
            </a>
          </div>
          <button
            className="rp-link-btn"
            onClick={() => { setStep('form'); setForm(INITIAL_FORM); setAvailability(null); }}
          >
            Fazer outra reserva
          </button>
        </div>
      </div>
    );
  }

  // ─── Formulário ────────────────────────────────────────────────────
  return (
    <div className="rp-page">
      <div className="rp-container">

        {/* Hero */}
        <div className="rp-hero">
          <div className="rp-hero-icon">💻</div>
          <h1>Reservar Equipamentos</h1>
          <p>Solicite notebooks para aulas, treinamentos e eventos internos</p>
        </div>

        <form className="rp-form" onSubmit={handleSubmit} noValidate>

          {/* ── 1. Tipo ── */}
          <div className="rp-card">
            <div className="rp-card-step">1</div>
            <div className="rp-card-body">
              <h2 className="rp-card-title">Qual equipamento você precisa?</h2>

              {typesLoading && (
                <div className="rp-type-skeleton-row">
                  <div className="rp-skeleton rp-skeleton-chip" />
                  <div className="rp-skeleton rp-skeleton-chip rp-skeleton-chip-sm" />
                </div>
              )}

              {typesError && (
                <div className="rp-types-error">
                  <span>⚠️</span>
                  <p>Não foi possível carregar os tipos de equipamento.</p>
                  <button type="button" className="rp-btn-outline rp-btn-sm" onClick={loadTypes}>
                    Tentar novamente
                  </button>
                </div>
              )}

              {!typesLoading && !typesError && types.length === 0 && (
                <p className="rp-empty-types">Nenhum equipamento disponível no momento.</p>
              )}

              {!typesLoading && !typesError && types.length > 0 && (
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
                      {t.description && <span className="rp-type-desc">{t.description}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 2. Quantidade (só aparece após selecionar tipo) ── */}
          {typeSelected && (
            <div className="rp-card rp-card-reveal">
              <div className="rp-card-step">2</div>
              <div className="rp-card-body">
                <h2 className="rp-card-title">Quantos {selectedType?.name.toLowerCase()}?</h2>

                <div className="rp-stepper">
                  <button
                    type="button"
                    className="rp-stepper-btn"
                    onClick={() => set('quantity', Math.max(1, form.quantity - 1))}
                    aria-label="Diminuir"
                  >
                    −
                  </button>
                  <span className="rp-stepper-value">{form.quantity}</span>
                  <button
                    type="button"
                    className="rp-stepper-btn"
                    onClick={() => set('quantity', form.quantity + 1)}
                    aria-label="Aumentar"
                  >
                    +
                  </button>
                </div>
                <p className="rp-stepper-label">
                  {form.quantity === 1 ? `1 ${selectedType?.name.replace(/s$/, '').toLowerCase()}` : `${form.quantity} ${selectedType?.name.toLowerCase()}`}
                </p>
              </div>
            </div>
          )}

          {/* ── 3. Data e Horário ── */}
          {typeSelected && (
            <div className="rp-card rp-card-reveal">
              <div className="rp-card-step">3</div>
              <div className="rp-card-body">
                <h2 className="rp-card-title">Quando será o uso?</h2>

                <div className="rp-datetime-grid">
                  <div className="rp-field">
                    <label className="rp-label">Data</label>
                    <input
                      type="date"
                      className="rp-input"
                      min={getMinDate()}
                      value={form.date}
                      onChange={(e) => { set('date', e.target.value); setAvailability(null); }}
                      required
                    />
                  </div>
                  <div className="rp-field">
                    <label className="rp-label">Início</label>
                    <input
                      type="time"
                      className="rp-input"
                      min={form.date ? getMinTime(form.date) : undefined}
                      value={form.start_time}
                      onChange={(e) => { set('start_time', e.target.value); setAvailability(null); }}
                      required
                    />
                  </div>
                  <div className="rp-field">
                    <label className="rp-label">Término</label>
                    <input
                      type="time"
                      className="rp-input"
                      min={form.start_time || undefined}
                      value={form.end_time}
                      onChange={(e) => { set('end_time', e.target.value); setAvailability(null); }}
                      required
                    />
                  </div>
                </div>

                {/* Indicador de disponibilidade */}
                {(availStatus !== 'idle' || checkingAvailability) && (
                  <div className={`rp-avail rp-avail--${availStatus}`}>
                    <span className="rp-avail-dot" />
                    <div className="rp-avail-text">
                      {availStatus === 'checking' && 'Verificando disponibilidade...'}
                      {availStatus === 'ok' && 'Horário disponível'}
                      {availStatus === 'partial' && 'Parcialmente ocupado — ainda há vagas'}
                      {availStatus === 'unavailable' && (
                        <>
                          Horário indisponível
                          {availability?.next_available && (
                            <span className="rp-avail-next"> · Próximo disponível: <strong>{availability.next_available}</strong></span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {availStatus === 'unavailable' && availability?.reason === 'buffer' && (
                  <p className="rp-avail-msg">
                    Necessário {availability.buffer_minutes}min de intervalo entre reservas para preparação e devolução.
                  </p>
                )}
                {availStatus === 'unavailable' && availability?.reason === 'conflict' && availability.remaining === 0 && (
                  <p className="rp-avail-msg">Sem equipamentos disponíveis neste horário.</p>
                )}
                {availStatus === 'unavailable' && availability?.reason === 'conflict' && (availability.remaining ?? 0) > 0 && (
                  <p className="rp-avail-msg">Apenas {availability!.remaining} disponível(is), mas você pediu {form.quantity}.</p>
                )}
              </div>
            </div>
          )}

          {/* ── 4. Local e finalidade ── */}
          {datetimeReady && (
            <div className="rp-card rp-card-reveal">
              <div className="rp-card-step">4</div>
              <div className="rp-card-body">
                <h2 className="rp-card-title">Onde e para quê?</h2>

                <div className="rp-field">
                  <label className="rp-label" htmlFor="location">Local de uso</label>
                  <input
                    id="location"
                    type="text"
                    className="rp-input"
                    placeholder="Ex: Laboratório de Informática — Bloco B"
                    value={form.location}
                    onChange={(e) => set('location', e.target.value)}
                    required
                  />
                </div>

                <div className="rp-field" style={{ marginTop: 16 }}>
                  <label className="rp-label" htmlFor="purpose">Finalidade</label>
                  <textarea
                    id="purpose"
                    className="rp-input rp-textarea"
                    placeholder="Ex: Aula de informática para turma do 9º ano"
                    value={form.purpose}
                    onChange={(e) => set('purpose', e.target.value)}
                    rows={3}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── 5. Dados do solicitante ── */}
          {datetimeReady && (
            <div className="rp-card rp-card-reveal">
              <div className="rp-card-step">5</div>
              <div className="rp-card-body">
                <h2 className="rp-card-title">Seus dados</h2>

                <div className="rp-field">
                  <label className="rp-label" htmlFor="requester_name">Nome completo</label>
                  <input
                    id="requester_name"
                    type="text"
                    className="rp-input"
                    placeholder="Seu nome"
                    value={form.requester_name}
                    onChange={(e) => set('requester_name', e.target.value)}
                    required
                  />
                </div>

                <div className="rp-two-col" style={{ marginTop: 16 }}>
                  <div className="rp-field">
                    <label className="rp-label" htmlFor="requester_email">E-mail</label>
                    <input
                      id="requester_email"
                      type="email"
                      className="rp-input"
                      placeholder="seu@email.com"
                      value={form.requester_email}
                      onChange={(e) => set('requester_email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="rp-field">
                    <label className="rp-label" htmlFor="requester_phone">Telefone <span className="rp-optional">(opcional)</span></label>
                    <input
                      id="requester_phone"
                      type="tel"
                      className="rp-input"
                      placeholder="(00) 00000-0000"
                      value={form.requester_phone}
                      onChange={(e) => set('requester_phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Resumo + Envio ── */}
          {datetimeReady && (
            <div className="rp-card-reveal">
              {error && (
                <div className="rp-error-banner">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button
                type="submit"
                className="rp-btn-submit"
                disabled={submitting || availStatus === 'unavailable' || availStatus === 'checking'}
              >
                {submitting ? (
                  <><span className="rp-spinner" /> Processando...</>
                ) : (
                  'Confirmar Reserva'
                )}
              </button>

              <p className="rp-submit-note">
                Você receberá a confirmação por e-mail imediatamente após a reserva.
              </p>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
