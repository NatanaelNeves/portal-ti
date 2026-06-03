import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import api from '../services/api';

interface KpiData {
  sla: { overall: number; byPriority: { priority: string; total: number; withinSla: number; compliance: number; slaHours: number }[] };
  satisfaction: { avg: number; total: number; positive: number; negative: number };
  volume: { weekly: { week: string; total: number; resolved: number }[] };
  categories: { category: string; total: number }[];
  openByAge: { fresh: number; one_day: number; three_days: number; old: number };
  kb: { title: string; views_count: number; helpful_yes: number; helpful_no: number }[];
}

const PRIORITY_LABEL: Record<string, string> = { urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa' };
const SLA_COLOR = (pct: number) => pct >= 90 ? '#059669' : pct >= 70 ? '#d97706' : '#dc2626';

const Stat = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', flex: 1, minWidth: 140 }}>
    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.25rem' }}>{label}</div>
    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: color || '#1e293b', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{sub}</div>}
  </div>
);

export default function KpiDashboardPage() {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/kpis')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem', color: '#94a3b8' }}>Carregando KPIs...</div>;
  if (!data) return <div style={{ padding: '2rem', color: '#dc2626' }}>Erro ao carregar dados.</div>;

  const ageData = [
    { name: '< 8h', value: Number(data.openByAge.fresh || 0), color: '#059669' },
    { name: '8–24h', value: Number(data.openByAge.one_day || 0), color: '#d97706' },
    { name: '1–3d', value: Number(data.openByAge.three_days || 0), color: '#f97316' },
    { name: '> 3d', value: Number(data.openByAge.old || 0), color: '#dc2626' },
  ];

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Dashboard de KPIs</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.85rem' }}>Últimos 30 dias • Atualizado agora</p>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <Stat label="SLA Global" value={`${data.sla.overall}%`} sub="tickets dentro do prazo" color={SLA_COLOR(data.sla.overall)} />
        <Stat label="Satisfação Média" value={data.satisfaction.avg > 0 ? `${data.satisfaction.avg}/5` : '—'} sub={`${data.satisfaction.total} avaliações`} color="#6366f1" />
        <Stat label="👍 Positivos" value={data.satisfaction.positive} sub="avaliações ≥ 4 estrelas" color="#059669" />
        <Stat label="👎 Negativos" value={data.satisfaction.negative} sub="avaliações ≤ 2 estrelas" color="#dc2626" />
      </div>

      {/* SLA por prioridade */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>SLA por Prioridade (30d)</h2>
          {data.sla.byPriority.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sem dados.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.sla.byPriority.map(p => (
                <div key={p.priority}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                    <span>{PRIORITY_LABEL[p.priority] || p.priority} (SLA: {p.slaHours}h)</span>
                    <span style={{ fontWeight: 700, color: SLA_COLOR(p.compliance) }}>{p.compliance}% <small style={{ fontWeight: 400, color: '#94a3b8' }}>({p.withinSla}/{p.total})</small></span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: '99px', height: 8 }}>
                    <div style={{ width: `${p.compliance}%`, background: SLA_COLOR(p.compliance), borderRadius: '99px', height: 8, transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tickets abertos por idade */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Tickets Abertos por Idade</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={ageData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''} labelLine={false} fontSize={11}>
                {ageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume semanal */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Volume Semanal (12 semanas)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.volume.weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke="#6366f1" name="Abertos" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="resolved" stroke="#059669" name="Resolvidos" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top categorias + KB */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Top Categorias (30d)</h2>
          {data.categories.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sem dados.</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.categories} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="category" type="category" width={120} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} name="Chamados" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Base de Conhecimento</h2>
          {data.kb.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sem artigos com feedback.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.kb.map((a, i) => {
                const total = a.helpful_yes + a.helpful_no;
                const pct = total > 0 ? Math.round((a.helpful_yes / total) * 100) : 0;
                return (
                  <div key={i} style={{ fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{a.title}</span>
                      <span style={{ marginLeft: '0.5rem', color: pct >= 70 ? '#059669' : '#dc2626', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {total > 0 ? `${pct}% útil` : `${a.views_count} views`}
                      </span>
                    </div>
                    {total > 0 && (
                      <div style={{ background: '#f1f5f9', borderRadius: '99px', height: 5 }}>
                        <div style={{ width: `${pct}%`, background: pct >= 70 ? '#059669' : '#dc2626', borderRadius: '99px', height: 5 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
