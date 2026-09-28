import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import { showToast } from '../utils/toast';
import { BACKEND_URL } from '../services/api';
import '../styles/UsersManagementPage.css';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

type Modal = null | 'create' | 'edit' | 'password';

// O que cada perfil vê: explicado na hora de criar ou editar.
const ROLES: Array<{ value: string; label: string; short: string; desc: string; tone: string; adminOnly?: boolean }> = [
  { value: 'it_staff', label: 'Equipe de TI', short: 'TI', desc: 'Atende chamados de TI e cuida de inventário, documentos e central de dúvidas.', tone: 'ti' },
  { value: 'admin_staff', label: 'Auxiliar administrativo', short: 'Administrativo', desc: 'Atende os chamados do Administrativo.', tone: 'adm' },
  { value: 'rh_staff', label: 'Equipe de RH', short: 'RH', desc: 'Atende os chamados do RH na área própria do RH.', tone: 'rh' },
  { value: 'manager', label: 'Gestão', short: 'Gestão', desc: 'Acompanha painéis, solicitações e relatórios.', tone: 'info', adminOnly: true },
  { value: 'admin', label: 'Administrador', short: 'Administrador', desc: 'Acesso total, inclusive gerenciar a equipe.', tone: 'admin', adminOnly: true },
];

const roleMeta = (role?: string) => ROLES.find((r) => r.value === role) ?? { value: role ?? '', label: role || 'Sem perfil', short: role || 'Sem perfil', desc: '', tone: 'muted' };

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function UsersManagementPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('internal_token');
  const me = (() => { try { return JSON.parse(localStorage.getItem('internal_user') || 'null'); } catch { return null; } })() as { id?: string; role?: string } | null;
  const isAdmin = me?.role === 'admin';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'it_staff' });
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [confirm, setConfirm] = useState<null | { kind: 'toggle' | 'delete'; user: User }>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    if (me?.role !== 'admin' && me?.role !== 'it_staff') { navigate('/admin/dashboard'); return; }
    void fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const headers = (json = false): Record<string, string> => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`,
  });

  const readError = async (res: Response, fallback: string) => {
    const data = await res.json().catch(() => ({}));
    return (data as { error?: string }).error || fallback;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/internal-auth/users`, { headers: headers() });
      if (!res.ok) throw new Error(await readError(res, 'Não foi possível carregar a equipe.'));
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users || []);
      setError('');
    } catch (err: any) {
      setError(err instanceof TypeError ? 'Sem conexão com o servidor.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', role: 'it_staff' });
    setFormError('');
    setModal('create');
  };

  const openEdit = (user: User) => {
    setSelected(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setFormError('');
    setModal('edit');
  };

  const openPassword = (user: User) => {
    setSelected(user);
    setNewPassword('');
    setFormError('');
    setModal('password');
  };

  const closeModal = () => { setModal(null); setSelected(null); setFormError(''); };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFormError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/internal-auth/internal-register`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ ...form, email: form.email.trim().toLowerCase(), name: form.name.trim() }),
      });
      if (!res.ok) {
        throw new Error(res.status === 409 ? 'Já existe alguém com este e-mail.' : await readError(res, 'Não foi possível criar o acesso.'));
      }
      showToast.success(`Acesso criado para ${form.name.trim().split(' ')[0]}.`);
      closeModal();
      void fetchUsers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setFormError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/internal-auth/users/${selected.id}`, {
        method: 'PUT',
        headers: headers(true),
        body: JSON.stringify({ name: form.name, email: form.email, role: form.role }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Não foi possível salvar.'));
      showToast.success('Dados atualizados.');
      closeModal();
      void fetchUsers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (newPassword.length < 6) { setFormError('A senha precisa ter pelo menos 6 caracteres.'); return; }
    setBusy(true);
    setFormError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/internal-auth/users/${selected.id}/reset-password`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Não foi possível redefinir a senha.'));
      showToast.success(`Senha de ${selected.name.split(' ')[0]} redefinida.`);
      closeModal();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, user } = confirm;
    setConfirm(null);
    try {
      const res = kind === 'toggle'
        ? await fetch(`${BACKEND_URL}/api/internal-auth/users/${user.id}/toggle-status`, { method: 'PATCH', headers: headers() })
        : await fetch(`${BACKEND_URL}/api/internal-auth/users/${user.id}`, { method: 'DELETE', headers: headers() });
      if (!res.ok) throw new Error(await readError(res, kind === 'toggle' ? 'Não foi possível alterar o acesso.' : 'Não foi possível excluir.'));
      showToast.success(kind === 'toggle'
        ? `${user.name.split(' ')[0]} ${user.is_active ? 'não consegue mais entrar' : 'pode entrar de novo'}.`
        : `${user.name} saiu da equipe.`);
      void fetchUsers();
    } catch (err: any) {
      showToast.error(err.message);
    }
  };

  const active = users.filter((u) => u.is_active).length;
  const countRole = (role: string) => users.filter((u) => u.role === role).length;
  const allowedRoles = ROLES.filter((r) => isAdmin || !r.adminOnly);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    return (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      && (!roleFilter || u.role === roleFilter)
      && (statusFilter === 'all' || (statusFilter === 'active' ? u.is_active : !u.is_active));
  }).sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name, 'pt-BR'));

  const roleField = (
    <fieldset className="ump-roles">
      <legend>O que a pessoa faz</legend>
      {allowedRoles.map((r) => (
        <label key={r.value} className={`ump-role ump-role--${r.tone} ${form.role === r.value ? 'is-on' : ''}`}>
          <input type="radio" name="ump-role" value={r.value} checked={form.role === r.value} onChange={() => setForm({ ...form, role: r.value })} />
          <span>
            <strong>{r.label}</strong>
            <small>{r.desc}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );

  return (
    <div className="tpg ump">
      <header className="tpg-hero pub-aurora">
        <div className="tpg-hero__top">
          <div className="tpg-hero__title">
            <span className="pub-gicon pub-gicon--rh" aria-hidden="true"><i className="ti ti-users" /></span>
            <div>
              <h1>Equipe</h1>
              <p>Quem acessa a área interna e o que cada pessoa pode fazer.</p>
            </div>
          </div>
          <div className="tpg-hero__actions">
            <button type="button" className="tpg-btn tpg-btn--sun" onClick={openCreate}>
              <i className="ti ti-user-plus" aria-hidden="true" />Novo acesso
            </button>
          </div>
        </div>

        <ul className="tpg-stats" aria-label="Resumo">
          <li className="tpg-stat"><strong>{active}</strong>com acesso</li>
          {users.length - active > 0 && <li className="tpg-stat"><strong>{users.length - active}</strong>desativados</li>}
          {ROLES.map((r) => countRole(r.value) > 0 && (
            <li key={r.value} className="tpg-stat"><strong>{countRole(r.value)}</strong>{r.short}</li>
          ))}
        </ul>

        <div className="tpg-hero__tools">
          <label className="tpg-search">
            <i className="ti ti-search" aria-hidden="true" />
            <span className="pub-sr-only">Buscar pessoas</span>
            <input type="search" placeholder="Buscar por nome ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button type="button" className="tpg-search__clear" aria-label="Limpar busca" onClick={() => setSearch('')}><i className="ti ti-x" aria-hidden="true" /></button>
            )}
          </label>
        </div>
      </header>

      {error && (
        <div className="tpg-alert" role="alert">
          <i className="ti ti-alert-circle" aria-hidden="true" /><span>{error}</span>
          <button type="button" onClick={() => void fetchUsers()} aria-label="Tentar de novo"><i className="ti ti-refresh" aria-hidden="true" /></button>
        </div>
      )}

      <div className="tpg-toolbar">
        <div className="tpg-chips" style={{ marginTop: 0 }}>
          <button type="button" className="tpg-chip" aria-pressed={!roleFilter} onClick={() => setRoleFilter('')}>Todos<span className="tpg-chip__count">{users.length}</span></button>
          {ROLES.filter((r) => countRole(r.value) > 0).map((r) => (
            <button key={r.value} type="button" className="tpg-chip" aria-pressed={roleFilter === r.value} onClick={() => setRoleFilter(roleFilter === r.value ? '' : r.value)}>
              <span className={`ump-dot ump-dot--${r.tone}`} aria-hidden="true" />{r.short}
              <span className="tpg-chip__count">{countRole(r.value)}</span>
            </button>
          ))}
        </div>
        <div className="tpg-seg" role="group" aria-label="Acesso">
          <button type="button" aria-pressed={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Todos</button>
          <button type="button" aria-pressed={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>Com acesso</button>
          <button type="button" aria-pressed={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')}>Desativados</button>
        </div>
      </div>

      <section className="tpg-card tpg-section">
        <header className="tpg-section__head">
          <h2>Pessoas</h2>
          <span className="tpg-count">{filtered.length} de {users.length}</span>
        </header>

        {loading ? (
          <div style={{ padding: '0 20px 20px', display: 'grid', gap: 10 }}>{[0, 1, 2].map((n) => <div key={n} className="tpg-skeleton" style={{ height: 58 }} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="tpg-empty">
            <span className="pub-gicon pub-gicon--neutral" aria-hidden="true"><i className="ti ti-user-search" /></span>
            <h3>{users.length === 0 ? 'Ninguém cadastrado' : 'Ninguém com esses filtros'}</h3>
            <p>{users.length === 0 ? 'Crie o primeiro acesso da equipe.' : 'Tente outro nome, perfil ou situação.'}</p>
          </div>
        ) : (
          <ul className="tpg-rows">
            {filtered.map((u) => {
              const r = roleMeta(u.role);
              const isMe = u.id === me?.id;
              return (
                <li key={u.id} className={`tpg-row ump-row ${u.is_active ? '' : 'is-off'}`}>
                  <span className={`tpg-avatar ump-avatar--${r.tone}`} aria-hidden="true">{initialsOf(u.name)}</span>
                  <span className="ump-row__who">
                    <strong>{u.name}{isMe && <span className="ump-me">você</span>}</strong>
                    <span>{u.email}</span>
                  </span>
                  <span className={`tpg-badge tpg-badge--${r.tone}`}>{r.label}</span>
                  {isAdmin && !isMe ? (
                    <button
                      type="button"
                      className={`ump-status ${u.is_active ? 'is-on' : ''}`}
                      onClick={() => setConfirm({ kind: 'toggle', user: u })}
                      title={u.is_active ? 'Desativar acesso' : 'Reativar acesso'}
                    >
                      {u.is_active ? 'Com acesso' : 'Desativado'}
                    </button>
                  ) : (
                    <span className={`ump-status ${u.is_active ? 'is-on' : ''}`}>{u.is_active ? 'Com acesso' : 'Desativado'}</span>
                  )}
                  <span className="ump-row__date" title="Criado em">{u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}</span>
                  <div className="ump-row__actions">
                    {isAdmin && (
                      <>
                        <button type="button" className="tpg-icon-btn" onClick={() => openEdit(u)} title="Editar" aria-label={`Editar ${u.name}`}><i className="ti ti-pencil" aria-hidden="true" /></button>
                        <button type="button" className="tpg-icon-btn" onClick={() => openPassword(u)} title="Redefinir senha" aria-label={`Redefinir senha de ${u.name}`}><i className="ti ti-key" aria-hidden="true" /></button>
                        {!isMe && (
                          <button type="button" className="tpg-icon-btn tpg-icon-btn--danger" onClick={() => setConfirm({ kind: 'delete', user: u })} title="Excluir" aria-label={`Excluir ${u.name}`}><i className="ti ti-trash" aria-hidden="true" /></button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {modal && (
        <div className="tpg-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="tpg-modal__box" role="dialog" aria-modal="true" aria-labelledby="ump-modal-title">
            <header className="tpg-modal__head">
              <div>
                <h2 id="ump-modal-title">
                  {modal === 'create' ? 'Novo acesso' : modal === 'edit' ? `Editar ${selected?.name.split(' ')[0]}` : 'Redefinir senha'}
                </h2>
                <p>
                  {modal === 'create' ? 'A pessoa entra em /admin/login com este e-mail e senha.'
                    : modal === 'edit' ? 'Mudar o perfil muda o que a pessoa vê ao entrar.'
                      : `Nova senha para ${selected?.name}. Avise a pessoa por um canal seguro.`}
                </p>
              </div>
              <button type="button" className="tpg-icon-btn" onClick={closeModal} aria-label="Fechar"><i className="ti ti-x" aria-hidden="true" /></button>
            </header>

            {formError && <div className="tpg-alert" role="alert" style={{ marginTop: 0, marginBottom: 14 }}><i className="ti ti-alert-circle" aria-hidden="true" /><span>{formError}</span></div>}

            {modal === 'password' ? (
              <form className="tpg-form" onSubmit={(e) => void submitPassword(e)}>
                <label className="tpg-field">
                  <span>Nova senha</span>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required autoFocus autoComplete="new-password" />
                  <small>Pelo menos 6 caracteres.</small>
                </label>
                <div className="tpg-form__actions">
                  <button type="button" className="tpg-btn" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="tpg-btn tpg-btn--primary" disabled={busy}>{busy ? 'Salvando…' : 'Redefinir senha'}</button>
                </div>
              </form>
            ) : (
              <form className="tpg-form" onSubmit={(e) => void (modal === 'create' ? submitCreate(e) : submitEdit(e))}>
                <div className="tpg-form__row">
                  <label className="tpg-field">
                    <span>Nome completo</span>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
                  </label>
                  <label className="tpg-field">
                    <span>E-mail</span>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="off" />
                  </label>
                </div>
                {modal === 'create' && (
                  <label className="tpg-field">
                    <span>Senha inicial</span>
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required autoComplete="new-password" />
                    <small>Pelo menos 6 caracteres.</small>
                  </label>
                )}
                {roleField}
                <div className="tpg-form__actions">
                  <button type="button" className="tpg-btn" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="tpg-btn tpg-btn--primary" disabled={busy}>
                    {busy ? 'Salvando…' : modal === 'create' ? 'Criar acesso' : 'Salvar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirm !== null}
        title={confirm?.kind === 'delete' ? `Excluir ${confirm.user.name}?` : confirm?.user.is_active ? `Desativar o acesso de ${confirm?.user.name}?` : `Reativar o acesso de ${confirm?.user.name}?`}
        message={confirm?.kind === 'delete'
          ? 'A pessoa sai da equipe de vez. Para só bloquear a entrada, use Desativar.'
          : confirm?.user.is_active
            ? 'A pessoa não consegue mais entrar, mas o histórico dela continua. Dá para reativar depois.'
            : 'A pessoa volta a conseguir entrar com a senha atual.'}
        confirmText={confirm?.kind === 'delete' ? 'Excluir' : confirm?.user.is_active ? 'Desativar' : 'Reativar'}
        cancelText="Cancelar"
        type={confirm?.kind === 'delete' ? 'danger' : 'warning'}
        onConfirm={() => void runConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
