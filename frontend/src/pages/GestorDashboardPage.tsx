import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import '../styles/GestorDashboardPage.css';
import { BACKEND_URL } from '../services/api';

interface GestorData {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number;
  userSatisfaction: number;
  monthlyTrend: Array<{ month: string; tickets: number }>;
  topIssues: Array<{ title: string; count: number }>;
  topIssuesByTeam?: Record<string, Array<{ title: string; count: number }>>;
  departmentStats: Record<string, { tickets: number; resolved: number }>;
  teamSummaries: Array<{
    key: string;
    label: string;
    totalTickets: number;
    resolvedTickets: number;
    openTickets: number;
    inProgressTickets: number;
    waitingTickets: number;
    handledToday: number;
    activeStaff: number;
    avgResolutionHours: number;
  }>;
  staffPerformance: Array<{
    id: string;
    name: string;
    role: string;
    team: string;
    teamLabel: string;
    totalTickets: number;
    resolvedTickets: number;
    openTickets: number;
    inProgressTickets: number;
    waitingTickets: number;
    handledToday: number;
    avgResolutionHours: number;
    lastActivityDate?: string;
  }>;
}

interface InventorySummary {
  equipmentInUse: number;
  equipmentInStock: number;
  equipmentInMaintenance: number;
  totalNotebooks: number;
  totalPeripherals: number;
  pendingPurchases: number;
  equipmentWithoutTerms: number;
}

interface Movement {
  id: string;
  type: string;
  equipment_code: string;
  equipment_type: string;
  responsible_name: string;
  unit: string;
  date: string;
}

interface Purchase {
  id: string;
  request_number: string;
  item_name: string;
  item_type: string;
  quantity: number;
  status: string;
  estimated_value: number | null;
  actual_value: number | null;
  created_at: string;
}

export default function GestorDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<GestorData | null>(null);
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    const token = localStorage.getItem('internal_token');
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      const [gestorRes, inventoryRes, movementsRes, purchasesRes] = await Promise.allSettled([
        fetch(`${BACKEND_URL}/api/dashboard/gestor`, { headers }),
        fetch(`${BACKEND_URL}/api/inventory/dashboard/summary`, { headers }),
        fetch(`${BACKEND_URL}/api/inventory/movements/recent?limit=5`, { headers }),
        fetch(`${BACKEND_URL}/api/inventory/requisitions`, { headers }),
      ]);

      if (gestorRes.status === 'fulfilled' && gestorRes.value.ok) {
        setData(await gestorRes.value.json());
      }
      if (inventoryRes.status === 'fulfilled' && inventoryRes.value.ok) {
        setInventory(await inventoryRes.value.json());
      }
      if (movementsRes.status === 'fulfilled' && movementsRes.value.ok) {
        setMovements(await movementsRes.value.json());
      }
      if (purchasesRes.status === 'fulfilled' && purchasesRes.value.ok) {
        const raw = await purchasesRes.value.json();
        const list: Purchase[] = Array.isArray(raw) ? raw : (raw.requisitions || raw.data || []);
        setPurchases(list.slice(0, 6));
      }
      setLastUpdate(new Date());
    } catch (err: any) {
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token) { navigate('/admin/login'); return; }
    const user = localStorage.getItem('internal_user');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.role !== 'manager' && userData.role !== 'gestor') {
        navigate('/admin/dashboard');
        return;
      }
    }
    fetchAll();
  }, [navigate, fetchAll]);

  if (!localStorage.getItem('internal_token')) return null;

  const resolutionRate = data && data.totalTickets > 0
    ? ((data.resolvedTickets / data.totalTickets) * 100).toFixed(0)
    : '0';

  const pendingTickets = data
    ? data.openTickets + data.inProgressTickets + data.waitingTickets
    : 0;

  const getPurchaseStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Pendente', approved: 'Aprovado', purchased: 'Comprado',
      rejected: 'Rejeitado', cancelled: 'Cancelado',
    };
    return map[status] || status;
  };

  const translateIssueTitle = (title: string) => {
    const map: Record<string, string> = {
      incident: 'Incidente',
      request: 'Solicitação',
      problem: 'Problema',
      change: 'Mudança',
      hardware: 'Hardware',
      software: 'Software',
      network: 'Rede',
      access: 'Acesso',
      other: 'Outro',
    };
    return map[title?.toLowerCase()] || title;
  };

  const getPurchaseStatusClass = (status: string) => {
    const map: Record<string, string> = {
      pending: 'badge-warning', approved: 'badge-info', purchased: 'badge-success',
      rejected: 'badge-danger', cancelled: 'badge-neutral',
    };
    return map[status] || 'badge-neutral';
  };

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      admin: 'Administrador',
      it_staff: 'TI',
      admin_staff: 'Auxiliar Administrativo',
    };

    return map[role] || role;
  };

  const staffByTeam = (data?.staffPerformance || []).reduce<Record<string, GestorData['staffPerformance']>>((acc, member) => {
    const key = member.team || 'ti';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(member);
    return acc;
  }, {});

  const formattedUpdate = lastUpdate
    ? `${lastUpdate.toLocaleDateString('pt-BR')} as ${lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <div className="gestor-dashboard-page">
      <header className="gd-header">
        <div className="gd-header-left">
          <h1>📊 Dashboard do Gestor</h1>
          <p>Visão consolidada de chamados, inventário e compras</p>
        </div>
        <div className="gd-header-right">
          {formattedUpdate && <span className="gd-update-chip">🕐 {formattedUpdate}</span>}
          <button className="btn btn-secondary btn-sm" onClick={fetchAll} disabled={loading}>
            🔄 Atualizar
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/relatorios')}>
            📈 Relatórios
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="gd-loading"><div className="gd-spinner"></div><p>Carregando...</p></div>
      ) : (
        <div className="gd-content">

          {/* Chamados */}
          <section className="gd-section">
            <h2 className="gd-section-title">🎫 Chamados Gerais</h2>
            <div className="gd-kpi-grid">
              <div className="gd-kpi-card">
                <div className="gd-kpi-icon">🎫</div>
                <div className="gd-kpi-value">{data?.totalTickets ?? '—'}</div>
                <div className="gd-kpi-label">Total de Chamados</div>
              </div>
              <div className="gd-kpi-card accent-green">
                <div className="gd-kpi-icon">✅</div>
                <div className="gd-kpi-value">{data?.resolvedTickets ?? '—'}</div>
                <div className="gd-kpi-label">Resolvidos</div>
                <div className="gd-kpi-sub">{resolutionRate}% de resolução</div>
              </div>
              <div className="gd-kpi-card accent-blue">
                <div className="gd-kpi-icon">⏱️</div>
                <div className="gd-kpi-value">{data?.averageResolutionTime ?? '—'}h</div>
                <div className="gd-kpi-label">Tempo Médio</div>
                <div className="gd-kpi-sub">de resolução</div>
              </div>
              <div className="gd-kpi-card accent-orange">
                <div className="gd-kpi-icon">🔔</div>
                <div className="gd-kpi-value">{data ? pendingTickets : '—'}</div>
                <div className="gd-kpi-label">Pendentes</div>
                <div className="gd-kpi-sub">Abertos, em atendimento e aguardando</div>
              </div>
            </div>
          </section>

          {data?.teamSummaries && data.teamSummaries.length > 0 && (
            <section className="gd-section">
              <h2 className="gd-section-title">👥 Performance por Equipe</h2>
              <div className="gd-team-grid">
                {data.teamSummaries.map((team) => {
                  const teamPending = team.openTickets + team.inProgressTickets + team.waitingTickets;

                  return (
                    <article key={team.key} className={`gd-team-card gd-team-${team.key}`}>
                      <div className="gd-team-card-header">
                        <div>
                          <h3>{team.label}</h3>
                          <p>{team.activeStaff} colaborador(es) ativo(s)</p>
                        </div>
                        <span className="gd-team-chip">{team.handledToday} atualizado(s) hoje</span>
                      </div>

                      <div className="gd-team-stats">
                        <div>
                          <strong>{team.totalTickets}</strong>
                          <span>Total</span>
                        </div>
                        <div>
                          <strong>{team.resolvedTickets}</strong>
                          <span>Resolvidos</span>
                        </div>
                        <div>
                          <strong>{teamPending}</strong>
                          <span>Pendentes</span>
                        </div>
                        <div>
                          <strong>{team.avgResolutionHours}h</strong>
                          <span>Tempo médio</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {data?.staffPerformance && data.staffPerformance.length > 0 && (
            <section className="gd-section">
              <h2 className="gd-section-title">🧑‍💼 Atendimentos por Responsável</h2>
              <div className="gd-staff-grid">
                {['ti', 'administrativo'].filter((teamKey) => staffByTeam[teamKey]?.length > 0).map((teamKey) => {
                  const teamMembers = staffByTeam[teamKey];
                  const teamLabel = teamMembers[0]?.teamLabel || (teamKey === 'administrativo' ? 'Auxiliar Administrativo' : 'TI');

                  return (
                    <div key={teamKey} className="gd-table-card">
                      <div className="gd-table-header">
                        <h3>{teamLabel}</h3>
                        <span className="gd-team-chip">{teamMembers.length} pessoa(s)</span>
                      </div>

                      <table className="gd-table">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Perfil</th>
                            <th>Total</th>
                            <th>Resolvidos</th>
                            <th>Abertos</th>
                            <th>Em atendimento</th>
                            <th>Aguardando</th>
                            <th>Hoje</th>
                            <th>Tempo médio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamMembers.map((member) => (
                            <tr key={member.id}>
                              <td>{member.name}</td>
                              <td>
                                <span className={`gd-role-pill gd-role-${member.team}`}>
                                  {getRoleLabel(member.role)}
                                </span>
                              </td>
                              <td>{member.totalTickets}</td>
                              <td>{member.resolvedTickets}</td>
                              <td>{member.openTickets}</td>
                              <td>{member.inProgressTickets}</td>
                              <td>{member.waitingTickets}</td>
                              <td>{member.handledToday}</td>
                              <td>{member.avgResolutionHours}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Inventário */}
          <section className="gd-section">
            <h2 className="gd-section-title">🖥️ Inventário de Equipamentos</h2>
            <div className="gd-kpi-grid">
              <div className="gd-kpi-card">
                <div className="gd-kpi-icon">💻</div>
                <div className="gd-kpi-value">{inventory?.totalNotebooks ?? '—'}</div>
                <div className="gd-kpi-label">Notebooks</div>
              </div>
              <div className="gd-kpi-card">
                <div className="gd-kpi-icon">🖥️</div>
                <div className="gd-kpi-value">{inventory?.totalPeripherals ?? '—'}</div>
                <div className="gd-kpi-label">Periféricos</div>
              </div>
              <div className="gd-kpi-card accent-green">
                <div className="gd-kpi-icon">✅</div>
                <div className="gd-kpi-value">{inventory?.equipmentInUse ?? '—'}</div>
                <div className="gd-kpi-label">Em Uso</div>
              </div>
              <div className="gd-kpi-card accent-blue">
                <div className="gd-kpi-icon">📦</div>
                <div className="gd-kpi-value">{inventory?.equipmentInStock ?? '—'}</div>
                <div className="gd-kpi-label">Disponível</div>
              </div>
              <div className="gd-kpi-card accent-red">
                <div className="gd-kpi-icon">🔧</div>
                <div className="gd-kpi-value">{inventory?.equipmentInMaintenance ?? '—'}</div>
                <div className="gd-kpi-label">Manutenção</div>
              </div>
              <div className={`gd-kpi-card ${(inventory?.pendingPurchases ?? 0) > 0 ? 'accent-orange' : ''}`}>
                <div className="gd-kpi-icon">🛒</div>
                <div className="gd-kpi-value">{inventory?.pendingPurchases ?? '—'}</div>
                <div className="gd-kpi-label">Compras Pendentes</div>
              </div>
              {(inventory?.equipmentWithoutTerms ?? 0) > 0 && (
                <div className="gd-kpi-card accent-orange">
                  <div className="gd-kpi-icon">⚠️</div>
                  <div className="gd-kpi-value">{inventory?.equipmentWithoutTerms}</div>
                  <div className="gd-kpi-label">Sem Termo de Responsabilidade</div>
                </div>
              )}
            </div>
          </section>

          {/* Gráfico + Top Issues */}
          <div className="gd-charts-row">
            <div className="gd-chart-card">
              <h3>📈 Tendência Mensal de Chamados</h3>
              {data?.monthlyTrend && data.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip formatter={(value: number | undefined) => [value ?? 0, 'Chamados']} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                    <Legend />
                    <Bar dataKey="tickets" name="Chamados" fill="#4A90E2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="gd-no-data">Sem dados de tendência disponíveis</div>
              )}
            </div>
            <div className="gd-chart-card">
              <h3>🔥 Principais Problemas</h3>
              {data?.topIssuesByTeam && Object.keys(data.topIssuesByTeam).length > 0 ? (
                <div className="gd-issues-by-team">
                  {['ti', 'administrativo'].filter(k => data.topIssuesByTeam![k]?.length > 0).map(teamKey => (
                    <div key={teamKey} className="gd-issues-team-block">
                      <div className="gd-issues-team-label">{teamKey === 'administrativo' ? 'Auxiliar Administrativo' : 'TI'}</div>
                      <div className="gd-issues-list">
                        {data.topIssuesByTeam![teamKey].map((issue, idx) => (
                          <div key={idx} className="gd-issue-item">
                            <span className="gd-issue-rank">#{idx + 1}</span>
                            <span className="gd-issue-title">{translateIssueTitle(issue.title)}</span>
                            <span className="gd-issue-count">{issue.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : data?.topIssues && data.topIssues.length > 0 ? (
                <div className="gd-issues-list">
                  {data.topIssues.slice(0, 6).map((issue, idx) => (
                    <div key={idx} className="gd-issue-item">
                      <span className="gd-issue-rank">#{idx + 1}</span>
                      <span className="gd-issue-title">{translateIssueTitle(issue.title)}</span>
                      <span className="gd-issue-count">{issue.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gd-no-data">Sem dados disponíveis</div>
              )}
            </div>
          </div>

          {/* Movimentações + Compras */}
          <div className="gd-tables-row">
            <div className="gd-table-card">
              <div className="gd-table-header">
                <h3>🔄 Últimas Movimentações</h3>
                <button className="gd-btn-link" onClick={() => navigate('/gestor/solicitacoes?tab=equipment')}>Ver todas →</button>
              </div>
              {movements.length > 0 ? (
                <table className="gd-table">
                  <thead>
                    <tr><th>Tipo</th><th>Equipamento</th><th>Responsável</th><th>Unidade</th><th>Data</th></tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td>{m.type === 'delivery' ? '📤 Entrega' : '📥 Devolução'}</td>
                        <td><code className="gd-code">{m.equipment_code}</code></td>
                        <td>{m.responsible_name}</td>
                        <td>{m.unit}</td>
                        <td>{new Date(m.date).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="gd-no-data">Nenhuma movimentação recente</div>
              )}
            </div>

            <div className="gd-table-card">
              <div className="gd-table-header">
                <h3>🛒 Últimas Requisições de Compra</h3>
                <button className="gd-btn-link" onClick={() => navigate('/gestor/solicitacoes?tab=purchases')}>Ver todas →</button>
              </div>
              {purchases.length > 0 ? (
                <table className="gd-table">
                  <thead>
                    <tr><th>Nº</th><th>Item</th><th>Qtd</th><th>Status</th><th>Data</th></tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => (
                      <tr key={p.id}>
                        <td><code className="gd-code">{p.request_number}</code></td>
                        <td>{p.item_name}</td>
                        <td>{p.quantity}</td>
                        <td><span className={`gd-badge ${getPurchaseStatusClass(p.status)}`}>{getPurchaseStatusLabel(p.status)}</span></td>
                        <td>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="gd-no-data">Nenhuma requisição encontrada</div>
              )}
            </div>
          </div>

          {/* Departamentos */}
          {data?.departmentStats && Object.keys(data.departmentStats).length > 0 && (
            <section className="gd-section">
              <h2 className="gd-section-title">🏢 Chamados por Departamento</h2>
              <div className="gd-table-card">
                <table className="gd-table">
                  <thead>
                    <tr><th>Departamento</th><th>Chamados</th><th>Resolvidos</th><th>Taxa de Resolução</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.departmentStats).map(([dept, stats]) => {
                      const rate = stats.tickets > 0 ? (stats.resolved / stats.tickets) * 100 : 0;
                      return (
                        <tr key={dept}>
                          <td>{dept}</td>
                          <td>{stats.tickets}</td>
                          <td>{stats.resolved}</td>
                          <td>
                            <div className="gd-progress-wrap">
                              <div className="gd-progress-bar">
                                <div className="gd-progress-fill" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="gd-progress-label">{rate.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  );
}
