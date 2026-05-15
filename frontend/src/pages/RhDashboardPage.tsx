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
  total: 0,
  open: 0,
  inProgress: 0,
  waiting: 0,
  resolved: 0,
  closed: 0,
  newToday: 0,
  resolvedToday: 0,
  recentTickets: [],
};

const RH_CATEGORY_LABELS: Record<string, string> = {
  RH_ATESTADO: 'Atestado Médico',
  RH_PONTO: 'Ajuste de Ponto',
  RH_FOLHA: 'Folha de Pagamento',
  RH_DECLARACAO: 'Declaração',
  RH_BENEFICIOS: 'Benefícios',
  RH_OUTROS: 'Outros RH',
  RH_CONFIDENCIAL: 'Confidencial',
};

export default function RhDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<RhDashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserName, setCurrentUserName] = useState('Equipe de RH');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    const userRaw = localStorage.getItem('internal_user');

    if (!token || !userRaw) {
      navigate('/admin/login');
      return;
    }

    try {
      const user = JSON.parse(userRaw) as { role?: string; name?: string };
      if (!['rh_staff', 'admin'].includes(user.role || '')) {
        navigate('/admin/login');
        return;
      }
      setCurrentUserName(user.name || 'Equipe de RH');
    } catch {
      navigate('/admin/login');
      return;
    }

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

      const countByStatus = (status: string) =>
        tickets.filter((t) => t.status === status).length;

      setData({
        total,
        open: stats.waitingUser ?? countByStatus('open'),
        inProgress: stats.inProgress ?? countByStatus('in_progress'),
        waiting: countByStatus('waiting'),
        resolved: countByStatus('resolved'),
        closed: countByStatus('closed'),
        newToday: stats.newToday ?? 0,
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

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      open: 'Aberto',
      in_progress: 'Em Atendimento',
      waiting: 'Aguardando',
      aguardando_confirmacao: 'Aguard. Confirmação',
      resolved: 'Resolvido',
      closed: 'Fechado',
      cancelled: 'Cancelado',
    };
    return map[status] || status;
  };

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      open: 'asd-badge asd-badge-open',
      in_progress: 'asd-badge asd-badge-progress',
      waiting: 'asd-badge asd-badge-waiting',
      aguardando_confirmacao: 'asd-badge asd-badge-waiting',
      resolved: 'asd-badge asd-badge-resolved',
      closed: 'asd-badge asd-badge-resolved',
    };
    return map[status] || 'asd-badge';
  };

  const getPriorityLabel = (priority: string) => {
    const map: Record<string, string> = {
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa',
      critical: 'Crítica',
    };
    return map[priority] || priority;
  };

  const getPriorityClass = (priority: string) => {
    const map: Record<string, string> = {
      high: 'asd-badge asd-badge-high',
      critical: 'asd-badge asd-badge-critical',
      medium: 'asd-badge asd-badge-medium',
      low: 'asd-badge asd-badge-low',
    };
    return map[priority] || 'asd-badge';
  };

  const formatElapsedTime = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${Math.max(diffMin, 1)} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    return `${Math.floor(diffH / 24)}d`;
  };

  const kpis = [
    { title: 'Chamados Abertos', value: data.open + data.inProgress + data.waiting, icon: '📂', tone: 'pending' },
    { title: 'Novos Hoje', value: data.newToday, icon: '📥', tone: 'open' },
    { title: 'Resolvidos Hoje', value: data.resolvedToday, icon: '✅', tone: 'resolved' },
    { title: 'Total RH', value: data.total, icon: '👥', tone: 'assigned' },
  ];

  return (
    <div className="asd-page">
      <div className="asd-header">
        <div className="asd-header-info">
          <h1 className="asd-title">Dashboard — Recursos Humanos</h1>
          <p className="asd-subtitle">Olá, {currentUserName}</p>
        </div>
        <div className="asd-header-actions">
          <button className="asd-btn asd-btn-primary" onClick={() => navigate('/rh/chamados')}>
            Ver Todos os Chamados
          </button>
        </div>
      </div>

      {error && <div className="asd-error">{error}</div>}

      {loading ? (
        <div className="asd-loading">Carregando...</div>
      ) : (
        <>
          <div className="asd-kpi-grid">
            {kpis.map((kpi) => (
              <div key={kpi.title} className={`asd-kpi-card asd-kpi-${kpi.tone}`}>
                <div className="asd-kpi-icon">{kpi.icon}</div>
                <div className="asd-kpi-content">
                  <div className="asd-kpi-value">{kpi.value}</div>
                  <div className="asd-kpi-title">{kpi.title}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="asd-section">
            <div className="asd-section-header">
              <h2 className="asd-section-title">Chamados Recentes de RH</h2>
              <button className="asd-link" onClick={() => navigate('/rh/chamados')}>
                Ver todos →
              </button>
            </div>

            {data.recentTickets.length === 0 ? (
              <div className="asd-empty">Nenhum chamado de RH no momento.</div>
            ) : (
              <div className="asd-table-wrapper">
                <table className="asd-table">
                  <thead>
                    <tr>
                      <th>Chamado</th>
                      <th>Categoria</th>
                      <th>Solicitante</th>
                      <th>Status</th>
                      <th>Prioridade</th>
                      <th>Criado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="asd-table-row"
                        onClick={() => navigate(`/rh/chamados/${ticket.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="asd-ticket-title">{ticket.title}</td>
                        <td>
                          {ticket.category
                            ? RH_CATEGORY_LABELS[ticket.category] || ticket.category
                            : '—'}
                        </td>
                        <td>{ticket.requester_name || '—'}</td>
                        <td>
                          <span className={getStatusClass(ticket.status)}>
                            {getStatusLabel(ticket.status)}
                          </span>
                        </td>
                        <td>
                          <span className={getPriorityClass(ticket.priority)}>
                            {getPriorityLabel(ticket.priority)}
                          </span>
                        </td>
                        <td className="asd-elapsed">{formatElapsedTime(ticket.created_at)}</td>
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
