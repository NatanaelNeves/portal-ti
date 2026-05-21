import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationService, Reservation, STATUS_LABELS, STATUS_COLORS } from '../services/reservationService';
import '../styles/MyReservationsPage.css';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function MyReservationsPage() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    reservationService
      .getMyReservations()
      .then(setReservations)
      .catch(() => setError('Erro ao carregar reservas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Deseja cancelar esta reserva?')) return;
    setCancellingId(id);
    try {
      await reservationService.cancel(id);
      setReservations((prev) =>
        prev.map((r) => r.id === id ? { ...r, status: 'cancelled' as const } : r),
      );
    } catch {
      setError('Erro ao cancelar reserva');
    } finally {
      setCancellingId(null);
    }
  };

  const canCancel = (status: string) => ['approved', 'ready'].includes(status);

  return (
    <div className="my-res-page">
      <div className="my-res-header">
        <div>
          <h1>Minhas Reservas</h1>
          <p>Histórico e status das suas reservas de equipamentos</p>
        </div>
        <button className="btn-res-primary" onClick={() => navigate('/reservas/nova')}>
          + Nova Reserva
        </button>
      </div>

      {error && <div className="res-alert res-alert-error">{error}</div>}

      {loading ? (
        <div className="my-res-list">
          {[1, 2, 3].map((i) => <div key={i} className="my-res-skeleton" />)}
        </div>
      ) : reservations.length === 0 ? (
        <div className="my-res-empty">
          <span>📋</span>
          <p>Você ainda não tem reservas.</p>
          <button className="btn-res-primary" onClick={() => navigate('/reservas/nova')}>
            Criar primeira reserva
          </button>
        </div>
      ) : (
        <div className="my-res-list">
          {reservations.map((r) => {
            const color = STATUS_COLORS[r.status] || '#6B7280';
            const label = STATUS_LABELS[r.status] || r.status;
            return (
              <div key={r.id} className="my-res-card">
                <div className="my-res-card-header">
                  <span className="my-res-number">{r.reservation_number}</span>
                  <span className="my-res-status-badge" style={{ background: color + '20', color, borderColor: color }}>
                    {label}
                  </span>
                </div>

                <div className="my-res-card-body">
                  <div className="my-res-info-row">
                    <span>{r.type_icon ?? '💻'} {r.quantity}× {r.type_name}</span>
                    <span>📅 {formatDate(r.date)}</span>
                  </div>
                  <div className="my-res-info-row">
                    <span>🕐 {r.start_time.substring(0, 5)} – {r.end_time.substring(0, 5)}</span>
                    <span>📍 {r.location}</span>
                  </div>
                  <p className="my-res-purpose">{r.purpose}</p>
                  {r.rejection_reason && (
                    <p className="my-res-rejection"><strong>Motivo da recusa:</strong> {r.rejection_reason}</p>
                  )}
                </div>

                <div className="my-res-card-footer">
                  <a
                    href={reservationService.getICSUrl(r.id)}
                    className="btn-res-ghost btn-res-sm"
                    download
                  >
                    📅 ICS
                  </a>
                  {canCancel(r.status) && (
                    <button
                      className="btn-res-danger btn-res-sm"
                      onClick={() => handleCancel(r.id)}
                      disabled={cancellingId === r.id}
                    >
                      {cancellingId === r.id ? 'Cancelando...' : 'Cancelar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
