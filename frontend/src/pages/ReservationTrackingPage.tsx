import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { reservationService, Reservation, STATUS_LABELS, STATUS_COLORS } from '../services/reservationService';
import '../styles/ReservationTrackingPage.css';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Detalhe de uma reserva (via token) ──────────────────────────────────────
function ReservationDetail({ token }: { token: string }) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reservationService
      .getByToken(token)
      .then(setReservation)
      .catch(() => setError('Reserva não encontrada. Verifique o link.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="tracking-container">
        <div className="tracking-skeleton" />
        <div className="tracking-skeleton tracking-skeleton-sm" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="tracking-container tracking-error">
        <span className="tracking-error-icon">❌</span>
        <p>{error || 'Reserva não encontrada'}</p>
        <a href="/reservar/acompanhar" className="btn-track-ghost" style={{ marginBottom: 8 }}>
          ← Buscar por e-mail
        </a>
        <a href="/reservar" className="btn-track-primary">Fazer nova reserva</a>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[reservation.status] || '#6B7280';
  const statusLabel = STATUS_LABELS[reservation.status] || reservation.status;

  const statusSteps = [
    { key: 'approved', label: 'Confirmada' },
    { key: 'ready', label: 'Pronta' },
    { key: 'in_use', label: 'Em Uso' },
    { key: 'returned', label: 'Devolvida' },
  ];

  const activeStepIndex = statusSteps.findIndex((s) => s.key === reservation.status);
  const isCancelled = ['cancelled', 'rejected', 'no_show'].includes(reservation.status);

  return (
    <div className="tracking-container">
      <header className="tracking-header">
        <a href="/reservar/acompanhar" className="tracking-back-link">← Minhas reservas</a>
        <h1>Acompanhar Reserva</h1>
        <p className="tracking-number">{reservation.reservation_number}</p>
      </header>

      <div className="tracking-status-card" style={{ borderColor: statusColor }}>
        <span className="tracking-status-dot" style={{ background: statusColor }} />
        <span className="tracking-status-label" style={{ color: statusColor }}>{statusLabel}</span>
      </div>

      {reservation.rejection_reason && (
        <div className="tracking-rejection">
          <strong>Motivo da recusa:</strong> {reservation.rejection_reason}
        </div>
      )}

      {!isCancelled && (
        <div className="tracking-steps">
          {statusSteps.map((step, i) => (
            <div key={step.key} className={`tracking-step ${i <= activeStepIndex ? 'done' : ''}`}>
              <div className="tracking-step-dot" />
              <span className="tracking-step-label">{step.label}</span>
              {i < statusSteps.length - 1 && <div className="tracking-step-line" />}
            </div>
          ))}
        </div>
      )}

      <div className="tracking-details">
        <div className="tracking-detail-row">
          <span className="tracking-detail-label">Equipamento</span>
          <span className="tracking-detail-value">
            {reservation.type_icon ?? '💻'} {reservation.quantity}× {reservation.type_name}
          </span>
        </div>
        <div className="tracking-detail-row">
          <span className="tracking-detail-label">Data</span>
          <span className="tracking-detail-value">{formatDate(reservation.date)}</span>
        </div>
        <div className="tracking-detail-row">
          <span className="tracking-detail-label">Horário</span>
          <span className="tracking-detail-value">
            {reservation.start_time.substring(0, 5)} – {reservation.end_time.substring(0, 5)}
          </span>
        </div>
        <div className="tracking-detail-row">
          <span className="tracking-detail-label">Local</span>
          <span className="tracking-detail-value">{reservation.location}</span>
        </div>
        <div className="tracking-detail-row">
          <span className="tracking-detail-label">Finalidade</span>
          <span className="tracking-detail-value">{reservation.purpose}</span>
        </div>
        {reservation.requester_name && (
          <div className="tracking-detail-row">
            <span className="tracking-detail-label">Solicitante</span>
            <span className="tracking-detail-value">{reservation.requester_name}</span>
          </div>
        )}
      </div>

      <div className="tracking-actions">
        <a
          href={reservationService.getICSUrlByToken(token)}
          className="btn-track-secondary"
          download
        >
          📅 Adicionar ao Calendário
        </a>
        <a href="/reservar" className="btn-track-ghost">Fazer nova reserva</a>
      </div>
    </div>
  );
}

// ── Lista por e-mail ──────────────────────────────────────────────────────────
function ReservationsByEmail() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) return;
    setLoading(true);
    setError('');
    setSubmitted(trimmed);
    try {
      const data = await reservationService.getByEmail(trimmed);
      setReservations(data);
    } catch {
      setError('Erro ao buscar reservas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const isUpcoming = (dateStr: string) => new Date(dateStr + 'T23:59:00') >= new Date();

  return (
    <div className="tracking-container tracking-container-wide">
      {/* Hero */}
      <header className="tracking-header">
        <div className="tracking-hero-icon">💻</div>
        <h1>Minhas Reservas</h1>
        <p className="tracking-hero-sub">Digite seu e-mail para ver todas as suas reservas</p>
      </header>

      {/* Busca por e-mail */}
      <form className="tracking-email-form" onSubmit={handleSearch}>
        <input
          ref={inputRef}
          type="email"
          className="tracking-email-input"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <button type="submit" className="btn-track-primary tracking-search-btn" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && <div className="tracking-alert">{error}</div>}

      {/* Resultados */}
      {submitted && !loading && (
        <div className="tracking-results">
          <p className="tracking-results-label">
            {reservations.length === 0
              ? `Nenhuma reserva encontrada para ${submitted}`
              : `${reservations.length} reserva(s) encontrada(s) para ${submitted}`}
          </p>

          {reservations.length === 0 ? (
            <div className="tracking-empty">
              <span>📋</span>
              <p>Nenhuma reserva com este e-mail ainda.</p>
            </div>
          ) : (
            <div className="tracking-list">
              {reservations.map((r) => {
                const color = STATUS_COLORS[r.status] || '#6B7280';
                const label = STATUS_LABELS[r.status] || r.status;
                const upcoming = isUpcoming(r.date);
                return (
                  <div
                    key={r.id}
                    className={`tracking-res-card ${!upcoming ? 'tracking-res-card--past' : ''}`}
                    onClick={() => r.access_token && (window.location.href = `/reservar/acompanhar/${r.access_token}`)}
                    style={{ cursor: r.access_token ? 'pointer' : 'default' }}
                  >
                    <div className="tracking-res-card-top">
                      <div className="tracking-res-card-left">
                        <span className="tracking-res-number">{r.reservation_number}</span>
                        <span
                          className="tracking-res-status"
                          style={{ background: color + '20', color, borderColor: color }}
                        >
                          {label}
                        </span>
                      </div>
                      {r.access_token && (
                        <a
                          href={`/reservar/acompanhar/${r.access_token}`}
                          className="tracking-res-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver detalhes →
                        </a>
                      )}
                    </div>

                    <div className="tracking-res-card-body">
                      <span>{r.type_icon ?? '💻'} {r.quantity}× {r.type_name}</span>
                      <span>📅 {formatDateShort(r.date)}</span>
                      <span>🕐 {r.start_time.substring(0, 5)} – {r.end_time.substring(0, 5)}</span>
                      <span>📍 {r.location}</span>
                    </div>

                    {r.purpose && (
                      <p className="tracking-res-purpose">{r.purpose}</p>
                    )}
                    {r.rejection_reason && (
                      <p className="tracking-res-rejection">Recusada: {r.rejection_reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="tracking-actions" style={{ marginTop: submitted ? 16 : 32 }}>
        <a href="/reservar" className="btn-track-ghost">+ Fazer nova reserva</a>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ReservationTrackingPage() {
  const { token } = useParams<{ token?: string }>();

  return (
    <div className="tracking-page">
      {token ? <ReservationDetail token={token} /> : <ReservationsByEmail />}
    </div>
  );
}
