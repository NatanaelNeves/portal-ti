import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import { BACKEND_URL } from '../services/api';
import { initialsOf, RH_CATEGORIES } from '../components/rh/rhLabels';
import '../styles/RhReportsPage.css';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category?: string;
  created_at: string;
  resolved_at?: string;
  requester_name?: string;
  requester_email?: string;
  assigned_to_name?: string;
}

type Period = '7' | '30' | '90' | 'all';

// Mesmos nomes de assunto das outras telas do RH.
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(RH_CATEGORIES).map(([code, meta]) => [code, meta.label]),
);

const STATUS_LABELS: Record<string, string> = {
  open:                  'Aberto',
  in_progress:           'Em Atendimento',
  waiting_user:          'Aguardando o solicitante',
  aguardando_confirmacao:'Aguardando confirmação',
  // O RH nao aplica estes estados, mas precisa saber apresenta-los caso um
  // chamado compartilhado apareca com eles.
  aguardando_aquisicao:'Aguardando compra',
  aguardando_terceiros:'Aguardando terceiros',
  resolved:              'Resolvido',
  closed:                'Encerrado',
};



const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7',   label: 'Últimos 7 dias'  },
  { value: '30',  label: 'Últimos 30 dias' },
  { value: '90',  label: 'Últimos 90 dias' },
  { value: 'all', label: 'Todo o período'  },
];

export default function RhReportsPage() {
  const navigate = useNavigate();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [period, setPeriod] = useState<Period>('30');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const internalToken = localStorage.getItem('internal_token');

  useEffect(() => {
    if (!internalToken) { navigate('/admin/login'); return; }
    void loadTickets();
  }, []);


  const loadTickets = async () => {
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
      setAllTickets(all);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  // --- Filter logic ---
  const filtered = useCallback(() => {
    let tickets = [...allTickets];

    if (period !== 'all') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Number(period));
      tickets = tickets.filter(t => new Date(t.created_at) >= cutoff);
    }
    if (filterStatus !== 'all')   tickets = tickets.filter(t => t.status   === filterStatus);
    if (filterCategory !== 'all') tickets = tickets.filter(t => t.category === filterCategory);
    if (filterPriority !== 'all') tickets = tickets.filter(t => t.priority === filterPriority);

    return tickets;
  }, [allTickets, period, filterStatus, filterCategory, filterPriority]);

  const tickets = filtered();

  // --- KPIs ---
  const total    = tickets.length;
  const open     = tickets.filter(t => ['open','in_progress','waiting_user','aguardando_confirmacao','aguardando_aquisicao','aguardando_terceiros'].includes(t.status)).length;
  const resolved = tickets.filter(t => ['resolved','closed'].includes(t.status)).length;
  const resRate  = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const today    = new Date().toDateString();
  const newToday = allTickets.filter(t => new Date(t.created_at).toDateString() === today).length;

  const resolvedWithTime = tickets.filter(t => t.resolved_at);
  const avgResHours = resolvedWithTime.length > 0
    ? (resolvedWithTime.reduce((sum, t) => {
        return sum + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) / 3600000;
      }, 0) / resolvedWithTime.length).toFixed(1)
    : '—';


  // By category (pie)
  const catCount: Record<string, number> = {};
  tickets.forEach(t => { const c = t.category || 'RH_OUTROS'; catCount[c] = (catCount[c] || 0) + 1; });
  const byCategory = Object.entries(catCount)
    .map(([k, v]) => ({ name: CATEGORY_LABELS[k] || k, value: v }))
    .sort((a, b) => b.value - a.value);

  // Monthly trend (area chart, last 6 months) — always uses allTickets for historical view
  const monthMap: Record<string, { abertos: number; resolvidos: number }> = {};
  allTickets.forEach(t => {
    const d = new Date(t.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { abertos: 0, resolvidos: 0 };
    monthMap[key].abertos++;
    if (['resolved','closed'].includes(t.status)) monthMap[key].resolvidos++;
  });
  const monthlyTrend = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, vals]) => {
      const [year, month] = key.split('-');
      return {
        month: new Date(Number(year), Number(month) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        ...vals,
      };
    });

  // By team member
  interface MemberStat {
    name: string;
    total: number;
    resolved: number;
    open: number;
    avgHours: string;
  }
  const memberMap: Record<string, { total: number; resolved: number; open: number; resHours: number[] }> = {};
  tickets.forEach(t => {
    const name = t.assigned_to_name || 'Não atribuído';
    if (!memberMap[name]) memberMap[name] = { total: 0, resolved: 0, open: 0, resHours: [] };
    memberMap[name].total++;
    if (['resolved', 'closed'].includes(t.status)) {
      memberMap[name].resolved++;
      if (t.resolved_at) {
        memberMap[name].resHours.push(
          (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 3600000
        );
      }
    } else {
      memberMap[name].open++;
    }
  });
  const byMember: MemberStat[] = Object.entries(memberMap)
    .map(([name, s]) => ({
      name,
      total: s.total,
      resolved: s.resolved,
      open: s.open,
      avgHours: s.resHours.length > 0
        ? (s.resHours.reduce((a, b) => a + b, 0) / s.resHours.length).toFixed(1)
        : '—',
    }))
    .sort((a, b) => b.total - a.total);


  // --- Exports ---
  const exportCSV = () => {
    const rows = [
      ['ID', 'Título', 'Status', 'Prioridade', 'Categoria', 'Solicitante', 'E-mail', 'Responsável', 'Criado em', 'Resolvido em'],
      ...tickets.map(t => [
        t.id, t.title,
        STATUS_LABELS[t.status]   || t.status,
        t.priority,
        CATEGORY_LABELS[t.category || ''] || t.category || '',
        t.requester_name  || '',
        t.requester_email || '',
        t.assigned_to_name || '',
        new Date(t.created_at).toLocaleString('pt-BR'),
        t.resolved_at ? new Date(t.resolved_at).toLocaleString('pt-BR') : '',
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `relatorio-rh-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const data = tickets.map(t => ({
      ID:          t.id,
      Título:      t.title,
      Status:      STATUS_LABELS[t.status] || t.status,
      Prioridade:  t.priority,
      Categoria:   CATEGORY_LABELS[t.category || ''] || t.category || '',
      Solicitante: t.requester_name  || '',
      Email:       t.requester_email || '',
      Responsável: t.assigned_to_name || '',
      'Criado em':    new Date(t.created_at).toLocaleString('pt-BR'),
      'Resolvido em': t.resolved_at ? new Date(t.resolved_at).toLocaleString('pt-BR') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chamados RH');
    XLSX.writeFile(wb, `relatorio-rh-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Relatório do RH', 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}  |  Período: ${PERIOD_OPTIONS.find(p => p.value === period)?.label}  |  Total: ${total} chamados`, 14, 23);

    // KPI summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Métricas', 14, 32);

    autoTable(doc, {
      startY: 35,
      head: [['Total', 'Em Aberto', 'Resolvidos', 'Taxa Resolução', 'Abertos Hoje', 'Tempo Médio']],
      body: [[total, open, resolved, `${resRate}%`, newToday, `${avgResHours}h`]],
      theme: 'grid',
      headStyles: { fillColor: [91, 63, 208] },
      styles: { fontSize: 10 },
    });

    // Tickets table
    const finalY = (doc as any).lastAutoTable?.finalY ?? 60;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Chamados', 14, finalY + 10);

    autoTable(doc, {
      startY: finalY + 13,
      head: [['Título', 'Status', 'Prioridade', 'Categoria', 'Solicitante', 'Criado em']],
      body: tickets.map(t => [
        t.title,
        STATUS_LABELS[t.status] || t.status,
        t.priority,
        CATEGORY_LABELS[t.category || ''] || t.category || '',
        t.requester_name || '',
        new Date(t.created_at).toLocaleDateString('pt-BR'),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [91, 63, 208] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 60 } },
    });

    doc.save(`relatorio-rh-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const kpis = [
    { key: 'total', icon: 'ti-inbox', value: String(total), label: total === 1 ? 'chamado recebido' : 'chamados recebidos' },
    { key: 'open', icon: 'ti-hourglass', value: String(open), label: 'ainda em aberto' },
    { key: 'resolved', icon: 'ti-circle-check', value: String(resolved), label: total > 0 ? `resolvidos (${resRate}% do total)` : 'resolvidos' },
    { key: 'time', icon: 'ti-clock', value: friendlyDuration(avgResHours), label: 'em média para resolver' },
  ];

  const maxCategory = Math.max(1, ...byCategory.map((c) => c.value));
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? '';
  const extraFilters = (filterStatus !== 'all' ? 1 : 0) + (filterCategory !== 'all' ? 1 : 0) + (filterPriority !== 'all' ? 1 : 0);

  return (
    <div className="pub-page rh-page rhrep">
      <header className="rhrep-head">
        <div className="rh-wrap rhrep-head__inner">
          <div>
            <h1>Relatórios do RH</h1>
            <p>Quantos chamados chegaram, quantos foram resolvidos e quanto tempo levou.</p>
          </div>
          <div className="rhrep-export" aria-label="Baixar relatório">
            <button type="button" className="pub-btn pub-btn--primary" onClick={exportExcel} disabled={loading || total === 0}>
              <i className="ti ti-file-spreadsheet" aria-hidden="true" />
              Baixar planilha
            </button>
            <button type="button" className="pub-btn pub-btn--ghost" onClick={() => void exportPDF()} disabled={loading || total === 0}>
              <i className="ti ti-file-type-pdf" aria-hidden="true" />
              Baixar PDF
            </button>
            <button type="button" className="rhrep-csv" onClick={exportCSV} disabled={loading || total === 0}>
              ou CSV
            </button>
          </div>
        </div>

        <div className="rh-wrap rhrep-filters">
          <div className="rhrep-periods" role="group" aria-label="Período">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className="rhrep-period"
                aria-pressed={period === option.value}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <details className="rhrep-more" open={extraFilters > 0 || undefined}>
            <summary>
              <i className="ti ti-adjustments-horizontal" aria-hidden="true" />
              Mais filtros
              {extraFilters > 0 && <span className="rhrep-more__count">{extraFilters}</span>}
            </summary>
            <div className="rhrep-more__grid">
              <label>
                <span>Assunto</span>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="all">Todos os assuntos</option>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label>
                <span>Situação</span>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">Todas as situações</option>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label>
                <span>Prioridade</span>
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                  <option value="all">Todas as prioridades</option>
                  <option value="critical">Crítica</option>
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </label>
              {extraFilters > 0 && (
                <button
                  type="button"
                  className="rhrep-clear"
                  onClick={() => { setFilterCategory('all'); setFilterStatus('all'); setFilterPriority('all'); }}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </details>
        </div>
      </header>

      <div className="rh-wrap rhrep-body">
        {error && (
          <div className="pub-alert rhrep-alert" role="alert">
            <i className="ti ti-alert-circle" aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={() => void loadTickets()}>Tentar de novo</button>
          </div>
        )}

        {loading ? (
          <div className="rhrep-kpis">{[0, 1, 2, 3].map((n) => <div key={n} className="rh-skeleton" />)}</div>
        ) : (
          <>
            <p className="rhrep-scope">
              Mostrando <strong>{periodLabel.toLowerCase()}</strong>
              {extraFilters > 0 && `, com ${extraFilters} ${extraFilters === 1 ? 'filtro' : 'filtros'}`}.
              {newToday > 0 && (newToday === 1 ? ' Hoje chegou 1 chamado.' : ` Hoje chegaram ${newToday} chamados.`)}
            </p>

            <div className="rhrep-kpis">
              {kpis.map((kpi) => (
                <div key={kpi.key} className={`rh-card rhrep-kpi rhrep-kpi--${kpi.key}`}>
                  <i className={`ti ${kpi.icon}`} aria-hidden="true" />
                  <strong>{kpi.value}</strong>
                  <span>{kpi.label}</span>
                </div>
              ))}
            </div>

            {total === 0 ? (
              <div className="rh-card rh-empty">
                <span className="pub-gicon pub-gicon--rh" aria-hidden="true"><i className="ti ti-chart-bar-off" /></span>
                <h3>Nenhum chamado neste período</h3>
                <p>Escolha um período maior ou limpe os filtros para ver os números.</p>
              </div>
            ) : (
              <div className="rhrep-grid">
                <section className="rh-card rhrep-panel" aria-labelledby="rhrep-cat-title">
                  <h2 id="rhrep-cat-title">Assuntos mais pedidos</h2>
                  <ul className="rhrep-bars">
                    {byCategory.map((cat) => (
                      <li key={cat.name}>
                        <div className="rhrep-bars__label">
                          <span>{cat.name}</span>
                          <strong>{cat.value}</strong>
                        </div>
                        <div className="rhrep-bars__track">
                          <span style={{ width: `${Math.max(4, (cat.value / maxCategory) * 100)}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rh-card rhrep-panel" aria-labelledby="rhrep-month-title">
                  <h2 id="rhrep-month-title">Chamados por mês</h2>
                  <p className="rhrep-panel__lead">Últimos 6 meses, sem contar os filtros.</p>
                  {monthlyTrend.length === 0 ? (
                    <p className="rhrep-panel__empty">Ainda não há meses para comparar.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={monthlyTrend} margin={{ top: 10, right: 8, left: -18, bottom: 0 }} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ebe9f2" />
                        <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#5a6b63' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#5a6b63' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(91,63,208,0.06)' }}
                          formatter={(v: unknown, name?: string) => [`${v} chamados`, name === 'abertos' ? 'Recebidos' : 'Resolvidos']}
                        />
                        <Legend formatter={(val: string) => (val === 'abertos' ? 'Recebidos' : 'Resolvidos')} />
                        <Bar dataKey="abertos" fill="#5b3fd0" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="resolvidos" fill="#1f9d5c" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </section>

                <section className="rh-card rhrep-panel rhrep-panel--wide" aria-labelledby="rhrep-team-title">
                  <h2 id="rhrep-team-title">Atendimentos por pessoa da equipe</h2>
                  <ul className="rhrep-team">
                    {byMember.map((member) => {
                      const rate = member.total > 0 ? Math.round((member.resolved / member.total) * 100) : 0;
                      const unassigned = member.name === 'Não atribuído';
                      return (
                        <li key={member.name} className={unassigned ? 'is-unassigned' : ''}>
                          <span className="rh-avatar" aria-hidden="true">{unassigned ? '?' : initialsOf(member.name)}</span>
                          <div className="rhrep-team__who">
                            <strong>{unassigned ? 'Sem responsável' : member.name}</strong>
                            <span>
                              {member.total} {member.total === 1 ? 'chamado' : 'chamados'}, {member.resolved} {member.resolved === 1 ? 'resolvido' : 'resolvidos'}
                              {member.open > 0 && `, ${member.open} em aberto`}
                            </span>
                          </div>
                          <div className="rhrep-team__rate" aria-label={`${rate}% resolvidos`}>
                            <div className="rhrep-bars__track"><span style={{ width: `${rate}%` }} /></div>
                            <span>{rate}%</span>
                          </div>
                          <span className="rhrep-team__time">
                            {member.avgHours === '—' ? 'Sem tempo médio' : `Média de ${friendlyDuration(member.avgHours)}`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** "3 horas", "2 dias" — tempo como se fala. */
function friendlyDuration(hours: string) {
  const value = Number(hours);
  if (!Number.isFinite(value)) return '—';
  if (value < 1) return `${Math.max(1, Math.round(value * 60))} min`;
  if (value < 24) {
    const h = Math.round(value);
    return `${h} ${h === 1 ? 'hora' : 'horas'}`;
  }
  const days = Math.round((value / 24) * 10) / 10;
  return `${String(days).replace('.', ',')} ${days === 1 ? 'dia' : 'dias'}`;
}
