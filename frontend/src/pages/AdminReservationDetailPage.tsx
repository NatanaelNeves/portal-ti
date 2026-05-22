import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reservationService, Reservation, STATUS_LABELS, STATUS_COLORS } from '../services/reservationService';
import '../styles/AdminReservationDetailPage.css';

function formatDate(dateStr: string): string {
  const s = String(dateStr).substring(0, 10);
  const d = new Date(s + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

function fmtTime(t: string) { return String(t).substring(0, 5); }

// ── Workflow timeline ─────────────────────────────────────────────────────────

const FLOW_STEPS = [
  { key: 'approved', label: 'Confirmada' },
  { key: 'ready',    label: 'Pronta' },
  { key: 'in_use',   label: 'Em uso' },
  { key: 'returned', label: 'Devolvida' },
];

const FLOW_INDEX: Record<string, number> = {
  approved: 0, ready: 1, in_use: 2, returned: 3,
};

function StatusTimeline({ status }: { status: string }) {
  const isTerminal = ['rejected', 'cancelled', 'no_show'].includes(status);
  const terminalLabels: Record<string, string> = {
    rejected:  'Recusada',
    cancelled: 'Cancelada',
    no_show:   'Não compareceu',
  };

  if (isTerminal) {
    return (
      <div className="ard-timeline ard-timeline--terminal">
        <span className="ard-terminal-badge">{terminalLabels[status] ?? status}</span>
      </div>
    );
  }

  const cur = FLOW_INDEX[status] ?? -1;
  return (
    <div className="ard-timeline">
      {FLOW_STEPS.map((s, i) => {
        const done   = i < cur;
        const active = i === cur;
        return (
          <div key={s.key} className="ard-tl-step">
            <div className={`ard-tl-dot ${done ? 'done' : active ? 'active' : ''}`}>
              {done && (
                <svg viewBox="0 0 12 12" fill="none">
                  <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className={`ard-tl-label ${done ? 'done' : active ? 'active' : ''}`}>{s.label}</span>
            {i < FLOW_STEPS.length - 1 && <div className={`ard-tl-line ${done ? 'done' : active ? 'half' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

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
    reservationService.getById(id)
      .then(setReservation)
      .catch(() => setError('Reserva não encontrada'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: () => Promise<void>, label: string) => {
    if (!confirm(`Confirmar: ${label}?`)) return;
    setActionLoading(true);
    setError('');
    try { await action(); load(); }
    catch { setError('Erro ao executar ação. Tente novamente.'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await reservationService.reject(id, rejectReason);
      setShowReject(false);
      setRejectReason('');
      load();
    } catch { setError('Erro ao recusar reserva.'); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <div className="ard-page">
        <div className="ard-hero"><div className="ard-hero-inner"><div className="ard-skeleton-title" /></div></div>
        <div className="ard-body"><div className="ard-skeleton-grid"><div /><div /><div /><div /></div></div>
      </div>
    );
  }

  if (!reservation || error) {
    return (
      <div className="ard-page">
        <div className="ard-body" style={{ paddingTop: 40 }}>
          <p style={{ color: '#B91C1C', marginBottom: 16 }}>{error || 'Reserva não encontrada'}</p>
          <button className="ard-btn-ghost" onClick={() => navigate('/admin/reservas')}>← Voltar</button>
        </div>
      </div>
    );
  }

  const r = reservation;
  const statusColor = STATUS_COLORS[r.status] ?? '#6B7280';
  const statusLabel = STATUS_LABELS[r.status] ?? r.status;
  const requester = r.requester_name ?? r.internal_user_name ?? '—';

  return (
    <div className="ard-page">
      {/* Hero */}
      <div className="ard-hero">
        <div className="ard-hero-inner">
          <div className="ard-hero-left">
            <button className="ard-back-btn" onClick={() => navigate('/admin/reservas')}>← Voltar</button>
            <div>
              <p className="ard-hero-sub">Detalhe da Reserva</p>
              <h1 className="ard-hero-title">{r.reservation_number}</h1>
            </div>
          </div>
          <span className="ard-hero-badge" style={{ color: statusColor, background: statusColor + '22', borderColor: statusColor + '55' }}>
            {statusLabel}
          </span>
        </div>

        <div className="ard-timeline-wrap">
          <StatusTimeline status={r.status} />
        </div>
      </div>

      <div className="ard-body">
        {error && <div className="ard-alert-error">{error}</div>}

        {/* Info grid */}
        <div className="ard-grid">

          <div className="ard-card">
            <h3 className="ard-card-title">📅 Agendamento</h3>
            <div className="ard-card-rows">
              <div className="ard-row"><span className="ard-dl">Data</span><span className="ard-dv">{formatDate(r.date)}</span></div>
              <div className="ard-row">
                <span className="ard-dl">Horário</span>
                <span className="ard-dv">{fmtTime(r.start_time)} → {fmtTime(r.end_time)}</span>
              </div>
              <div className="ard-row"><span className="ard-dl">Local</span><span className="ard-dv">{r.location}</span></div>
            </div>
          </div>

          <div className="ard-card">
            <h3 className="ard-card-title">💻 Equipamento</h3>
            <div className="ard-card-rows">
              <div className="ard-row"><span className="ard-dl">Tipo</span><span className="ard-dv">{r.type_icon ?? '💻'} {r.type_name}</span></div>
              <div className="ard-row">
                <span className="ard-dl">Quantidade</span>
                <span className="ard-dv ard-dv--big">{r.quantity} notebook{r.quantity !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <div className="ard-card">
            <h3 className="ard-card-title">👤 Solicitante</h3>
            <div className="ard-card-rows">
              <div className="ard-row"><span className="ard-dl">Nome</span><span className="ard-dv">{requester}</span></div>
              <div className="ard-row"><span className="ard-dl">E-mail</span><span className="ard-dv">{r.requester_email ?? '—'}</span></div>
              {r.requester_phone && <div className="ard-row"><span className="ard-dl">Telefone</span><span className="ard-dv">{r.requester_phone}</span></div>}
            </div>
          </div>

          <div className="ard-card">
            <h3 className="ard-card-title">📋 Informações</h3>
            <div className="ard-card-rows">
              <div className="ard-row"><span className="ard-dl">Finalidade</span><span className="ard-dv">{r.purpose}</span></div>
              {r.approved_by_name && <div className="ard-row"><span className="ard-dl">Confirmado por</span><span className="ard-dv">{r.approved_by_name}</span></div>}
              {r.rejection_reason && <div className="ard-row"><span className="ard-dl">Motivo da recusa</span><span className="ard-dv ard-dv--danger">{r.rejection_reason}</span></div>}
              <div className="ard-row"><span className="ard-dl">Criada em</span><span className="ard-dv">{formatDateTime(r.created_at)}</span></div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="ard-actions-section">
          <p className="ard-actions-label">Ações</p>
          <div className="ard-actions-row">

            {r.status === 'pending' && (
              <>
                <button className="ard-btn ard-btn--green" disabled={actionLoading}
                  onClick={() => doAction(() => reservationService.approve(id!), 'Aprovar reserva')}>
                  ✓ Aprovar
                </button>
                <button className="ard-btn ard-btn--danger" disabled={actionLoading}
                  onClick={() => setShowReject(true)}>
                  ✗ Recusar
                </button>
              </>
            )}

            {r.status === 'approved' && (
              <>
                <button className="ard-btn ard-btn--purple" disabled={actionLoading}
                  onClick={() => doAction(() => reservationService.markReady(id!), 'Marcar notebooks como prontos para retirada')}>
                  📦 Pronto para Retirada
                </button>
                <button className="ard-btn ard-btn--ghost" disabled={actionLoading}
                  onClick={() => doAction(() => reservationService.markNoShow(id!), 'Registrar não comparecimento')}>
                  Não Compareceu
                </button>
              </>
            )}

            {r.status === 'ready' && (
              <>
                <button className="ard-btn ard-btn--blue" disabled={actionLoading}
                  onClick={() => doAction(() => reservationService.markInUse(id!), 'Registrar retirada — equipamentos em uso')}>
                  ▶ Registrar Retirada
                </button>
                <button className="ard-btn ard-btn--ghost" disabled={actionLoading}
                  onClick={() => doAction(() => reservationService.markNoShow(id!), 'Registrar não comparecimento')}>
                  Não Compareceu
                </button>
              </>
            )}

            {r.status === 'in_use' && (
              <button className="ard-btn ard-btn--green" disabled={actionLoading}
                onClick={() => doAction(() => reservationService.markReturned(id!), 'Registrar devolução dos equipamentos')}>
                ✓ Registrar Devolução
              </button>
            )}

            {['returned', 'cancelled', 'rejected', 'no_show'].includes(r.status) && (
              <p className="ard-actions-done">Reserva encerrada — nenhuma ação disponível.</p>
            )}

            <a href={reservationService.getICSUrl(id!)} className="ard-btn ard-btn--ghost" download
              style={{ marginLeft: 'auto' }}>
              📅 Exportar Calendário
            </a>
          </div>
        </div>
      </div>

      {/* Modal recusa */}
      {showReject && (
        <div className="ard-overlay" onClick={() => setShowReject(false)}>
          <div className="ard-modal" onClick={e => e.stopPropagation()}>
            <h3 className="ard-modal-title">Recusar Reserva</h3>
            <p className="ard-modal-sub">O motivo será enviado ao solicitante por e-mail.</p>
            <label className="ard-modal-label">Motivo</label>
            <textarea className="ard-modal-textarea" rows={4}
              value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Descreva o motivo da recusa..." />
            <div className="ard-modal-actions">
              <button className="ard-btn ard-btn--ghost" onClick={() => setShowReject(false)}>Cancelar</button>
              <button className="ard-btn ard-btn--danger" onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}>
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
