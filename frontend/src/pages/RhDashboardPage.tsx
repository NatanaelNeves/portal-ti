import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/RhDashboardPage.css';

interface RecentTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category?: string;
  created_at: string;
  updated_at: string;
  requester_name?: string;
}

interface RhDashboardData {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  closed: number;
  newToday: number;
  resolvedToday: number;
  recentTickets: RecentTicket[];
}

const EMPTY_DATA: RhDashboardData = {
  total: 0, open: 0, inProgress: 0, waiting: 0,
  resolved: 0, closed: 0, newToday: 0, resolvedToday: 0,
  recentTickets: [],
};

const RH_CATEGORY_LABELS: Record<string, string> = {
  RH_ATESTADO:    'Atestado Médico',
  RH_PONTO:       'Ajuste de Ponto',
  RH_FOLHA:       'Folha de Pagamento',
  RH_DECLARACAO:  'Declaração',
  RH_BENEFICIOS:  'Benefícios',
  RH_OUTROS:      'Outros RH',
  RH_CONFIDENCIAL:'Confidencial',
};

const STATUS_LABEL: Record<string, string> = {
  open:                  'Aberto',
  in_progress:           'Em Atendimento',
  waiting_user:          'Aguardando',
  aguardando_confirmacao:'Ag. Confirmação',
  resolved:              'Resolvido',
  closed:                'Fechado',
  cancelled:             'Cancelado',
};

const STATUS_CLASS: Record<string, string> = {
  open:                  'rhd-badge rhd-badge-open',
  in_progress:           'rhd-badge rhd-badge-progress',
  waiting_user:          'rhd-badge rhd-badge-waiting',
  aguardando_confirmacao:'rhd-badge rhd-badge-waiting',
  resolved:              'rhd-badge rhd-badge-resolved',
  closed:                'rhd-badge rhd-badge-closed',
};

const STATUS_ICON: Record<string, string> = {
  open: '🔴', in_progress: '🟡', waiting_user: '🟣',
  aguardando_confirmacao: '🟣', resolved: '🟢', closed: '⚪',
};

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Alta', medium: 'Média', low: 'Baixa', critical: 'Crítica',
};

const PRIORITY_CLASS: Record<string, string> = {
  high:     'rhd-badge rhd-badge-high',
  critical: 'rhd-badge rhd-badge-critical',
  medium:   'rhd-badge rhd-badge-medium',
  low:      'rhd-badge rhd-badge-low',
};

function initials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function elapsed(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 60) return `${Math.max(m, 1)} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function RhDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<RhDashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserName, setCurrentUserName] = useState('Equipe de RH');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    const userRaw = localStorage.getItem('internal_user');
    if (!token || !userRaw) { navigate('/admin/login'); return; }
    try {
      const user = JSON.parse(userRaw) as { role?: string; name?: string };
      if (!['rh_staff', 'admin'].includes(user.role || '')) { navigate('/admin/login'); return; }
      setCurrentUserName(user.name || 'Equipe de RH');
    } catch { navigate('/admin/login'); return; }
    void fetchDashboard();
  }, [navigate]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [allResp, recentResp] = await Promise.all([
        api.get('/tickets?department=rh&limit=1'),
        api.get('/tickets?department=rh&limit=10&sort=created_at&order=desc'),
      ]);
      const stats = allResp.data?.stats || {};
      const tickets: RecentTicket[] = recentResp.data?.data || [];
      const total = recentResp.data?.pagination?.total || 0;
      setData({
        total,
        open:          stats.waitingUser ?? 0,
        inProgress:    stats.inProgress  ?? 0,
        waiting:       0,
        resolved:      tickets.filter(t => t.status === 'resolved').length,
        closed:        tickets.filter(t => t.status === 'closed').length,
        newToday:      stats.newToday     ?? 0,
        resolvedToday: stats.resolvedToday ?? 0,
        recentTickets: tickets,
      });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const openCount = data.open + data.inProgress + data.waiting;
  const progressPct = (n: number, max: number) =>
    max === 0 ? 0 : Math.min(100, Math.round((n / max) * 100));

  const kpis = [
    {
      tone: 'open', icon: '📂', label: 'Chamados Abertos',
      value: openCount, barPct: progressPct(openCount, data.total),
    },
    {
      tone: 'new', icon: '📥', label: 'Novos Hoje',
      value: data.newToday, barPct: progressPct(data.newToday, Math.max(data.total, 1)),
    },
    {
      tone: 'resolved', icon: '✅', label: 'Resolvidos Hoje',
      value: data.resolvedToday, barPct: progressPct(data.resolvedToday, Math.max(data.newToday, 1)),
    },
    {
      tone: 'total', icon: '👥', label: 'Total RH',
      value: data.total, barPct: 100,
    },
  ];

  return (
    <div className="rhd-page">
      {/* Header */}
      <div className="rhd-header">
        <div className="rhd-header-info">
          <h1 className="rhd-title">Dashboard — Recursos Humanos</h1>
          <p className="rhd-subtitle">Olá, {currentUserName} · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
        </div>
        <div className="rhd-header-actions">
          <button className="rhd-btn rhd-btn-secondary" onClick={() => void fetchDashboard()}>↻ Atualizar</button>
          <button className="rhd-btn rhd-btn-primary" onClick={() => navigate('/rh/chamados')}>
            Ver Todos os Chamados →
          </button>
        </div>
      </div>

      {error && <div className="rhd-error">{error}</div>}

      {loading ? (
        <div className="rhd-loading">Carregando dashboard...</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="rhd-kpi-grid">
            {kpis.map(kpi => (
              <div key={kpi.label} className={`rhd-kpi-card rhd-kpi-${kpi.tone}`}>
                <span className="rhd-kpi-bg-icon">{kpi.icon}</span>
                <div className="rhd-kpi-label">{kpi.label}</div>
                <div className="rhd-kpi-value">{kpi.value}</div>
                <div className="rhd-kpi-bar-wrap">
                  <div className="rhd-kpi-bar" style={{ width: `${kpi.barPct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Recent tickets */}
          <div className="rhd-section">
            <div className="rhd-section-header">
              <div>
                <div className="rhd-section-title">Chamados Recentes de RH</div>
                <div className="rhd-section-subtitle">Últimos 10 chamados abertos</div>
              </div>
              <button className="rhd-link" onClick={() => navigate('/rh/chamados')}>
                Ver todos →
              </button>
            </div>

            {data.recentTickets.length === 0 ? (
              <div className="rhd-empty">Nenhum chamado de RH no momento.</div>
            ) : (
              <div className="rhd-table-wrap">
                <table className="rhd-table">
                  <thead>
                    <tr>
                      <th>Chamado</th>
                      <th>Solicitante</th>
                      <th>Status</th>
                      <th>Prioridade</th>
                      <th>Criado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTickets.map((ticket, idx) => (
                      <tr
                        key={ticket.id}
                        className={`rhd-row ${idx % 2 === 1 ? 'rhd-row--alt' : ''}`}
                        onClick={() => navigate(`/rh/chamados/${ticket.id}`)}
                      >
                        <td>
                          <div className="rhd-ticket-title">{ticket.title}</div>
                          {ticket.category && (
                            <div className="rhd-cat-text">
                              {RH_CATEGORY_LABELS[ticket.category] || ticket.category}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="rhd-avatar-cell">
                            <div className="rhd-avatar">{initials(ticket.requester_name)}</div>
                            <span className="rhd-requester-name">{ticket.requester_name || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <span className={STATUS_CLASS[ticket.status] || 'rhd-badge'}>
                            {STATUS_ICON[ticket.status] || ''} {STATUS_LABEL[ticket.status] || ticket.status}
                          </span>
                        </td>
                        <td>
                          <span className={PRIORITY_CLASS[ticket.priority] || 'rhd-badge'}>
                            {PRIORITY_LABEL[ticket.priority] || ticket.priority}
                          </span>
                        </td>
                        <td className="rhd-elapsed">{elapsed(ticket.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
