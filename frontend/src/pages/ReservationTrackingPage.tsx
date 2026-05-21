import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { reservationService, Reservation, STATUS_LABELS, STATUS_COLORS } from '../services/reservationService';
import '../styles/ReservationTrackingPage.css';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function ReservationTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    reservationService
      .getByToken(token)
      .then(setReservation)
      .catch(() => setError('Reserva não encontrada. Verifique o link.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="tracking-page">
        <div className="tracking-container">
          <div className="tracking-skeleton" />
          <div className="tracking-skeleton tracking-skeleton-sm" />
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="tracking-page">
        <div className="tracking-container tracking-error">
          <span className="tracking-error-icon">❌</span>
          <p>{error || 'Reserva não encontrada'}</p>
          <a href="/reservar" className="btn-track-primary">Fazer nova reserva</a>
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[reservation.status] || '#6B7280';
  const statusLabel = STATUS_LABELS[reservation.status] || reservation.status;

  const statusSteps = [
    { key: 'approved', label: 'Reserva Confirmada' },
    { key: 'ready', label: 'Equipamentos Prontos' },
    { key: 'in_use', label: 'Em Uso' },
    { key: 'returned', label: 'Devolvido' },
  ];

  const activeStepIndex = statusSteps.findIndex((s) => s.key === reservation.status);
  const isCancelled = ['cancelled', 'rejected', 'no_show'].includes(reservation.status);

  return (
    <div className="tracking-page">
      <div className="tracking-container">
        <header className="tracking-header">
          <h1>Acompanhar Reserva</h1>
          <p className="tracking-number">{reservation.reservation_number}</p>
        </header>

        {/* Badge de status */}
        <div className="tracking-status-card" style={{ borderColor: statusColor }}>
          <span className="tracking-status-dot" style={{ background: statusColor }} />
          <span className="tracking-status-label" style={{ color: statusColor }}>{statusLabel}</span>
        </div>

        {reservation.rejection_reason && (
          <div className="tracking-rejection">
            <strong>Motivo da recusa:</strong> {reservation.rejection_reason}
          </div>
        )}

        {/* Progresso visual (apenas fluxo normal) */}
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

        {/* Detalhes */}
        <div className="tracking-details">
          <div className="tracking-detail-row">
            <span className="tracking-detail-label">Equipamento</span>
            <span className="tracking-detail-value">
              {reservation.type_icon} {reservation.quantity}× {reservation.type_name}
            </span>
          </div>
          <div className="tracking-detail-row">
            <span className="tracking-detail-label">Data</span>
            <span className="tracking-detail-value">{formatDate(reservation.date)}</span>
          </div>
          <div className="tracking-detail-row">
            <span className="tracking-detail-label">Horário</span>
            <span className="tracking-detail-value">{reservation.start_time.substring(0, 5)} – {reservation.end_time.substring(0, 5)}</span>
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

        {/* Ações */}
        <div className="tracking-actions">
          <a
            href={reservationService.getICSUrlByToken(token!)}
            className="btn-track-secondary"
            download
          >
            📅 Adicionar ao Calendário
          </a>
          <a href="/reservar" className="btn-track-ghost">Fazer nova reserva</a>
        </div>
      </div>
    </div>
  );
}
