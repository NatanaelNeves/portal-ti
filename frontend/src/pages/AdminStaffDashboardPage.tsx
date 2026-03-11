import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/AdminStaffDashboardPage.css';

interface RecentTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface AdminStaffDashboardData {
  myTicketsTotal: number;
  myOpenTickets: number;
  myInProgressTickets: number;
  myWaitingTickets: number;
  myResolvedTickets: number;
  administrativePendingTotal: number;
  recentTickets: RecentTicket[];
}

const EMPTY_DATA: AdminStaffDashboardData = {
  myTicketsTotal: 0,
  myOpenTickets: 0,
  myInProgressTickets: 0,
  myWaitingTickets: 0,
  myResolvedTickets: 0,
  administrativePendingTotal: 0,
  recentTickets: [],
};

export default function AdminStaffDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminStaffDashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    const userRaw = localStorage.getItem('internal_user');

    if (!token || !userRaw) {
      navigate('/admin/login');
      return;
    }

    try {
      const user = JSON.parse(userRaw) as { role?: string };
      if (user.role !== 'admin_staff') {
        navigate('/admin/dashboard');
        return;
      }
    } catch {
      navigate('/admin/login');
      return;
    }

    void fetchDashboard();
  }, [navigate]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get<AdminStaffDashboardData>('/dashboard/admin-staff');
      setData({ ...EMPTY_DATA, ...(response.data || {}) });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'in_progress':
        return 'Em Atendimento';
      case 'waiting_user':
        return 'Aguardando Usuário';
      case 'resolved':
        return 'Resolvido';
      case 'closed':
        return 'Fechado';
      default:
        return status;
    }
  };

  if (!localStorage.getItem('internal_token')) {
    return null;
  }

  return (
    <div className="admin-staff-dashboard-page">
      <header className="asd-header">
        <div>
          <h1>🏢 Dashboard Auxiliar Administrativo</h1>
          <p>Visão dos chamados atribuídos a você</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/chamados')}>
          Ver meus chamados
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="asd-loading">Carregando dados...</div>
      ) : (
        <>
          <section className="asd-kpis">
            <div className="asd-kpi-card">
              <span className="asd-kpi-title">Meus chamados</span>
              <strong>{data.myTicketsTotal}</strong>
            </div>
            <div className="asd-kpi-card">
              <span className="asd-kpi-title">Abertos</span>
              <strong>{data.myOpenTickets}</strong>
            </div>
            <div className="asd-kpi-card">
              <span className="asd-kpi-title">Em atendimento</span>
              <strong>{data.myInProgressTickets}</strong>
            </div>
            <div className="asd-kpi-card">
              <span className="asd-kpi-title">Aguardando usuário</span>
              <strong>{data.myWaitingTickets}</strong>
            </div>
            <div className="asd-kpi-card">
              <span className="asd-kpi-title">Resolvidos</span>
              <strong>{data.myResolvedTickets}</strong>
            </div>
            <div className="asd-kpi-card">
              <span className="asd-kpi-title">Pendentes do administrativo</span>
              <strong>{data.administrativePendingTotal}</strong>
            </div>
          </section>

          <section className="asd-recent">
            <div className="asd-recent-header">
              <h2>Últimos chamados atribuídos a você</h2>
            </div>

            {data.recentTickets.length === 0 ? (
              <p className="asd-empty">Nenhum chamado atribuído no momento.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Status</th>
                    <th>Prioridade</th>
                    <th>Atualizado em</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTickets.map((ticket) => (
                    <tr key={ticket.id} onClick={() => navigate(`/admin/chamados/${ticket.id}`)}>
                      <td>{ticket.title}</td>
                      <td>{getStatusLabel(ticket.status)}</td>
                      <td>{ticket.priority}</td>
                      <td>{new Date(ticket.updated_at).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
