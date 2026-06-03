import { useState, useEffect } from 'react';
import api from '../services/api';
import { showToast } from '../utils/toast';

interface RecurringTicket {
  id: string; title: string; description: string; type: string;
  priority: string; department: string; category: string;
  frequency: string; day_of_week: number | null; day_of_month: number | null;
  is_active: boolean; last_created_at: string | null; created_at: string;
}

const FREQ_LABEL: Record<string, string> = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' };
const DOW_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DEPT: Record<string, string> = { ti: 'TI', administrativo: 'Administrativo', rh: 'RH' };
const PRI: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente' };

const blank = { title: '', description: '', type: 'request', priority: 'medium', department: 'ti', category: '', frequency: 'monthly', day_of_week: '', day_of_month: '' };

export default function RecurringTicketsPage() {
  const [list, setList] = useState<RecurringTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); api.get('/recurring').then(r => setList(r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      await api.post('/recurring', {
        ...form,
        day_of_week: form.frequency === 'weekly' && form.day_of_week !== '' ? Number(form.day_of_week) : null,
        day_of_month: form.frequency === 'monthly' && form.day_of_month !== '' ? Number(form.day_of_month) : null,
      });
      showToast.success('Chamado recorrente criado!');
      setShowForm(false);
      setForm({ ...blank });
      load();
    } catch { showToast.error('Erro ao criar'); }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await api.patch(`/recurring/${id}`, { is_active: !current });
    setList(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este chamado recorrente?')) return;
    await api.delete(`/recurring/${id}`);
    setList(prev => prev.filter(r => r.id !== id));
    showToast.success('Removido');
  };

  const freqDetail = (r: RecurringTicket) => {
    if (r.frequency === 'weekly' && r.day_of_week != null) return `${FREQ_LABEL.weekly} (${DOW_LABEL[r.day_of_week]})`;
    if (r.frequency === 'monthly' && r.day_of_month != null) return `${FREQ_LABEL.monthly} (dia ${r.day_of_month})`;
    return FREQ_LABEL[r.frequency] || r.frequency;
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 0 }}>Chamados Recorrentes</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Manutenções preventivas criadas automaticamente</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ padding: '0.5rem 1.25rem', background: '#007A33', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: 600 }}>
          + Nova Recorrência
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <strong>Nova Recorrência</strong>
          <input required placeholder="Título do chamado *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
          <textarea required placeholder="Descrição *" value={form.description} rows={3} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'vertical' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
              <option value="ti">TI</option>
              <option value="administrativo">Administrativo</option>
              <option value="rh">RH</option>
            </select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
            <input placeholder="Categoria" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value, day_of_week: '', day_of_month: '' }))} style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
            {form.frequency === 'weekly' && (
              <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))} style={{ padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                <option value="">Dia da semana</option>
                {DOW_LABEL.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            )}
            {form.frequency === 'monthly' && (
              <input type="number" min={1} max={28} placeholder="Dia do mês" value={form.day_of_month} onChange={e => setForm(f => ({ ...f, day_of_month: e.target.value }))} style={{ width: 130, padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={saving} style={{ padding: '0.5rem 1.25rem', background: '#007A33', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{saving ? 'Salvando...' : 'Criar'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? <p style={{ color: '#94a3b8' }}>Carregando...</p> : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔄</div>
          <p>Nenhuma recorrência configurada.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {list.map(r => (
            <div key={r.id} style={{ background: '#fff', border: `1px solid ${r.is_active ? '#e2e8f0' : '#f1f5f9'}`, borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', opacity: r.is_active ? 1 : 0.6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <strong style={{ fontSize: '0.95rem' }}>{r.title}</strong>
                  <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: '99px', background: r.is_active ? '#dcfce7' : '#f1f5f9', color: r.is_active ? '#166534' : '#64748b' }}>
                    {r.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '0.75rem' }}>
                  <span>🔁 {freqDetail(r)}</span>
                  <span>📂 {DEPT[r.department] || r.department}</span>
                  <span>⚡ {PRI[r.priority] || r.priority}</span>
                  {r.last_created_at && <span>Último: {new Date(r.last_created_at).toLocaleDateString('pt-BR')}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={() => toggleActive(r.id, r.is_active)} style={{ padding: '0.3rem 0.75rem', background: r.is_active ? '#fef3c7' : '#dcfce7', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', color: r.is_active ? '#92400e' : '#166534' }}>
                  {r.is_active ? 'Pausar' : 'Ativar'}
                </button>
                <button onClick={() => handleDelete(r.id)} style={{ padding: '0.3rem 0.75rem', background: '#fee2e2', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem', color: '#991b1b' }}>
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
