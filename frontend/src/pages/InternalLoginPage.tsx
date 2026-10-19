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
        <div className="ilogin__top">
          <a href="/" className="pub-brand ilogin__home">
            <span className="pub-brand__mark" aria-hidden="true" />
            <span className="pub-brand__copy">
              <strong>Portal de Serviços</strong>
              <small>O Pequeno Nazareno</small>
            </span>
          </a>
          <a href="/" className="ilogin__exit">
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Voltar ao portal
          </a>
        </div>

        <div className="ilogin__intro">
          <h1>Acesso só para as equipes</h1>
          <p>Esta entrada é de quem atende os pedidos: TI, RH, Administrativo e coordenação.</p>
        </div>

        {/* Quem chega aqui por engano quase sempre queria pedir ajuda: o
            caminho certo vem antes do formulário, e sem login. */}
        <aside className="ilogin__visitor" aria-labelledby="ilogin-visitor-title">
          <h2 id="ilogin-visitor-title">Veio pedir ajuda? Você não precisa entrar.</h2>
          <p>Para abrir ou acompanhar um chamado, basta o seu e-mail. Não existe senha para isso.</p>
          <div className="ilogin__visitor-actions">
            <a href="/abrir-chamado" className="pub-btn ilogin__visitor-main">
              <i className="ti ti-message-plus" aria-hidden="true" />
              Abrir um chamado
            </a>
            <a href="/meus-chamados" className="pub-btn ilogin__visitor-alt">
              Acompanhar meus chamados
            </a>
          </div>
        </aside>
      </section>

      <section className="ilogin__form-wrap">
        <form onSubmit={handleSubmit} className="ilogin__form">
          <h2>
            <i className="ti ti-lock" aria-hidden="true" />
            Entrar como equipe
          </h2>
          <p className="ilogin__form-lead">Use o e-mail e a senha da conta que a TI criou para você atender os chamados.</p>

          {error && (
            <div className="pub-alert" role="alert">
              <i className="ti ti-alert-circle" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="pub-field">
            <label htmlFor="email">E-mail da equipe</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nome@opequenonazareno.org.br"
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

          <p className="ilogin__help">Esqueceu a senha ou ainda não tem conta? Fale com a TI.</p>
        </form>
      </section>
    </div>
  );
}
