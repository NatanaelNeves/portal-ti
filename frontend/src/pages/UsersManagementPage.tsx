import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import '../styles/UsersManagementPage.css';
import { BACKEND_URL } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const AVATAR_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#3B82F6', '#EF4444', '#14B8A6',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PAGE_SIZE = 10;

export default function UsersManagementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [toggleStatusConfirm, setToggleStatusConfirm] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null });
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null });
  const [formData, setFormData] = useState({ email: '', name: '', password: '', role: 'it_staff' });
  const [editFormData, setEditFormData] = useState({ email: '', name: '', role: 'it_staff' });
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const createUserInFlightRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token) { navigate('/admin/login'); return; }
    const user = localStorage.getItem('internal_user');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.role !== 'admin' && userData.role !== 'it_staff') {
        navigate('/admin/dashboard');
        return;
      }
    }
    fetchUsers(token);
  }, [navigate]);

  const fetchUsers = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/internal-auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erro ao carregar usuários');
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingUser || createUserInFlightRef.current) return;
    setFormError('');
    setFormSuccess('');
    createUserInFlightRef.current = true;
    setCreatingUser(true);
    try {
      const token = localStorage.getItem('internal_token');
      const response = await fetch(`${BACKEND_URL}/api/internal-auth/internal-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, email: formData.email.trim().toLowerCase(), name: formData.name.trim() }),
      });
      const contentType = response.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: text || 'Erro ao criar usuário' };
      }
      if (!response.ok) {
        if (response.status === 409) throw new Error(data.error || 'Já existe um usuário com este e-mail.');
        throw new Error(data.error || 'Erro ao criar usuário');
      }
      setFormSuccess(data.message || 'Usuário criado com sucesso!');
      setFormData({ email: '', name: '', password: '', role: 'it_staff' });
      setShowForm(false);
      if (token) fetchUsers(token);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar usuário');
    } finally {
      createUserInFlightRef.current = false;
      setCreatingUser(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({ email: user.email, name: user.name, role: user.role });
    setShowEditModal(true);
    setFormError('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!selectedUser) return;
    try {
      const token = localStorage.getItem('internal_token');
      const response = await fetch(`${BACKEND_URL}/api/internal-auth/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editFormData),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao atualizar usuário');
      }
      setFormSuccess('Usuário atualizado com sucesso!');
      setShowEditModal(false);
      setSelectedUser(null);
      if (token) fetchUsers(token);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao atualizar usuário');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    setToggleStatusConfirm({ isOpen: true, userId });
  };

  const confirmToggleStatus = async () => {
    if (!toggleStatusConfirm.userId) return;
    try {
      const token = localStorage.getItem('internal_token');
      const response = await fetch(`${BACKEND_URL}/api/internal-auth/users/${toggleStatusConfirm.userId}/toggle-status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao alterar status');
      }
      setFormSuccess('Status alterado com sucesso!');
      if (token) fetchUsers(token);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao alterar status');
    }
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
    setFormError('');
  };

  const handleDeleteUser = (userId: string) => {
    setDeleteUserConfirm({ isOpen: true, userId });
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserConfirm.userId) return;
    try {
      const token = localStorage.getItem('internal_token');
      const response = await fetch(`${BACKEND_URL}/api/internal-auth/users/${deleteUserConfirm.userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir usuário');
      }
      setFormSuccess('Usuário excluído com sucesso!');
      setDeleteUserConfirm({ isOpen: false, userId: null });
      if (token) fetchUsers(token);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao excluir usuário');
      setDeleteUserConfirm({ isOpen: false, userId: null });
    }
  };

  const handleSubmitPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!selectedUser) return;
    if (newPassword.length < 6) { setFormError('A senha deve ter pelo menos 6 caracteres'); return; }
    try {
      const token = localStorage.getItem('internal_token');
      const response = await fetch(`${BACKEND_URL}/api/internal-auth/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao resetar senha');
      }
      setFormSuccess('Senha resetada com sucesso!');
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (err: any) {
      setFormError(err.message || 'Erro ao resetar senha');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'it_staff': return 'Equipe de TI';
      case 'admin_staff': return 'Assistente Administrativo';
      case 'rh_staff': return 'Equipe de RH';
      case 'manager': return 'Gestor';
      default: return role;
    }
  };

  const currentUser = localStorage.getItem('internal_user');
  const currentUserData = currentUser ? JSON.parse(currentUser) : null;
  const isAdmin = currentUserData?.role === 'admin';

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = !filterRole || u.role === filterRole;
    const matchStatus = !filterStatus || (filterStatus === 'active' ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredUsers.length);
  const pagedUsers = filteredUsers.slice(pageStart, pageEnd);

  const handleFilterChange = () => { setCurrentPage(1); };

  return (
    <div className="ump-page">
      <div className="ump-container">
        {/* Header */}
        <div className="ump-header">
          <div className="ump-title">
            <i className="ti ti-users" />
            <span>Gerenciar Equipe {isAdmin ? 'Interna' : 'de TI'}</span>
          </div>
          <button className="ump-btn-new" onClick={() => setShowForm(!showForm)}>
            <i className="ti ti-user-plus" />
            {showForm ? 'Cancelar' : 'Novo Usuário'}
          </button>
        </div>

        {error && <div className="ump-alert ump-alert-error">{error}</div>}
        {formSuccess && <div className="ump-alert ump-alert-success">{formSuccess}</div>}

        {/* Create form */}
        {showForm && (
          <div className="ump-form-card">
            <h2>Criar Novo Usuário</h2>
            {formError && <div className="ump-alert ump-alert-error">{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome Completo</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Nome do usuário" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="email@empresa.com" />
              </div>
              <div className="form-group">
                <label>Senha</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="form-group">
                <label>Função</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} required>
                  <option value="it_staff">Equipe de TI</option>
                  <option value="admin_staff">Auxiliar Administrativo</option>
                  <option value="rh_staff">Equipe de RH</option>
                  {isAdmin && <option value="manager">Gestor</option>}
                  {isAdmin && <option value="admin">Administrador</option>}
                </select>
                {!isAdmin && <small className="ump-form-hint">Você pode adicionar membros da equipe de TI ou Assistente Administrativo</small>}
              </div>
              <button type="submit" className="ump-btn-submit" disabled={creatingUser}>
                {creatingUser ? 'Criando...' : 'Criar Usuário'}
              </button>
            </form>
          </div>
        )}

        {/* Search & filters */}
        <div className="ump-filters">
          <div className="ump-search-wrap">
            <i className="ti ti-search ump-search-icon" />
            <input
              className="ump-search-input"
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); handleFilterChange(); }}
            />
          </div>
          <select
            className="ump-filter-select"
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); handleFilterChange(); }}
          >
            <option value="">Todas as funções</option>
            <option value="admin">Administrador</option>
            <option value="it_staff">Equipe de TI</option>
            <option value="admin_staff">Assistente Administrativo</option>
            <option value="rh_staff">Equipe de RH</option>
            <option value="manager">Gestor</option>
          </select>
          <select
            className="ump-filter-select"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); handleFilterChange(); }}
          >
            <option value="">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="ump-loading">Carregando usuários...</div>
        ) : (
          <div className="ump-table-card">
            <table className="ump-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Função</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  {isAdmin && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {pagedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="ump-empty">Nenhum usuário encontrado</td>
                  </tr>
                ) : pagedUsers.map((user) => (
                  <tr key={user.id} className="ump-row">
                    <td>
                      <div className="ump-name-cell">
                        <span
                          className="ump-avatar"
                          style={{ background: getAvatarColor(user.name) }}
                        >
                          {getInitials(user.name)}
                        </span>
                        <span className="ump-name-text">{user.name}</span>
                      </div>
                    </td>
                    <td className="ump-email">{user.email}</td>
                    <td className="ump-role-text">{getRoleLabel(user.role)}</td>
                    <td>
                      <span className={`ump-status-badge ${user.is_active ? 'ump-status-active' : 'ump-status-inactive'}`}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="ump-date">{user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                    {isAdmin && (
                      <td>
                        <div className="ump-actions">
                          <button
                            className="ump-icon-btn"
                            onClick={() => handleEditUser(user)}
                            title="Editar usuário"
                          >
                            <i className="ti ti-pencil" />
                          </button>
                          <button
                            className="ump-icon-btn"
                            onClick={() => handleToggleStatus(user.id)}
                            title={user.is_active ? 'Desativar usuário' : 'Ativar usuário'}
                          >
                            <i className={`ti ${user.is_active ? 'ti-lock' : 'ti-lock-open'}`} />
                          </button>
                          <button
                            className="ump-icon-btn"
                            onClick={() => handleResetPassword(user)}
                            title="Redefinir senha"
                          >
                            <i className="ti ti-key" />
                          </button>
                          <div className="ump-actions-divider" />
                          <button
                            className="ump-icon-btn ump-icon-btn-danger"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Excluir usuário"
                          >
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="ump-pagination">
              <span className="ump-pagination-info">
                {filteredUsers.length === 0
                  ? 'Nenhum resultado'
                  : `Mostrando ${pageStart + 1} a ${pageEnd} de ${filteredUsers.length} usuário${filteredUsers.length !== 1 ? 's' : ''}`}
              </span>
              <div className="ump-pagination-controls">
                <button
                  className="ump-page-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <i className="ti ti-chevron-left" /> Anterior
                </button>
                <span className="ump-page-indicator">{safePage} / {totalPages}</span>
                <button
                  className="ump-page-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  Próximo <i className="ti ti-chevron-right" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedUser && (
          <div className="ump-modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="ump-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ump-modal-header">
                <h2>Editar Usuário</h2>
                <button className="ump-modal-close" onClick={() => setShowEditModal(false)}>
                  <i className="ti ti-x" />
                </button>
              </div>
              {formError && <div className="ump-alert ump-alert-error">{formError}</div>}
              <form onSubmit={handleUpdateUser}>
                <div className="form-group">
                  <label>Nome Completo</label>
                  <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Função</label>
                  <select value={editFormData.role} onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })} required>
                    <option value="it_staff">Equipe de TI</option>
                    <option value="admin_staff">Assistente Administrativo</option>
                    <option value="rh_staff">Equipe de RH</option>
                    <option value="manager">Gestor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="ump-modal-actions">
                  <button type="button" className="ump-btn-cancel" onClick={() => setShowEditModal(false)}>Cancelar</button>
                  <button type="submit" className="ump-btn-submit">Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {showPasswordModal && selectedUser && (
          <div className="ump-modal-overlay" onClick={() => setShowPasswordModal(false)}>
            <div className="ump-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ump-modal-header">
                <h2>Redefinir Senha</h2>
                <button className="ump-modal-close" onClick={() => setShowPasswordModal(false)}>
                  <i className="ti ti-x" />
                </button>
              </div>
              <p className="ump-modal-subtitle">Redefinir senha para: <strong>{selectedUser.name}</strong></p>
              {formError && <div className="ump-alert ump-alert-error">{formError}</div>}
              <form onSubmit={handleSubmitPasswordReset}>
                <div className="form-group">
                  <label>Nova Senha</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
                  <small className="ump-form-hint">A senha deve ter pelo menos 6 caracteres</small>
                </div>
                <div className="ump-modal-actions">
                  <button type="button" className="ump-btn-cancel" onClick={() => setShowPasswordModal(false)}>Cancelar</button>
                  <button type="submit" className="ump-btn-submit">Redefinir Senha</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={toggleStatusConfirm.isOpen}
        title="Alterar Status do Usuário"
        message="Tem certeza que deseja alterar o status deste usuário? Isso afetará seu acesso ao sistema."
        confirmText="Sim, alterar"
        cancelText="Cancelar"
        type="warning"
        onConfirm={confirmToggleStatus}
        onCancel={() => setToggleStatusConfirm({ isOpen: false, userId: null })}
      />

      <ConfirmDialog
        isOpen={deleteUserConfirm.isOpen}
        title="Excluir Usuário"
        message="Esta ação é permanente e não poderá ser desfeita. Deseja realmente excluir este usuário?"
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDeleteUser}
        onCancel={() => setDeleteUserConfirm({ isOpen: false, userId: null })}
      />
    </div>
  );
}
