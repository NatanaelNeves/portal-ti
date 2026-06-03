import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../services/api';
import api from '../services/api';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved';
  created_at: string;
  resolved_at?: string;
}

const SEVERITY_LABEL: Record<string, string> = { low: 'Baixo', medium: 'Médio', high: 'Alto', critical: 'Crítico' };
const SEVERITY_COLOR: Record<string, string> = { low: '#059669', medium: '#d97706', high: '#dc2626', critical: '#7c3aed' };

export default function StatusPage() {
  const [operational, setOperational] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin management state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/status`)
      .then(r => r.json())
      .then(data => {
        setOperational(data.operational);
        setIncidents(data.incidents || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const raw = localStorage.getItem('internal_user');
    if (raw) {
      const user = JSON.parse(raw);
      setIsAdmin(['admin', 'it_staff'].includes(user.role));
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/status/incidents', form);
      const res = await fetch(`${BACKEND_URL}/api/status`);
      const data = await res.json();
      setOperational(data.operational);
      setIncidents(data.incidents || []);
      setForm({ title: '', description: '', severity: 'medium' });
      setShowForm(false);
    } catch { /* */ }
    setSubmitting(false);
  };

  const handleResolve = async (id: string) => {
    await api.patch(`/status/incidents/${id}/resolve`);
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'resolved', resolved_at: new Date().toISOString() } : i));
    setOperational(incidents.filter(i => i.id !== id && i.status === 'active').length === 0);
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/status/incidents/${id}`);
    const updated = incidents.filter(i => i.id !== id);
    setIncidents(updated);
    setOperational(updated.filter(i => i.status === 'active').length === 0);
  };

  const active = incidents.filter(i => i.status === 'active');
  const resolved = incidents.filter(i => i.status === 'resolved');

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem' }}>Status do Sistema</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Portal de Serviços Internos — O Pequeno Nazareno</p>

      {/* Status banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem',
        background: operational ? '#dcfce7' : '#fee2e2',
        border: `1px solid ${operational ? '#86efac' : '#fca5a5'}`,
      }}>
        <span style={{ fontSize: '1.4rem' }}>{operational ? '✅' : '🔴'}</span>
        <div>
          <strong style={{ color: operational ? '#166534' : '#991b1b' }}>
            {operational ? 'Todos os sistemas operacionais' : 'Incidente em andamento'}
          </strong>
          <p style={{ margin: 0, fontSize: '0.85rem', color: operational ? '#15803d' : '#b91c1c' }}>
            {operational ? 'Nenhum problema identificado no momento.' : `${active.length} incidente${active.length > 1 ? 's' : ''} ativo${active.length > 1 ? 's' : ''}.`}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(s => !s)}
            style={{ marginLeft: 'auto', padding: '0.4rem 1rem', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}
          >
            + Declarar Incidente
          </button>
        )}
      </div>

      {/* Form para novo incidente */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <strong>Novo Incidente</strong>
          <input
            placeholder="Título do incidente *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          />
          <textarea
            placeholder="Descrição (opcional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'vertical' }}
          />
          <select
            value={form.severity}
            onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          >
            <option value="low">Baixo</option>
            <option value="medium">Médio</option>
            <option value="high">Alto</option>
            <option value="critical">Crítico</option>
          </select>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.25rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {submitting ? 'Salvando...' : 'Publicar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1.25rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading && <p style={{ color: '#94a3b8' }}>Carregando...</p>}

      {/* Incidentes ativos */}
      {active.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#dc2626' }}>Incidentes Ativos</h2>
          {active.map(inc => (
            <div key={inc.id} style={{ background: '#fff', border: '1px solid #fca5a5', borderLeft: `4px solid ${SEVERITY_COLOR[inc.severity]}`, borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <strong>{inc.title}</strong>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '99px', background: SEVERITY_COLOR[inc.severity], color: '#fff' }}>
                  {SEVERITY_LABEL[inc.severity]}
                </span>
              </div>
              {inc.description && <p style={{ margin: '0 0 0.5rem', color: '#64748b', fontSize: '0.85rem' }}>{inc.description}</p>}
              <small style={{ color: '#94a3b8' }}>Iniciado em {new Date(inc.created_at).toLocaleString('pt-BR')}</small>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button onClick={() => handleResolve(inc.id)} style={{ padding: '3px 10px', background: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Resolver</button>
                  <button onClick={() => handleDelete(inc.id)} style={{ padding: '3px 10px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Remover</button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Histórico resolvidos */}
      {resolved.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#374151' }}>Histórico</h2>
          {resolved.map(inc => (
            <div key={inc.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>{inc.title}</span>
                {inc.resolved_at && <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem' }}>Resolvido em {new Date(inc.resolved_at).toLocaleString('pt-BR')}</small>}
              </div>
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '99px', background: '#dcfce7', color: '#166534' }}>Resolvido</span>
            </div>
          ))}
        </section>
      )}

      {!loading && incidents.length === 0 && (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Nenhum incidente registrado.</p>
      )}
    </div>
  );
}
