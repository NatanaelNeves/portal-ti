import { useState, useEffect, useCallback } from 'react';
import { reservationService, AvailabilityResult } from '../services/reservationService';
import '../styles/ReservationPublicPage.css';

function getMinDate(): string {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0];
}

function getMinTime(date: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(date + 'T00:00:00');
  if (selected.getTime() === today.getTime()) {
    const m = new Date(Date.now() + 30 * 60 * 1000);
    return `${String(m.getHours()).padStart(2, '0')}:${String(m.getMinutes()).padStart(2, '0')}`;
  }
  return '00:00';
}

export default function ReservationPublicPage() {
  const [typeId, setTypeId] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState(false);
  const [loadingType, setLoadingType] = useState(true);

  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ number: string; token: string } | null>(null);

  // Carrega o tipo "Notebooks" silenciosamente no background
  const loadType = () => {
    setLoadingType(true);
    setServiceError(false);
    reservationService.getTypes()
      .then((types) => {
        if (types.length === 0) { setServiceError(true); return; }
        setTypeId(types[0].id);
      })
      .catch(() => setServiceError(true))
      .finally(() => setLoadingType(false));
  };

  useEffect(() => { loadType(); }, []);

  const checkAvailability = useCallback(async () => {
    if (!typeId || !date || !startTime || !endTime || startTime >= endTime) return;
    setChecking(true);
    try {
      const r = await reservationService.checkAvailability(typeId, date, startTime, endTime, quantity);
      setAvailability(r);
    } catch {
      setAvailability(null);
    } finally {
      setChecking(false);
    }
  }, [typeId, date, startTime, endTime, quantity]);

  useEffect(() => {
    const t = setTimeout(checkAvailability, 500);
    return () => clearTimeout(t);
  }, [checkAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeId) { setError('Serviço temporariamente indisponível. Tente novamente.'); return; }
    if (availability && !availability.available) { setError('Horário indisponível.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const r = await reservationService.createPublic({
        equipment_type_id: typeId,
        quantity,
        date,
        start_time: startTime,
        end_time: endTime,
        location,
        purpose,
        requester_name: name,
        requester_email: email,
        requester_phone: phone,
      });
      setSuccess({ number: r.reservation_number, token: r.access_token });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Erro ao criar reserva. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const avail: 'idle' | 'checking' | 'ok' | 'partial' | 'unavailable' =
    checking ? 'checking'
    : !availability ? 'idle'
    : !availability.available ? 'unavailable'
    : availability.capacity_status === 'partial' ? 'partial'
    : 'ok';

  // ── Serviço indisponível ──────────────────────────────────────────
  if (!loadingType && serviceError) {
    return (
      <div className="rp-page">
        <div className="rp-hero">
          <div className="rp-hero-icon">💻</div>
          <h1>Reservar Notebooks</h1>
        </div>
        <div className="rp-container" style={{ paddingTop: 32 }}>
          <div className="rp-service-error">
            <span>⚠️</span>
            <h3>Serviço temporariamente indisponível</h3>
            <p>Não foi possível conectar ao sistema de reservas. Aguarde alguns instantes.</p>
            <button className="rp-btn-primary" onClick={loadType}>Tentar novamente</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Sucesso ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="rp-page">
        <div className="rp-hero">
          <div className="rp-hero-icon">💻</div>
          <h1>Reservar Notebooks</h1>
        </div>
        <div className="rp-container" style={{ paddingTop: 32 }}>
          <div className="rp-success-card">
            <div className="rp-success-check">✅</div>
            <h2>Reserva Confirmada!</h2>
            <div className="rp-success-number">{success.number}</div>
            <p>Você receberá a confirmação no e-mail com todos os detalhes.</p>
            <div className="rp-success-btns">
              <a href={`/reservar/acompanhar/${success.token}`} className="rp-btn-primary">
                Acompanhar reserva
              </a>
              <a
                href={`${import.meta.env.VITE_API_URL || ''}/api/reservations/public/${success.token}/ics`}
                className="rp-btn-outline"
                download
              >
                📅 Adicionar ao Calendário
              </a>
            </div>
            <button className="rp-link-btn" onClick={() => {
              setSuccess(null); setQuantity(1); setDate(''); setStartTime('');
              setEndTime(''); setLocation(''); setPurpose('');
              setName(''); setEmail(''); setPhone(''); setAvailability(null);
            }}>
              Fazer outra reserva
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulário ────────────────────────────────────────────────────
  return (
    <div className="rp-page">
      <div className="rp-hero">
        <div className="rp-hero-icon">💻</div>
        <h1>Reservar Notebooks</h1>
        <p>Para aulas, treinamentos e eventos internos</p>
      </div>

      <div className="rp-container">
        <form className="rp-form" onSubmit={handleSubmit} noValidate>

          {/* Quantidade */}
          <div className="rp-card">
            <div className="rp-card-body">
              <h2 className="rp-card-title">Quantos notebooks?</h2>
              <div className="rp-stepper">
                <button type="button" className="rp-stepper-btn"
                  onClick={() => { setQuantity(q => Math.max(1, q - 1)); setAvailability(null); }}>−</button>
                <span className="rp-stepper-value">{quantity}</span>
                <button type="button" className="rp-stepper-btn"
                  onClick={() => { setQuantity(q => q + 1); setAvailability(null); }}>+</button>
              </div>
              <p className="rp-stepper-label">{quantity === 1 ? '1 notebook' : `${quantity} notebooks`}</p>
            </div>
          </div>

          {/* Data e Horário */}
          <div className="rp-card">
            <div className="rp-card-body">
              <h2 className="rp-card-title">Quando?</h2>
              <div className="rp-datetime-grid">
                <div className="rp-field">
                  <label className="rp-label">Data</label>
                  <input type="date" className="rp-input" min={getMinDate()} value={date}
                    onChange={e => { setDate(e.target.value); setAvailability(null); }} required />
                </div>
                <div className="rp-field">
                  <label className="rp-label">Início</label>
                  <input type="time" className="rp-input"
                    min={date ? getMinTime(date) : undefined}
                    value={startTime}
                    onChange={e => { setStartTime(e.target.value); setAvailability(null); }} required />
                </div>
                <div className="rp-field">
                  <label className="rp-label">Término</label>
                  <input type="time" className="rp-input"
                    min={startTime || undefined}
                    value={endTime}
                    onChange={e => { setEndTime(e.target.value); setAvailability(null); }} required />
                </div>
              </div>

              {avail !== 'idle' && (
                <div className={`rp-avail rp-avail--${avail}`}>
                  <span className="rp-avail-dot" />
                  <span className="rp-avail-text">
                    {avail === 'checking' && 'Verificando disponibilidade...'}
                    {avail === 'ok' && 'Horário disponível ✓'}
                    {avail === 'partial' && 'Disponível — poucas vagas'}
                    {avail === 'unavailable' && (
                      <>
                        Horário indisponível
                        {availability?.next_available && (
                          <> · Próximo disponível: <strong>{availability.next_available}</strong></>
                        )}
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Local e Finalidade */}
          <div className="rp-card">
            <div className="rp-card-body">
              <h2 className="rp-card-title">Onde e para quê?</h2>
              <div className="rp-field">
                <label className="rp-label">Local de uso</label>
                <input type="text" className="rp-input"
                  placeholder="Ex: Sala 12 — Bloco B"
                  value={location} onChange={e => setLocation(e.target.value)} required />
              </div>
              <div className="rp-field" style={{ marginTop: 14 }}>
                <label className="rp-label">Finalidade</label>
                <textarea className="rp-input rp-textarea" rows={2}
                  placeholder="Ex: Aula de informática para turma do 9º ano"
                  value={purpose} onChange={e => setPurpose(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Dados do solicitante */}
          <div className="rp-card">
            <div className="rp-card-body">
              <h2 className="rp-card-title">Seus dados</h2>
              <div className="rp-field">
                <label className="rp-label">Nome completo</label>
                <input type="text" className="rp-input" placeholder="Seu nome"
                  value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="rp-two-col" style={{ marginTop: 14 }}>
                <div className="rp-field">
                  <label className="rp-label">E-mail</label>
                  <input type="email" className="rp-input" placeholder="seu@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="rp-field">
                  <label className="rp-label">Telefone <span className="rp-optional">(opcional)</span></label>
                  <input type="tel" className="rp-input" placeholder="(00) 00000-0000"
                    value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rp-error-banner"><span>⚠️</span> {error}</div>
          )}

          <button
            type="submit"
            className="rp-btn-submit"
            disabled={submitting || loadingType || avail === 'unavailable' || avail === 'checking'}
          >
            {submitting ? <><span className="rp-spinner" /> Processando...</> : 'Confirmar Reserva'}
          </button>
          <p className="rp-submit-note">Você receberá a confirmação por e-mail imediatamente.</p>

        </form>
      </div>
    </div>
  );
}
