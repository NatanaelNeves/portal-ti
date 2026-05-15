import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import '../styles/ReportsPage.css';
import { BACKEND_URL } from '../services/api';

interface Ticket {
  id: string;
  status: string;
  priority: string;
  category?: string;
  created_at: string;
  resolved_at?: string;
  requester_name?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  RH_ATESTADO: 'Atestado Médico',
  RH_PONTO: 'Ajuste de Ponto',
  RH_FOLHA: 'Folha de Pagamento',
  RH_DECLARACAO: 'Declaração',
  RH_BENEFICIOS: 'Benefícios',
  RH_OUTROS: 'Outros RH',
  RH_CONFIDENCIAL: 'Confidencial',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em Progresso',
  waiting_user: 'Aguardando',
  aguardando_confirmacao: 'Ag. Confirmação',
  resolved: 'Resolvido',
  closed: 'Concluído',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  in_progress: '#f59e0b',
  waiting_user: '#8b5cf6',
  aguardando_confirmacao: '#6366f1',
  resolved: '#10b981',
  closed: '#6b7280',
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function RhReportsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const internalToken = localStorage.getItem('internal_token');

  useEffect(() => {
    if (!internalToken) {
      navigate('/admin/login');
      return;
    }
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const all: Ticket[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const res = await fetch(
          `${BACKEND_URL}/api/tickets?department=rh&limit=100&page=${page}`,
          { headers: { Authorization: `Bearer ${internalToken}` } },
        );
        if (!res.ok) throw new Error('Erro ao carregar dados');
        const data = await res.json();
        all.push(...(data.data || []));
        totalPages = data.pagination?.totalPages ?? 1;
        page++;
      }

      setTickets(all);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  // --- Computed stats ---
  const total = tickets.length;
  const open = tickets.filter(t => ['open', 'in_progress', 'waiting_user', 'aguardando_confirmacao'].includes(t.status)).length;
  const resolved = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // today
  const today = new Date().toDateString();
  const newToday = tickets.filter(t => new Date(t.created_at).toDateString() === today).length;

  // avg resolution hours
  const resolvedWithTime = tickets.filter(t => t.resolved_at);
  const avgResolutionHours = resolvedWithTime.length > 0
    ? (
        resolvedWithTime.reduce((sum, t) => {
          const diff = new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime();
          return sum + diff / (1000 * 60 * 60);
        }, 0) / resolvedWithTime.length
      ).toFixed(1)
    : '—';

  // By status
  const byStatus = Object.keys(STATUS_LABELS).map(key => ({
    name: STATUS_LABELS[key],
    value: tickets.filter(t => t.status === key).length,
    color: STATUS_COLORS[key],
  })).filter(d => d.value > 0);

  // By category
  const categoryCount: Record<string, number> = {};
  tickets.forEach(t => {
    const cat = t.category || 'RH_OUTROS';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const byCategory = Object.entries(categoryCount)
    .map(([key, count]) => ({ name: CATEGORY_LABELS[key] || key, value: count }))
    .sort((a, b) => b.value - a.value);

  // Monthly trend (last 6 months)
  const monthlyMap: Record<string, number> = {};
  tickets.forEach(t => {
    const d = new Date(t.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });
  const monthlyTrend = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, count]) => {
      const [year, month] = key.split('-');
      const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      return { month: label, chamados: count };
    });

  if (loading) return <div className="reports-page"><div className="loading-state">Carregando relatório...</div></div>;
  if (error) return <div className="reports-page"><div className="error-state">{error}</div></div>;

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1>Relatórios — Recursos Humanos</h1>
          <p className="reports-subtitle">Visão geral dos chamados do departamento de RH</p>
        </div>
        <button className="btn-refresh" onClick={fetchTickets}>↻ Atualizar</button>
      </div>

      {/* KPI Cards */}
      <div className="stats-overview-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-number">{total}</div>
          <div className="stat-label">Total de Chamados</div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-number">{open}</div>
          <div className="stat-label">Em Aberto</div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-number">{resolved}</div>
          <div className="stat-label">Resolvidos</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{resolutionRate}%</div>
          <div className="stat-label">Taxa de Resolução</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{newToday}</div>
          <div className="stat-label">Abertos Hoje</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{avgResolutionHours}h</div>
          <div className="stat-label">Tempo Médio Resolução</div>
        </div>
      </div>

      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Category breakdown */}
        <div className="chart-card">
          <h2>Chamados por Categoria</h2>
          {byCategory.length === 0 ? (
            <p className="no-data">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={true}
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: unknown) => `${val} chamados`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status distribution */}
        <div className="chart-card">
          <h2>Distribuição por Status</h2>
          {byStatus.length === 0 ? (
            <p className="no-data">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byStatus} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(val: unknown) => `${val} chamados`} />
                <Bar dataKey="value" name="Chamados" radius={[4, 4, 0, 0]}>
                  {byStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly trend */}
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h2>Tendência Mensal (últimos 6 meses)</h2>
          {monthlyTrend.length === 0 ? (
            <p className="no-data">Sem dados históricos</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyTrend} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(val: unknown) => `${val} chamados`} />
                <Legend />
                <Bar dataKey="chamados" name="Chamados" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
