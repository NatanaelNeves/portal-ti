import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor - adiciona token em todas as requisições
api.interceptors.request.use((config) => {
  // Priorizar internal_token para usuários internos
  const internalToken = localStorage.getItem('internal_token');
  const token = internalToken || localStorage.getItem('token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - redireciona para login se token expirado (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Se recebeu 401 e não é a rota de login
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/login')
    ) {
      console.warn('⚠️ Token expirado ou inválido');
      
      // Limpar storage e redirecionar para login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('internal_token');
      localStorage.removeItem('internal_user');

      // Redirecionar para login
      if (window.location.pathname !== '/login-interno' && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
