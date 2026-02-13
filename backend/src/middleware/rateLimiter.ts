import rateLimit from 'express-rate-limit';
import { config } from '../config/environment';

// Desabilitar rate limiting em desenvolvimento
const isDevelopment = config.nodeEnv === 'development';

/**
 * Rate limiter geral para todas as rotas
 * 100 requests por 15 minutos por IP
 * DESABILITADO em desenvolvimento
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 0 : 100, // 0 = ilimitado em dev
  message: 'Muitas requisições deste IP. Tente novamente em 15 minutos.',
  skip: () => isDevelopment, // Pular verificação em desenvolvimento
});

/**
 * Rate limiter estrito para rotas de autenticação
 * 5 tentativas por 15 minutos por IP
 * Aumentado para 20 em desenvolvimento
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 20 : 5, // 20 em dev, 5 em produção
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  skipSuccessfulRequests: false, // Conta mesmo requisições bem-sucedidas
});

/**
 * Rate limiter para criação de recursos
 * DESABILITADO em desenvolvimento
 */
export const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 0 : 20, // ilimitado em dev
  message: 'Muitas criações de recursos. Tente novamente em 15 minutos.',
  skip: () => isDevelopment, // Pular verificação em desenvolvimento
});

/**
 * Aumentado para 50 em desenvolvimento
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 50 : 10, // 50 em dev, 10 em produção
  message: 'Muitos uploads. Tente novamente em 15 minutos.',
});
