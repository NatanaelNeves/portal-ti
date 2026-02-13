import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import '../styles/UsersManagementPage.css';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

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
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'it_staff',
  });
  const [editFormData, setEditFormData] = useState({
    email: '',
    name: '',
    role: 'it_staff',
  });
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const user = localStorage.getItem('internal_user');
    if (user) {
      const userData = JSON.parse(user);
      // Apenas Admin e TI podem gerenciar usuários
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
      const response = await fetch('/api/internal-auth/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar usuários');
      }

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
    setFormError('');
    setFormSuccess('');

    try {
      const token = localStorage.getItem('internal_token');
      const response = await fetch('/api/internal-auth/internal-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      setFormSuccess('Usuário criado com sucesso!');
      setFormData({ email: '', name: '', password: '', role: 'it_staff' });
      setShowForm(false);
      
      // Recarregar lista de usuários
      if (token) fetchUsers(token);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar usuário');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      email: user.email,
      name: user.name,
      role: user.role,
    });
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
      const response = await fetch(`/api/internal-auth/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      const response = await fetch(`/api/internal-auth/users/${toggleStatusConfirm.userId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  const handleSubmitPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedUser) return;

    if (newPassword.length < 6) {
      setFormError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      const token = localStorage.getItem('internal_token');
      const response = await fetch(`/api/internal-auth/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      case 'admin':
        return 'Administrador';
      case 'it_staff':
        return 'Equipe de TI';
      case 'manager':
        return 'Gestor';
      default:
        return role;
    }
  };

  const currentUser = localStorage.getItem('internal_user');
  const currentUserData = currentUser ? JSON.parse(currentUser) : null;
  const isAdmin = currentUserData?.role === 'admin';

  return (
    <div className="users-management-page">
      <div className="page-container">
        <div className="page-header">
          <h1>Gerenciar Equipe {isAdmin ? 'Interna' : 'de TI'}</h1>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancelar' : '+ Novo Usuário'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {formSuccess && <div className="alert alert-success">{formSuccess}</div>}

        {showForm && (
          <div className="user-form-card">
            <h2>Criar Novo Usuário</h2>
            {formError && <div className="alert alert-error">{formError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="Nome do usuário"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  placeholder="email@empresa.com"
                />
              </div>

              <div className="form-group">
                <label>Senha</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="form-group">
                <label>Função</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  required
                >
                  <option value="it_staff">Equipe de TI</option>
                  {isAdmin && <option value="manager">Gestor</option>}
                  {isAdmin && <option value="admin">Administrador</option>}
                </select>
                {!isAdmin && (
                  <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                    💡 Você pode adicionar apenas membros da equipe de TI
                  </small>
                )}
              </div>

              <button type="submit" className="btn btn-primary">
                Criar Usuário
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading">Carregando usuários...</div>
        ) : (
          <div className="users-table">
            <table>
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
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          user.is_active ? 'status-active' : 'status-inactive'
                        }`}
                      >
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>{user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                    {isAdmin && (
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-action btn-edit"
                            onClick={() => handleEditUser(user)}
                            title="Editar usuário"
                          >
                            ✏️
                          </button>
                          <button
                            className={`btn-action ${user.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                            onClick={() => handleToggleStatus(user.id)}
                            title={user.is_active ? 'Desativar usuário' : 'Ativar usuário'}
                          >
                            {user.is_active ? '🔒' : '🔓'}
                          </button>
                          <button
                            className="btn-action btn-password"
                            onClick={() => handleResetPassword(user)}
                            title="Resetar senha"
                          >
                            🔑
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal de Edição */}
        {showEditModal && selectedUser && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Editar Usuário</h2>
                <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
              </div>
              
              {formError && <div className="alert alert-error">{formError}</div>}

              <form onSubmit={handleUpdateUser}>
                <div className="form-group">
                  <label>Nome Completo</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Função</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    required
                  >
                    <option value="it_staff">Equipe de TI</option>
                    <option value="manager">Gestor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Reset de Senha */}
        {showPasswordModal && selectedUser && (
          <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Resetar Senha</h2>
                <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
              </div>
              
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Resetar senha para: <strong>{selectedUser.name}</strong>
              </p>

              {formError && <div className="alert alert-error">{formError}</div>}

              <form onSubmit={handleSubmitPasswordReset}>
                <div className="form-group">
                  <label>Nova Senha</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                    A senha deve ter pelo menos 6 caracteres
                  </small>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Resetar Senha
                  </button>
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
    </div>
  );
}
