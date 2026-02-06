import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'it_staff',
  });
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
      setUsers(data.users || []);
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
                    <td>{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
