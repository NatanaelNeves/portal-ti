import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../services/api';
import '../styles/InternalLoginPage.css';

export default function InternalLoginPage() {
  // const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/internal-auth/internal-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao fazer login');
      }

      const { token, refreshToken, user } = await response.json();

      // Limpar tokens públicos (se existir)
      localStorage.removeItem('user_token');
      localStorage.removeItem('ticket_email');

      // Store token interno e refresh token
      localStorage.setItem('internal_token', token);
      localStorage.setItem('internal_user', JSON.stringify(user));
      
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      // Redirect based on role
      if (user.role === 'it_staff') {
        window.location.href = '/admin/chamados';
      } else if (user.role === 'admin_staff') {
        window.location.href = '/admin/auxiliar/dashboard';
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
    <div className="pub-page ilogin pub-aurora">
      <section className="ilogin__brand">
        <a href="/" className="pub-brand ilogin__home">
          <span className="pub-brand__mark" aria-hidden="true" />
          <span className="pub-brand__copy">
            <strong>Portal de Serviços</strong>
            <small>O Pequeno Nazareno</small>
          </span>
        </a>
        <div className="ilogin__intro">
          <h1>Área da equipe</h1>
          <p>Onde a TI, o RH e o Administrativo atendem os pedidos da instituição.</p>
          <ul className="ilogin__features">
            <li>
              <span className="pub-gicon"><i className="ti ti-ticket" aria-hidden="true" /></span>
              <span><strong>Fila de chamados</strong>Priorize, atenda e responda</span>
            </li>
            <li>
              <span className="pub-gicon pub-gicon--administrativo"><i className="ti ti-packages" aria-hidden="true" /></span>
              <span><strong>Inventário</strong>Equipamentos e termos de responsabilidade</span>
            </li>
            <li>
              <span className="pub-gicon pub-gicon--rh"><i className="ti ti-chart-bar" aria-hidden="true" /></span>
              <span><strong>Relatórios</strong>Volume, prazos e qualidade do atendimento</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="ilogin__form-wrap">
        <form onSubmit={handleSubmit} className="ilogin__form">
          <h2>Entrar</h2>
          <p className="ilogin__form-lead">Use o e-mail e a senha da sua conta da equipe.</p>

          {error && (
            <div className="pub-alert" role="alert">
              <i className="ti ti-alert-circle" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="pub-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nome@exemplo.com"
            />
          </div>

          <div className="pub-field">
            <label htmlFor="password">Senha</label>
            <div className="ilogin__password">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="ilogin__reveal"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          <button type="submit" className="pub-btn pub-btn--primary pub-btn--block" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <a href="/" className="ilogin__back">
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Voltar ao portal
          </a>
        </form>
      </section>
    </div>
  );
}
