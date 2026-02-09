import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import '../styles/InternalLoginPage.css';

export default function InternalLoginPage() {
  // const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/internal-auth/internal-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao fazer login');
      }

      const { token, user } = await response.json();

      // Limpar tokens públicos (se existir)
      localStorage.removeItem('user_token');
      localStorage.removeItem('ticket_email');

      // Store token interno
      localStorage.setItem('internal_token', token);
      localStorage.setItem('internal_user', JSON.stringify(user));

      // Redirect based on role
      if (user.role === 'it_staff') {
        window.location.href = '/admin/chamados';
      } else if (user.role === 'manager' || user.role === 'gestor') {
        window.location.href = '/gestor/dashboard';
      } else {
        window.location.href = '/admin/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="internal-login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Portal de TI</h1>
            <p>Acesso para Equipe Interna</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Sua senha"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="login-footer">
            <p>Voltando ao portal público?</p>
            <a href="/">Portal Público</a>
          </div>
        </div>
      </div>
    </div>
  );
}
