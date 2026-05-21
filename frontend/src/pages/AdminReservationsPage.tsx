import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  reservationService,
  Reservation,
  ReservationStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  ActiveNowResult,
} from '../services/reservationService';
import '../styles/AdminReservationsPage.css';

type DateFilter = 'today' | 'tomorrow' | 'week' | 'month' | 'all';

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today: 'Hoje',
  tomorrow: 'Amanhã',
  week: 'Esta Semana',
  month: 'Este Mês',
  all: 'Todos',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminReservationsPage() {
  const navigate = useNavigate();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeNow, setActiveNow] = useState<ActiveNowResult | null>(null);

  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<'date_asc' | 'date_desc'>('date_asc');

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const limit = 20;

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit, sort };
      if (dateFilter !== 'all') params.date_filter = dateFilter;
      if (statusFilter) params.status = statusFilter;
      const result = await reservationService.getAll(params);
      setReservations(result.reservations);
      setTotal(result.total);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, dateFilter, statusFilter, sort]);

  useEffect(() => { loadReservations(); }, [loadReservations]);

  useEffect(() => {
    reservationService.getActiveNow().then(setActiveNow).catch(() => null);
    const interval = setInterval(() => {
      reservationService.getActiveNow().then(setActiveNow).catch(() => null);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const doAction = async (action: () => Promise<void>, id: string) => {
    setActionLoading(id);
    try {
      await action();
      await loadReservations();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await reservationService.reject(rejectModal.id, rejectReason);
      setRejectModal(null);
      setRejectReason('');
      await loadReservations();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const exportCSV = () => {
    const params: any = {};
    if (dateFilter !== 'all') params.date_filter = dateFilter;
    if (statusFilter) params.status = statusFilter;
    window.open(reservationService.exportCSV(params), '_blank');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="admin-res-page">
      {/* Header */}
      <div className="admin-res-header">
        <div>
          <h1>Reservas de Equipamentos</h1>
          <p>{total} reserva(s) encontrada(s)</p>
        </div>
        <div className="admin-res-header-actions">
          <button className="btn-res-ghost btn-res-sm" onClick={exportCSV}>Exportar CSV</button>
          <button className="btn-res-ghost btn-res-sm" onClick={() => navigate('/admin/reservas/tipos')}>
            Gerenciar Tipos
          </button>
        </div>
      </div>

      {/* Card Em Uso Agora */}
      {activeNow && (
        <div className="admin-res-active-card">
          <div className="admin-res-active-icon">💻</div>
          <div>
            <p className="admin-res-active-count">
              {activeNow.count > 0 ? `${activeNow.count} ${activeNow.type} em uso agora` : `Nenhum equipamento em uso agora`}
            </p>
            {activeNow.next_return && (
              <p className="admin-res-active-sub">
                Próxima devolução: {activeNow.next_return.time.substring(0, 5)} — {activeNow.next_return.location}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="admin-res-filters">
        <div className="admin-res-date-pills">
          {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).map((f) => (
            <button
              key={f}
              className={`res-pill ${dateFilter === f ? 'active' : ''}`}
              onClick={() => { setDateFilter(f); setPage(1); }}
            >
              {DATE_FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="admin-res-filter-row">
          <select
            className="res-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Todos os status</option>
            {(Object.entries(STATUS_LABELS) as [ReservationStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            className="res-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as 'date_asc' | 'date_desc')}
          >
            <option value="date_asc">Data crescente</option>
            <option value="date_desc">Data decrescente</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="admin-res-list">
          {[1, 2, 3].map((i) => <div key={i} className="admin-res-skeleton" />)}
        </div>
      ) : reservations.length === 0 ? (
        <div className="admin-res-empty">
          <span>📋</span>
          <p>Nenhuma reserva encontrada para os filtros selecionados</p>
        </div>
      ) : (
        <div className="admin-res-list">
          {reservations.map((r) => {
            const color = STATUS_COLORS[r.status] || '#6B7280';
            const label = STATUS_LABELS[r.status] || r.status;
            const requester = r.requester_name ?? r.internal_user_name ?? '—';
            const email = r.requester_email ?? '—';
            return (
              <div key={r.id} className="admin-res-card">
                <div className="admin-res-card-header">
                  <div className="admin-res-card-meta">
                    <span className="admin-res-number">{r.reservation_number}</span>
                    <span className="res-status-badge" style={{ background: color + '20', color, borderColor: color }}>
                      {label}
                    </span>
                  </div>
                  <button
                    className="btn-res-ghost btn-res-xs"
                    onClick={() => navigate(`/admin/reservas/${r.id}`)}
                  >
                    Ver detalhes
                  </button>
                </div>

                <div className="admin-res-card-body">
                  <div className="admin-res-info-grid">
                    <span>{r.type_icon ?? '💻'} {r.quantity}× {r.type_name}</span>
                    <span>📅 {formatDate(r.date)}</span>
                    <span>🕐 {r.start_time.substring(0, 5)}–{r.end_time.substring(0, 5)}</span>
                    <span>📍 {r.location}</span>
                    <span>👤 {requester}</span>
                    <span>✉️ {email}</span>
                  </div>
                  <p className="admin-res-purpose">{r.purpose}</p>
                  {r.rejection_reason && (
                    <p className="admin-res-rejection"><strong>Recusa:</strong> {r.rejection_reason}</p>
                  )}
                </div>

                {/* Ações rápidas */}
                <div className="admin-res-actions">
                  {r.status === 'pending' && (
                    <>
                      <button
                        className="btn-res-success btn-res-sm"
                        disabled={actionLoading === r.id}
                        onClick={() => doAction(() => reservationService.approve(r.id), r.id)}
                      >
                        Aprovar
                      </button>
                      <button
                        className="btn-res-danger btn-res-sm"
                        disabled={actionLoading === r.id}
                        onClick={() => setRejectModal({ id: r.id })}
                      >
                        Recusar
                      </button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <>
                      <button
                        className="btn-res-purple btn-res-sm"
                        disabled={actionLoading === r.id}
                        onClick={() => doAction(() => reservationService.markReady(r.id), r.id)}
                      >
                        Marcar Pronto
                      </button>
                      <button
                        className="btn-res-warning btn-res-sm"
                        disabled={actionLoading === r.id}
                        onClick={() => doAction(() => reservationService.markNoShow(r.id), r.id)}
                      >
                        No-show
                      </button>
                    </>
                  )}
                  {r.status === 'ready' && (
                    <button
                      className="btn-res-warning btn-res-sm"
                      disabled={actionLoading === r.id}
                      onClick={() => doAction(() => reservationService.markNoShow(r.id), r.id)}
                    >
                      No-show
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="admin-res-pagination">
          <button
            className="btn-res-ghost btn-res-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Anterior
          </button>
          <span>Página {page} de {totalPages}</span>
          <button
            className="btn-res-ghost btn-res-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Próxima →
          </button>
        </div>
      )}

      {/* Modal de recusa */}
      {rejectModal && (
        <div className="res-modal-overlay" onClick={() => setRejectModal(null)}>
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
              <button className="btn-res-ghost" onClick={() => setRejectModal(null)}>Cancelar</button>
              <button
                className="btn-res-danger"
                onClick={handleReject}
                disabled={!rejectReason.trim() || !!actionLoading}
              >
                Recusar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
