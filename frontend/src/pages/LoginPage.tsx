import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import '../styles/LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, isLoading } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.email, formData.name, formData.password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao processar requisição');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Portal de Serviços de TI</h1>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required={!isLogin}
              />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={isLoading} className="submit-btn">
            {isLoading ? 'Processando...' : isLogin ? 'Entrar' : 'Registrar'}
          </button>
        </form>
        <p className="toggle-auth">
          {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setFormData({ email: '', password: '', name: '' });
            }}
            className="toggle-btn"
          >
            {isLogin ? 'Registre-se' : 'Faça login'}
          </button>
        </p>
      </div>
    </div>
  );
}
