import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reservationService, Reservation, STATUS_LABELS, STATUS_COLORS } from '../services/reservationService';
import '../styles/AdminReservationsPage.css';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

export default function AdminReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!id) return;
    setLoading(true);
    reservationService.getById(id).then(setReservation).catch(() => setError('Reserva não encontrada')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: () => Promise<void>) => {
    setActionLoading(true);
    setError('');
    try {
      await action();
      load();
    } catch {
      setError('Erro ao executar ação');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    await doAction(() => reservationService.reject(id, rejectReason));
    setShowReject(false);
    setRejectReason('');
  };

  if (loading) return <div className="admin-res-page"><div className="admin-res-skeleton" /></div>;

  if (!reservation || error) {
    return (
      <div className="admin-res-page">
        <p>{error || 'Reserva não encontrada'}</p>
        <button className="btn-res-ghost" onClick={() => navigate('/admin/reservas')}>← Voltar</button>
      </div>
    );
  }

  const color = STATUS_COLORS[reservation.status] || '#6B7280';
  const label = STATUS_LABELS[reservation.status] || reservation.status;

  return (
    <div className="admin-res-page">
      <div className="admin-res-detail-header">
        <button className="btn-res-ghost btn-res-sm" onClick={() => navigate('/admin/reservas')}>← Voltar</button>
        <h1>{reservation.reservation_number}</h1>
        <span className="res-status-badge" style={{ background: color + '20', color, borderColor: color, fontSize: '1rem' }}>
          {label}
        </span>
      </div>

      {error && <div className="res-alert res-alert-error">{error}</div>}

      <div className="admin-res-detail-grid">
        <div className="admin-res-detail-card">
          <h3>Equipamento</h3>
          <p><strong>Tipo:</strong> {reservation.type_icon} {reservation.type_name}</p>
          <p><strong>Quantidade:</strong> {reservation.quantity}</p>
        </div>

        <div className="admin-res-detail-card">
          <h3>Agendamento</h3>
          <p><strong>Data:</strong> {formatDate(reservation.date)}</p>
          <p><strong>Início:</strong> {reservation.start_time.substring(0, 5)}</p>
          <p><strong>Término:</strong> {reservation.end_time.substring(0, 5)}</p>
          <p><strong>Local:</strong> {reservation.location}</p>
        </div>

        <div className="admin-res-detail-card">
          <h3>Solicitante</h3>
          <p><strong>Nome:</strong> {reservation.requester_name ?? reservation.internal_user_name ?? '—'}</p>
          <p><strong>E-mail:</strong> {reservation.requester_email ?? '—'}</p>
          {reservation.requester_phone && <p><strong>Telefone:</strong> {reservation.requester_phone}</p>}
        </div>

        <div className="admin-res-detail-card">
          <h3>Informações</h3>
          <p><strong>Finalidade:</strong> {reservation.purpose}</p>
          {reservation.notes && <p><strong>Notas:</strong> {reservation.notes}</p>}
          {reservation.approved_by_name && <p><strong>Aprovado por:</strong> {reservation.approved_by_name}</p>}
          {reservation.rejection_reason && <p><strong>Motivo recusa:</strong> {reservation.rejection_reason}</p>}
          <p><strong>Criado em:</strong> {formatDateTime(reservation.created_at)}</p>
          <p><strong>Atualizado:</strong> {formatDateTime(reservation.updated_at)}</p>
        </div>
      </div>

      {/* Ações */}
      <div className="admin-res-detail-actions">
        {reservation.status === 'pending' && (
          <>
            <button className="btn-res-success" disabled={actionLoading} onClick={() => doAction(() => reservationService.approve(id!))}>
              Aprovar
            </button>
            <button className="btn-res-danger" disabled={actionLoading} onClick={() => setShowReject(true)}>
              Recusar
            </button>
          </>
        )}
        {reservation.status === 'approved' && (
          <>
            <button className="btn-res-purple" disabled={actionLoading} onClick={() => doAction(() => reservationService.markReady(id!))}>
              Marcar como Pronto
            </button>
            <button className="btn-res-warning" disabled={actionLoading} onClick={() => doAction(() => reservationService.markNoShow(id!))}>
              Marcar No-show
            </button>
          </>
        )}
        {reservation.status === 'ready' && (
          <button className="btn-res-warning" disabled={actionLoading} onClick={() => doAction(() => reservationService.markNoShow(id!))}>
            Marcar No-show
          </button>
        )}
        <a
          href={reservationService.getICSUrl(id!)}
          className="btn-res-ghost"
          download
        >
          📅 Exportar ICS
        </a>
      </div>

      {showReject && (
        <div className="res-modal-overlay" onClick={() => setShowReject(false)}>
          <div className="res-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Recusar Reserva</h3>
            <label className="res-label">Motivo da recusa</label>
            <textarea
              className="res-input res-textarea"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Informe o motivo para o solicitante"
            />
            <div className="res-modal-actions">
              <button className="btn-res-ghost" onClick={() => setShowReject(false)}>Cancelar</button>
              <button className="btn-res-danger" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading}>
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
