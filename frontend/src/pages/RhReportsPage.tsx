import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
  PieChart, Pie, Legend,
  AreaChart, Area,
} from 'recharts';
import * as XLSX from 'xlsx';
import { BACKEND_URL } from '../services/api';
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

const CATEGORY_LABELS: Record<string, string> = {
  RH_ATESTADO:    'Atestado Médico',
  RH_PONTO:       'Ajuste de Ponto',
  RH_FOLHA:       'Folha de Pagamento',
  RH_DECLARACAO:  'Declaração',
  RH_BENEFICIOS:  'Benefícios',
  RH_OUTROS:      'Outros RH',
  RH_CONFIDENCIAL:'Confidencial',
};

const STATUS_LABELS: Record<string, string> = {
  open:                  'Aberto',
  in_progress:           'Em Atendimento',
  waiting_user:          'Aguardando',
  aguardando_confirmacao:'Ag. Confirmação',
  resolved:              'Resolvido',
  closed:                'Fechado',
};

const STATUS_COLORS: Record<string, string> = {
  open:                  '#ef4444',
  in_progress:           '#f59e0b',
  waiting_user:          '#8b5cf6',
  aguardando_confirmacao:'#6366f1',
  resolved:              '#10b981',
  closed:                '#6b7280',
};

const PIE_COLORS = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ec4899','#8b5cf6'];

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

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

  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
  const open     = tickets.filter(t => ['open','in_progress','waiting_user','aguardando_confirmacao'].includes(t.status)).length;
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

  // By status (horizontal bar)
  const byStatus = Object.keys(STATUS_LABELS).map(key => ({
    name: STATUS_LABELS[key],
    value: tickets.filter(t => t.status === key).length,
    color: STATUS_COLORS[key],
  })).filter(d => d.value > 0);

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
    setShowExportMenu(false);
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
    setShowExportMenu(false);
  };

  const exportPDF = async () => {
    setShowExportMenu(false);
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Relatório — Recursos Humanos', 14, 16);

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
      headStyles: { fillColor: [124, 58, 237] },
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
      headStyles: { fillColor: [124, 58, 237] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 60 } },
    });

    doc.save(`relatorio-rh-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const kpis = [
    { cls: 'rhr-kpi--total',    icon: '📋', value: total,        label: 'Total Chamados'    },
    { cls: 'rhr-kpi--open',     icon: '🟡', value: open,         label: 'Em Aberto'         },
    { cls: 'rhr-kpi--resolved', icon: '✅', value: resolved,     label: 'Resolvidos'        },
    { cls: 'rhr-kpi--rate',     icon: '📈', value: `${resRate}%`,label: 'Taxa de Resolução' },
    { cls: 'rhr-kpi--today',    icon: '📥', value: newToday,     label: 'Abertos Hoje'      },
    { cls: 'rhr-kpi--time',     icon: '⏱',  value: `${avgResHours}h`, label: 'Tempo Médio Resolução' },
  ];

  return (
    <div className="rhr-page">
      {/* Header */}
      <div className="rhr-header">
        <div className="rhr-header-info">
          <h1 className="rhr-title">Relatórios — Recursos Humanos</h1>
          <p className="rhr-subtitle">Análise e exportação de chamados do departamento de RH</p>
        </div>
        <div className="rhr-header-actions">
          <button className="rhr-btn rhr-btn-secondary" onClick={() => navigate('/rh/dashboard')}>
            ← Dashboard
          </button>
          <button
            className="rhr-btn rhr-btn-secondary"
            onClick={() => { void loadTickets(); }}
            disabled={loading}
          >
            ↻ Atualizar
          </button>
          <div className="rhr-export-wrap" ref={exportRef}>
            <button
              className="rhr-btn rhr-btn-export"
              onClick={() => setShowExportMenu(v => !v)}
            >
              ⬇ Exportar
            </button>
            {showExportMenu && (
              <div className="rhr-export-dropdown">
                <button className="rhr-export-item" onClick={exportCSV}>
                  <span className="rhr-export-icon">📄</span> Exportar CSV
                </button>
                <button className="rhr-export-item" onClick={exportExcel}>
                  <span className="rhr-export-icon">📊</span> Exportar Excel (.xlsx)
                </button>
                <button className="rhr-export-item" onClick={() => void exportPDF()}>
                  <span className="rhr-export-icon">📑</span> Exportar PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="rhr-error">{error}</div>}

      {/* Filters */}
      <div className="rhr-filters">
        <span className="rhr-filter-label">Filtros:</span>
        <select className="rhr-filter-select" value={period} onChange={e => setPeriod(e.target.value as Period)}>
          {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="rhr-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="rhr-filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">Todas as categorias</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="rhr-filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">Todas as prioridades</option>
          <option value="critical">Crítica</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
      </div>

      {loading ? (
        <div className="rhr-loading">
          <span className="rhr-loading-spinner" />
          Carregando dados...
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="rhr-kpi-grid">
            {kpis.map(k => (
              <div key={k.label} className={`rhr-kpi-card ${k.cls}`}>
                <div className="rhr-kpi-top">
                  <span className="rhr-kpi-icon">{k.icon}</span>
                </div>
                <div className="rhr-kpi-value">{k.value}</div>
                <div className="rhr-kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="rhr-charts-grid">
            {/* Pie: by category */}
            <div className="rhr-chart-card">
              <h2 className="rhr-chart-title">Chamados por Categoria</h2>
              {byCategory.length === 0 ? (
                <p className="rhr-chart-empty">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="45%"
                      cy="50%"
                      outerRadius={95}
                      label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine
                    >
                      {byCategory.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(val: string) => <span style={{ fontSize: '0.78rem', color: '#374151' }}>{val}</span>}
                    />
                    <Tooltip formatter={(v: unknown) => [`${v} chamados`]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Horizontal bar: by status */}
            <div className="rhr-chart-card">
              <h2 className="rhr-chart-title">Distribuição por Status</h2>
              {byStatus.length === 0 ? (
                <p className="rhr-chart-empty">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={byStatus}
                    layout="vertical"
                    margin={{ top: 4, right: 40, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => [`${v} chamados`]} />
                    <Bar dataKey="value" name="Chamados" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#6b7280' }}>
                      {byStatus.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Area chart: monthly trend */}
            <div className="rhr-chart-card rhr-chart-card--wide">
              <h2 className="rhr-chart-title">Tendência Mensal (últimos 6 meses)</h2>
              {monthlyTrend.length === 0 ? (
                <p className="rhr-chart-empty">Sem dados históricos</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={monthlyTrend} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradAbertos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}    />
                      </linearGradient>
                      <linearGradient id="gradResolvidos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: unknown, name?: string) => [`${v} chamados`, name === 'abertos' ? 'Abertos' : 'Resolvidos']} />
                    <Legend formatter={(val: string) => val === 'abertos' ? 'Abertos' : 'Resolvidos'} />
                    <Area type="monotone" dataKey="abertos"    stroke="#7c3aed" strokeWidth={2} fill="url(#gradAbertos)"    dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Area type="monotone" dataKey="resolvidos" stroke="#10b981" strokeWidth={2} fill="url(#gradResolvidos)" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
