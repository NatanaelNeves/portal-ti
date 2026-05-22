import { useState, useEffect, useCallback } from 'react';
import { reservationService, AvailabilityResult, Reservation } from '../services/reservationService';
import '../styles/ReservationPublicPage.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMinDate(): string {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0];
}

function getMinTime(date: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sel = new Date(date + 'T00:00:00');
  if (sel.getTime() === today.getTime()) {
    const m = new Date(Date.now() + 30 * 60 * 1000);
    return `${String(m.getHours()).padStart(2, '0')}:${String(m.getMinutes()).padStart(2, '0')}`;
  }
  return '00:00';
}

function toDateOnly(d: string | Date): string {
  if (d instanceof Date) return d.toISOString().substring(0, 10);
  return String(d).substring(0, 10);
}

function fmtDateShort(d: string | Date): string {
  if (!d) return '—';
  const s = toDateOnly(d);
  const dt = new Date(s + 'T12:00:00');
  if (isNaN(dt.getTime())) return s;
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}


function fmtTime(t: string): string {
  return String(t).substring(0, 5);
}

function isPast(date: string | Date, endTime: string): boolean {
  const dt = new Date(`${toDateOnly(date)}T${fmtTime(endTime)}:00`);
  return dt < new Date();
}

// ── Sub-components: Wizard ────────────────────────────────────────────────────

const STEPS = ['Quantidade', 'Horário', 'Detalhes', 'Confirmar'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="rp-steps">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className={`rp-step ${done ? 'done' : active ? 'active' : ''}`}>
            <div className="rp-step-circle">{done ? '✓' : n}</div>
            <span className="rp-step-label">{label}</span>
            {i < STEPS.length - 1 && <div className="rp-step-line" />}
          </div>
        );
      })}
    </div>
  );
}

interface ScheduleSlot { start: string; end: string; quantity: number }

function DayTimeline({ slots, poolSize, selStart, selEnd }: {
  slots: ScheduleSlot[]; poolSize: number; selStart: string; selEnd: string;
}) {
  const S = 7, E = 21, R = E - S;
  const pct = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return Math.max(0, Math.min(100, ((h + m / 60 - S) / R) * 100));
  };
  return (
    <div className="rp-timeline">
      <div className="rp-timeline-track">
        {slots.map((s, i) => {
          const l = pct(s.start), w = pct(s.end) - l;
          if (w <= 0) return null;
          return (
            <div key={i} className="rp-tl-block"
              style={{ left: `${l}%`, width: `${w}%`, opacity: 0.35 + Math.min(0.55, s.quantity / poolSize) }}
              title={`${s.start}–${s.end}: ${s.quantity} reservado(s)`}
            />
          );
        })}
        {selStart && selEnd && pct(selEnd) > pct(selStart) && (
          <div className="rp-tl-sel" style={{ left: `${pct(selStart)}%`, width: `${pct(selEnd) - pct(selStart)}%` }} />
        )}
      </div>
      <div className="rp-timeline-hours">
        {[8, 10, 12, 14, 16, 18, 20].map(h => (
          <span key={h} style={{ left: `${((h - S) / R) * 100}%` }}>{h}h</span>
        ))}
      </div>
      <div className="rp-timeline-legend">
        <span className="rp-tl-dot rp-tl-dot--occ" /> <span>Ocupado</span>
        {selStart && selEnd && <><span className="rp-tl-dot rp-tl-dot--sel" /> <span>Seu horário</span></>}
      </div>
    </div>
  );
}

function CapacityBar({ remaining, total }: { remaining: number; total: number }) {
  if (!total) return null;
  const usedPct = Math.round(((total - remaining) / total) * 100);
  const status = remaining === 0 ? 'full' : remaining <= Math.ceil(total * 0.3) ? 'low' : 'ok';
  return (
    <div className="rp-capbar">
      <div className="rp-capbar-track">
        <div className="rp-capbar-fill" data-s={status} style={{ width: `${usedPct}%` }} />
      </div>
      <span className="rp-capbar-label" data-s={status}>
        {remaining === total ? `${total} disponíveis`
          : remaining === 0 ? 'Sem disponibilidade'
          : `${remaining} de ${total} disponíveis`}
      </span>
    </div>
  );
}

interface SidebarProps {
  quantity: number; date: string; startTime: string; endTime: string;
  location: string; name: string; avail: string;
  onSubmit: () => void; submitting: boolean; canSubmit: boolean;
}
function SummarySidebar({ quantity, date, startTime, endTime, location, name, avail, onSubmit, submitting, canSubmit }: SidebarProps) {
  const hasTime = date && startTime && endTime;
  return (
    <aside className="rp-sidebar">
      <h3 className="rp-sidebar-title">Resumo</h3>
      <div className="rp-sidebar-rows">
        <div className="rp-sb-row">
          <span className="rp-sb-icon">💻</span>
          <span className="rp-sb-val">{quantity} notebook{quantity !== 1 ? 's' : ''}</span>
        </div>
        <div className={`rp-sb-row ${!date ? 'rp-sb-row--empty' : ''}`}>
          <span className="rp-sb-icon">📅</span>
          <span className="rp-sb-val">{date ? fmtDateShort(date) : '—'}</span>
        </div>
        <div className={`rp-sb-row ${!hasTime ? 'rp-sb-row--empty' : ''}`}>
          <span className="rp-sb-icon">🕐</span>
          <span className="rp-sb-val">{hasTime ? `${startTime.substring(0,5)} → ${endTime.substring(0,5)}` : '—'}</span>
        </div>
        <div className={`rp-sb-row ${!location ? 'rp-sb-row--empty' : ''}`}>
          <span className="rp-sb-icon">📍</span>
          <span className="rp-sb-val rp-sb-val--sm">{location || '—'}</span>
        </div>
        {name && (
          <div className="rp-sb-row">
            <span className="rp-sb-icon">👤</span>
            <span className="rp-sb-val rp-sb-val--sm">{name}</span>
          </div>
        )}
      </div>
      {avail === 'unavailable' && <p className="rp-sb-warn">⚠ Horário indisponível</p>}
      <button className="rp-btn-submit" onClick={onSubmit}
        disabled={!canSubmit || submitting || avail === 'unavailable' || avail === 'checking'}>
        {submitting ? <><span className="rp-spinner" /> Processando...</> : 'Confirmar Reserva'}
      </button>
      <p className="rp-submit-note">Confirmação por e-mail imediata</p>
    </aside>
  );
}

// ── Sub-component: Minhas Reservas ────────────────────────────────────────────

const PROGRESS_STEPS: Array<{ key: string; label: string }> = [
  { key: 'approved', label: 'Confirmada' },
  { key: 'ready',    label: 'Pronta' },
  { key: 'in_use',   label: 'Em uso' },
  { key: 'returned', label: 'Devolvida' },
];

const PROGRESS_STATUS_INDEX: Record<string, number> = {
  approved: 0, ready: 1, in_use: 2, returned: 3,
};

const TERMINAL_STATUSES = ['rejected', 'cancelled', 'no_show'];

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: 'Confirmada',        color: '#007A33', bg: '#f0fdf4' },
  ready:    { label: 'Pronta p/ retirar', color: '#7C3AED', bg: '#f5f3ff' },
  in_use:   { label: 'Em uso agora',      color: '#0369A1', bg: '#eff6ff' },
  returned: { label: 'Finalizada',        color: '#6B7280', bg: '#f9fafb' },
  cancelled:{ label: 'Cancelada',         color: '#6B7280', bg: '#f9fafb' },
  rejected: { label: 'Recusada',          color: '#B91C1C', bg: '#fef2f2' },
  no_show:  { label: 'Não compareceu',    color: '#EA580C', bg: '#fff7ed' },
  pending:  { label: 'Pendente',          color: '#D97706', bg: '#fffbeb' },
};

function relativeTime(date: string | Date, startTime: string, endTime: string): string {
  const ds = toDateOnly(date);
  const now = new Date();
  const start = new Date(`${ds}T${fmtTime(startTime)}:00`);
  const end   = new Date(`${ds}T${fmtTime(endTime)}:00`);

  if (now >= start && now < end) return 'acontecendo agora';

  if (now < start) {
    const diffMs = start.getTime() - now.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `em ${mins} min`;
    const hours = Math.floor(diffMs / 3600000);
    const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
    const startDay = new Date(ds + 'T00:00:00'); startDay.setHours(0, 0, 0, 0);
    if (startDay.getTime() === todayMid.getTime()) return `hoje às ${fmtTime(startTime)}`;
    if (startDay.getTime() === todayMid.getTime() + 86400000) return `amanhã às ${fmtTime(startTime)}`;
    if (hours < 24) return `em ${hours}h`;
    const days = Math.floor(diffMs / 86400000);
    return `em ${days} dias`;
  }

  const diffMs = now.getTime() - end.getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return 'terminou agora';
  if (hours < 24) return `terminou há ${hours}h`;
  const days = Math.floor(diffMs / 86400000);
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}

function isActiveNow(date: string | Date, startTime: string, endTime: string): boolean {
  const ds = toDateOnly(date);
  const now = new Date();
  return now >= new Date(`${ds}T${fmtTime(startTime)}:00`) && now < new Date(`${ds}T${fmtTime(endTime)}:00`);
}

function ReservationMiniTimeline({ status }: { status: string }) {
  if (TERMINAL_STATUSES.includes(status)) return null;
  const currentIdx = PROGRESS_STATUS_INDEX[status] ?? -1;
  return (
    <div className="rp-mini-tl">
      {PROGRESS_STEPS.map((s, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.key} className="rp-mini-tl-step">
            <div className={`rp-mini-tl-dot ${done ? 'done' : active ? 'active' : ''}`}>
              {done && <svg viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span className={`rp-mini-tl-lbl ${active ? 'active' : done ? 'done' : ''}`}>{s.label}</span>
            {i < PROGRESS_STEPS.length - 1 && <div className={`rp-mini-tl-line ${done ? 'done' : active ? 'half' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}

interface MyReservationsTabProps {
  prefillEmail?: string;
  successNumber?: string;
  onClearSuccess: () => void;
}

function MyReservationsTab({ prefillEmail, successNumber, onClearSuccess }: MyReservationsTabProps) {
  const [email, setEmail] = useState(prefillEmail ?? '');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState('');
  const [cancellingToken, setCancellingToken] = useState<string | null>(null);
  const [cancelConfirmToken, setCancelConfirmToken] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState('');

  const search = useCallback(async () => {
    if (!email.trim() || !email.includes('@')) { setError('Informe um e-mail válido.'); return; }
    setLoading(true); setError('');
    try {
      const data = await reservationService.getByEmail(email.trim());
      setReservations(data);
      setSearched(true);
    } catch {
      setError('Erro ao buscar reservas. Tente novamente.');
    } finally { setLoading(false); }
  }, [email]);

  // Auto-search when we have a prefill email (after form submit)
  useEffect(() => {
    if (prefillEmail && prefillEmail.includes('@')) {
      search();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    if (!cancelConfirmToken) return;
    const token = cancelConfirmToken;
    setCancelConfirmToken(null);
    setCancellingToken(token);
    setCancelError('');
    try {
      await reservationService.cancelByToken(token);
      setReservations(prev => prev.map(r =>
        r.access_token === token ? { ...r, status: 'cancelled' } : r
      ));
    } catch {
      setCancelError('Não foi possível cancelar. Tente novamente.');
    } finally { setCancellingToken(null); }
  };

  const nowActive = reservations.filter(r => isActiveNow(r.date, r.start_time, r.end_time));
  const upcoming  = reservations.filter(r => !isPast(r.date, r.end_time) && !TERMINAL_STATUSES.includes(r.status) && !isActiveNow(r.date, r.start_time, r.end_time));
  const past      = reservations.filter(r => isPast(r.date, r.end_time) || TERMINAL_STATUSES.includes(r.status));

  return (
    <div className="rp-my-tab">
      {successNumber && (
        <div className="rp-success-banner">
          <span>✅</span>
          <div>
            <strong>Reserva {successNumber} confirmada!</strong>
            <span> Veja abaixo ou aguarde o e-mail de confirmação.</span>
          </div>
          <button className="rp-success-banner-close" onClick={onClearSuccess}>×</button>
        </div>
      )}

      <div className="rp-my-search-card">
        <h2 className="rp-my-search-title">Minhas Reservas</h2>
        <p className="rp-my-search-sub">Informe seu e-mail para ver todas as suas reservas.</p>
        <form className="rp-my-search-form" onSubmit={e => { e.preventDefault(); search(); }}>
          <input
            type="email"
            className="rp-input"
            placeholder="seu@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setSearched(false); onClearSuccess(); }}
            required
          />
          <button type="submit" className="rp-btn-search" disabled={loading}>
            {loading ? <span className="rp-spinner rp-spinner--dark" /> : 'Buscar'}
          </button>
        </form>
        {error && <p className="rp-my-error">{error}</p>}
      </div>

      {loading && (
        <div className="rp-my-results">
          {[1,2].map(i => <div key={i} className="rp-res-skeleton" />)}
        </div>
      )}

      {cancelError && <p className="rp-my-error">{cancelError}</p>}

      {cancelConfirmToken && (
        <div className="rp-overlay" onClick={() => setCancelConfirmToken(null)}>
          <div className="rp-modal" onClick={e => e.stopPropagation()}>
            <h3 className="rp-modal-title">Cancelar reserva?</h3>
            <p className="rp-modal-sub">Esta ação não pode ser desfeita. Sua reserva será cancelada e os equipamentos liberados para outros solicitantes.</p>
            <div className="rp-modal-actions">
              <button className="rp-modal-btn rp-modal-btn--ghost" onClick={() => setCancelConfirmToken(null)}>
                Manter reserva
              </button>
              <button className="rp-modal-btn rp-modal-btn--danger" onClick={handleCancel}>
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {searched && !loading && (
        <div className="rp-my-results">
          {reservations.length === 0 ? (
            <div className="rp-my-empty">
              <div className="rp-my-empty-icon">📭</div>
              <p>Nenhuma reserva encontrada para <strong>{email}</strong></p>
            </div>
          ) : (
            <>
              {nowActive.length > 0 && (
                <>
                  <p className="rp-my-section-label rp-my-section-label--now">🔴 Em andamento agora</p>
                  {nowActive.map(r => (
                    <ReservationCard key={r.id} reservation={r} highlightNow
                      onCancel={undefined}
                      cancelling={false} />
                  ))}
                </>
              )}
              {upcoming.length > 0 && (
                <>
                  <p className="rp-my-section-label">Próximas</p>
                  {upcoming.map(r => (
                    <ReservationCard key={r.id} reservation={r}
                      onCancel={['approved','ready'].includes(r.status) ? (token) => setCancelConfirmToken(token) : undefined}
                      cancelling={cancellingToken === r.access_token} />
                  ))}
                </>
              )}
              {past.length > 0 && (
                <>
                  <p className="rp-my-section-label rp-my-section-label--past">Histórico</p>
                  {past.map(r => (
                    <ReservationCard key={r.id} reservation={r} past
                      onCancel={undefined} cancelling={false} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReservationCard({ reservation: r, past, highlightNow, onCancel, cancelling }: {
  reservation: Reservation;
  past?: boolean;
  highlightNow?: boolean;
  onCancel?: (token: string) => void;
  cancelling?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const ds    = toDateOnly(r.date);
  const token = r.access_token ?? '';
  const badge = STATUS_BADGE[r.status] ?? { label: r.status, color: '#6B7280', bg: '#f9fafb' };
  const rel   = relativeTime(r.date, r.start_time, r.end_time);
  const isNow = highlightNow || isActiveNow(r.date, r.start_time, r.end_time);

  return (
    <div className={[
      'rp-res-card',
      past        ? 'rp-res-card--past'   : '',
      isNow       ? 'rp-res-card--now'    : '',
    ].filter(Boolean).join(' ')}>

      {/* Always-visible summary */}
      <div className="rp-res-card-summary" onClick={() => setExpanded(v => !v)}>
        <div className="rp-res-card-row1">
          <span className="rp-res-card-number">💻 {r.reservation_number}</span>
          <span className="rp-res-status-pill"
            style={{ color: badge.color, background: badge.bg, borderColor: badge.color + '40' }}>
            {badge.label}
          </span>
        </div>

        <div className="rp-res-card-row2">
          <span>📅 {fmtDateShort(ds)}</span>
          <span>⏰ {fmtTime(r.start_time)}–{fmtTime(r.end_time)}</span>
          <span>📍 {r.location}</span>
          {r.quantity > 1 && <span>×{r.quantity}</span>}
        </div>

        <div className="rp-res-card-row3">
          <ReservationMiniTimeline status={r.status} />
          <span className={`rp-res-reltime ${isNow ? 'rp-res-reltime--now' : ''}`}>{rel}</span>
        </div>
      </div>

      {/* Expand toggle */}
      <button className="rp-res-expand-btn" onClick={() => setExpanded(v => !v)}>
        {expanded ? '▲ Menos' : '▼ Detalhes e ações'}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="rp-res-card-body">
          <p className="rp-res-purpose">
            <span className="rp-res-dl">Para que vai usar</span>
            {r.purpose}
          </p>
          {r.status === 'rejected' && r.rejection_reason && (
            <p className="rp-res-rejection">
              <strong>Motivo da recusa:</strong> {r.rejection_reason}
            </p>
          )}
          <div className="rp-res-card-actions">
            {token && (
              <a href={reservationService.getICSUrlByToken(token)}
                className="rp-res-action-link" download>
                📅 Adicionar ao calendário
              </a>
            )}
            {onCancel && token && (
              <button className="rp-res-cancel-link"
                onClick={() => onCancel(token)} disabled={cancelling}>
                {cancelling ? 'Cancelando…' : 'Cancelar reserva'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReservationPublicPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'my'>('new');

  // Form state
  const [step, setStep] = useState(1);
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

  // After success: switch to "my" tab and show banner
  const [successBanner, setSuccessBanner] = useState<{ number: string; forEmail: string } | null>(null);

  const [stats, setStats] = useState<{ pool_size: number; active_now: number; today_total: number } | null>(null);
  const [schedule, setSchedule] = useState<{ slots: ScheduleSlot[]; pool_size: number } | null>(null);

  useEffect(() => { reservationService.getStats().then(setStats).catch(() => {}); }, []);

  useEffect(() => {
    if (!date) return;
    setSchedule(null);
    reservationService.getSchedule(date).then(setSchedule).catch(() => {});
  }, [date]);

  const checkAvailability = useCallback(async () => {
    if (!date || !startTime || !endTime || startTime >= endTime) return;
    setChecking(true);
    try {
      const r = await reservationService.checkAvailability(null, date, startTime, endTime, quantity);
      setAvailability(r);
    } catch { setAvailability(null); }
    finally { setChecking(false); }
  }, [date, startTime, endTime, quantity]);

  useEffect(() => {
    const t = setTimeout(checkAvailability, 500);
    return () => clearTimeout(t);
  }, [checkAvailability]);

  const avail: 'idle' | 'checking' | 'ok' | 'partial' | 'unavailable' =
    checking ? 'checking'
    : !availability ? 'idle'
    : !availability.available ? 'unavailable'
    : availability.capacity_status === 'partial' ? 'partial'
    : 'ok';

  const poolSize = stats?.pool_size ?? schedule?.pool_size ?? 20;

  const step2Valid = !!date && !!startTime && !!endTime && startTime < endTime
    && avail !== 'unavailable' && avail !== 'checking';
  const step3Valid = !!location.trim() && !!purpose.trim() && !!name.trim()
    && !!email.trim() && email.includes('@');
  const allValid = step2Valid && step3Valid;

  const canGoNext = step === 1 || (step === 2 && step2Valid) || (step === 3 && step3Valid);

  const handleSubmit = async () => {
    if (avail === 'unavailable') { setError('Horário indisponível.'); return; }
    setSubmitting(true); setError('');
    try {
      const r = await reservationService.createPublic({
        quantity, date, start_time: startTime, end_time: endTime,
        location, purpose, requester_name: name, requester_email: email, requester_phone: phone,
      });
      // Switch to "Minhas Reservas" tab and show success banner
      setSuccessBanner({ number: r.reservation_number, forEmail: email });
      setActiveTab('my');
      // Reset form
      setStep(1); setQuantity(1); setDate(''); setStartTime(''); setEndTime('');
      setLocation(''); setPurpose(''); setName(''); setPhone('');
      setAvailability(null); setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Erro ao criar reserva.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="rp-page">
      {/* Hero */}
      <div className="rp-hero">
        <div className="rp-hero-inner">
          <div className="rp-hero-text">
            <div className="rp-hero-icon">💻</div>
            <h1>Reservas de Notebooks</h1>
            <p>Para aulas, treinamentos e eventos internos</p>
          </div>
          {stats && (
            <div className="rp-hero-stats">
              <div className="rp-hero-stat">
                <span className="rp-hero-stat-val">{stats.pool_size}</span>
                <span className="rp-hero-stat-lbl">no acervo</span>
              </div>
              <div className="rp-hero-stat-div" />
              <div className="rp-hero-stat">
                <span className="rp-hero-stat-val">{stats.active_now}</span>
                <span className="rp-hero-stat-lbl">em uso agora</span>
              </div>
              <div className="rp-hero-stat-div" />
              <div className="rp-hero-stat">
                <span className="rp-hero-stat-val">{stats.today_total}</span>
                <span className="rp-hero-stat-lbl">reservas hoje</span>
              </div>
            </div>
          )}
        </div>

        {/* Tab bar inside hero */}
        <div className="rp-tabs">
          <div className="rp-tabs-inner">
            <button
              className={`rp-tab ${activeTab === 'new' ? 'active' : ''}`}
              onClick={() => setActiveTab('new')}
            >
              Nova Reserva
            </button>
            <button
              className={`rp-tab ${activeTab === 'my' ? 'active' : ''}`}
              onClick={() => setActiveTab('my')}
            >
              Minhas Reservas
            </button>
          </div>
        </div>
      </div>

      <div className="rp-container">

        {/* ── Tab: Nova Reserva ── */}
        {activeTab === 'new' && (
          <>
            <StepIndicator current={step} />

            <div className="rp-layout">
              <div className="rp-main">

                {/* Step 1 — Quantidade */}
                {step === 1 && (
                  <div className="rp-card rp-card--anim">
                    <div className="rp-card-body">
                      <h2 className="rp-card-title">Quantos notebooks você precisa?</h2>
                      <div className="rp-qty">
                        <button type="button" className="rp-qty-btn"
                          onClick={() => { setQuantity(q => Math.max(1, q - 1)); setAvailability(null); }}
                          disabled={quantity <= 1}>−</button>
                        <div className="rp-qty-display">
                          <span className="rp-qty-num">{quantity}</span>
                          <span className="rp-qty-unit">notebook{quantity !== 1 ? 's' : ''}</span>
                        </div>
                        <button type="button" className="rp-qty-btn"
                          onClick={() => { setQuantity(q => Math.min(poolSize, q + 1)); setAvailability(null); }}
                          disabled={quantity >= poolSize}>+</button>
                      </div>

                      <div className="rp-qty-presets">
                        {[5, 10, 15, 20, 25, 30].filter(n => n <= poolSize).slice(0, 5).map(n => (
                          <button key={n} type="button"
                            className={`rp-qty-preset ${quantity === n ? 'active' : ''}`}
                            onClick={() => { setQuantity(n); setAvailability(null); }}>
                            {n}
                          </button>
                        ))}
                      </div>

                      <div className="rp-pool-bar">
                        <div className="rp-pool-bar-track">
                          <div className="rp-pool-bar-fill" style={{ width: `${(quantity / poolSize) * 100}%` }} />
                        </div>
                        <span className="rp-pool-bar-label">Você pediu {quantity} de {poolSize} notebooks disponíveis</span>
                      </div>
                      <p className="rp-hint">A disponibilidade será verificada quando você escolher o horário.</p>
                    </div>
                  </div>
                )}

                {/* Step 2 — Horário */}
                {step === 2 && (
                  <div className="rp-card rp-card--anim">
                    <div className="rp-card-body">
                      <h2 className="rp-card-title">Quando você precisa?</h2>
                      <div className="rp-datetime-grid">
                        <div className="rp-field">
                          <label className="rp-label">Data</label>
                          <input type="date" className="rp-input" min={getMinDate()} value={date}
                            onChange={e => { setDate(e.target.value); setAvailability(null); }} required />
                        </div>
                        <div className="rp-field">
                          <label className="rp-label">Início</label>
                          <input type="time" className="rp-input"
                            min={date ? getMinTime(date) : undefined} value={startTime}
                            onChange={e => { setStartTime(e.target.value); setAvailability(null); }} required />
                        </div>
                        <div className="rp-field">
                          <label className="rp-label">Término</label>
                          <input type="time" className="rp-input"
                            min={startTime || undefined} value={endTime}
                            onChange={e => { setEndTime(e.target.value); setAvailability(null); }} required />
                        </div>
                      </div>

                      {avail !== 'idle' && (
                        <div className={`rp-avail rp-avail--${avail}`}>
                          <span className="rp-avail-dot" />
                          <div className="rp-avail-body">
                            <span className="rp-avail-text">
                              {avail === 'checking' && 'Verificando disponibilidade…'}
                              {avail === 'ok' && `✓ Disponível — ${availability?.remaining} notebooks livres neste período`}
                              {avail === 'partial' && `⚠ Restam apenas ${availability?.remaining} notebook${(availability?.remaining ?? 0) !== 1 ? 's' : ''} neste horário`}
                              {avail === 'unavailable' && (
                                <>✗ Sem disponibilidade para {quantity} notebook{quantity !== 1 ? 's' : ''} neste horário
                                  {availability?.next_available && <> · Próximo: <strong>{availability.next_available}</strong></>}
                                </>
                              )}
                            </span>
                            {(avail === 'ok' || avail === 'partial') && availability && (
                              <CapacityBar remaining={availability.remaining} total={poolSize} />
                            )}
                          </div>
                        </div>
                      )}

                      {date && schedule && schedule.slots.length > 0 && (
                        <div className="rp-timeline-wrap">
                          <p className="rp-timeline-title">Ocupação do dia</p>
                          <DayTimeline slots={schedule.slots} poolSize={schedule.pool_size}
                            selStart={startTime} selEnd={endTime} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3 — Detalhes */}
                {step === 3 && (
                  <div className="rp-card rp-card--anim">
                    <div className="rp-card-body">
                      <h2 className="rp-card-title">Onde vai usar e para quê?</h2>
                      <div className="rp-field">
                        <label className="rp-label">Local de uso</label>
                        <input type="text" className="rp-input" placeholder="Ex: Sala 12 — Bloco B"
                          value={location} onChange={e => setLocation(e.target.value)} required />
                      </div>
                      <div className="rp-field" style={{ marginTop: 16 }}>
                        <label className="rp-label">Para que vai usar?</label>
                        <textarea className="rp-input rp-textarea" rows={2}
                          placeholder="Ex: Aula de informática para turma do 9º ano"
                          value={purpose} onChange={e => setPurpose(e.target.value)} required />
                      </div>

                      <div className="rp-divider"><span>Seus dados de contato</span></div>

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
                )}

                {/* Step 4 — Confirmar */}
                {step === 4 && (
                  <div className="rp-card rp-card--anim">
                    <div className="rp-card-body">
                      <h2 className="rp-card-title">Revise e confirme</h2>
                      <div className="rp-review">
                        {[
                          { icon: '💻', label: 'Notebooks', val: `${quantity} notebook${quantity !== 1 ? 's' : ''}`, editStep: 1 },
                          { icon: '📅', label: 'Data e Horário', val: `${fmtDateShort(date)} · ${startTime.substring(0,5)}–${endTime.substring(0,5)}`, editStep: 2 },
                          { icon: '📍', label: 'Local', val: location, editStep: 3 },
                          { icon: '🎯', label: 'Para que vai usar', val: purpose, editStep: 3 },
                          { icon: '👤', label: 'Quem está pedindo', val: `${name} · ${email}`, editStep: 3 },
                        ].map(({ icon, label, val, editStep }) => (
                          <div key={label} className="rp-review-row">
                            <span className="rp-review-icon">{icon}</span>
                            <div className="rp-review-text">
                              <span className="rp-review-label">{label}</span>
                              <span className="rp-review-val">{val}</span>
                            </div>
                            {editStep && (
                              <button className="rp-review-edit" onClick={() => setStep(editStep)}>Editar</button>
                            )}
                          </div>
                        ))}
                      </div>

                      {avail !== 'idle' && (
                        <div className={`rp-avail rp-avail--${avail}`} style={{ marginTop: 16 }}>
                          <span className="rp-avail-dot" />
                          <span className="rp-avail-text">
                            {avail === 'ok' && `✓ ${availability?.remaining} notebooks disponíveis`}
                            {avail === 'partial' && `⚠ Restam ${availability?.remaining} notebooks`}
                            {avail === 'checking' && 'Verificando…'}
                            {avail === 'unavailable' && '✗ Horário indisponível'}
                          </span>
                        </div>
                      )}

                      {error && <div className="rp-error-banner"><span>⚠️</span> {error}</div>}

                      <div className="rp-mobile-submit">
                        <button type="button" className="rp-btn-submit" onClick={handleSubmit}
                          disabled={submitting || avail === 'unavailable' || avail === 'checking'}>
                          {submitting ? <><span className="rp-spinner" /> Processando…</> : 'Confirmar Reserva'}
                        </button>
                        <p className="rp-submit-note">Confirmação por e-mail imediata</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step navigation */}
                <div className="rp-step-nav">
                  {step > 1 && (
                    <button type="button" className="rp-nav-back" onClick={() => setStep(s => s - 1)}>
                      ← Anterior
                    </button>
                  )}
                  {step < 4 && (
                    <button type="button" className="rp-nav-next" onClick={() => setStep(s => s + 1)}
                      disabled={!canGoNext}>
                      Próximo →
                    </button>
                  )}
                </div>
              </div>

              <SummarySidebar
                quantity={quantity} date={date} startTime={startTime} endTime={endTime}
                location={location} name={name} avail={avail}
                onSubmit={handleSubmit} submitting={submitting}
                canSubmit={allValid}
              />
            </div>
          </>
        )}

        {/* ── Tab: Minhas Reservas ── */}
        {activeTab === 'my' && (
          <MyReservationsTab
            prefillEmail={successBanner?.forEmail ?? email}
            successNumber={successBanner?.number}
            onClearSuccess={() => setSuccessBanner(null)}
          />
        )}
      </div>
    </div>
  );
}
