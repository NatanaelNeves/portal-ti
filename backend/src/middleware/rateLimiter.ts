import rateLimit from 'express-rate-limit';
import { config } from '../config/environment';

// Desabilitar rate limiting em desenvolvimento
const isDevelopment = config.nodeEnv === 'development';

// Custom key generator to handle Azure proxy IP:PORT format
const keyGenerator = (req: any): string => {
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  // Strip port if present (e.g., "168.232.86.116:53501" -> "168.232.86.116")
  return ip.replace(/:\d+$/, '');
};

// Disable express-rate-limit built-in validations (incompatible with Azure proxy)
const validate = false as any;

/**
 * Rate limiter geral para todas as rotas
 * 100 requests por 15 minutos por IP
 * DESABILITADO em desenvolvimento
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 0 : 100,
  message: 'Muitas requisições deste IP. Tente novamente em 15 minutos.',
  skip: () => isDevelopment,
  keyGenerator,
  validate,
});

/**
 * Rate limiter estrito para rotas de autenticação
 * 5 tentativas por 15 minutos por IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 20 : 5,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  skipSuccessfulRequests: false,
  keyGenerator,
  validate,
});

/**
 * Rate limiter para criação de recursos
 */
export const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 0 : 20,
  message: 'Muitas criações de recursos. Tente novamente em 15 minutos.',
  skip: () => isDevelopment,
  keyGenerator,
  validate,
});

/**
 * Rate limiter para uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 50 : 10,
  message: 'Muitos uploads. Tente novamente em 15 minutos.',
  keyGenerator,
  validate,
});

/**
 * Rate limiter dedicado para endpoints de polling (ex: /tickets/new-since)
 * Limita por IP+token para não compartilhar cota entre usuários no mesmo proxy.
 * 300 requests por 15 minutos (suficiente para 1 req/30s por ~150 abas)
 */
export const pollingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 0 : 300,
  message: 'Muitas requisições de polling. Tente novamente em instantes.',
  skip: () => isDevelopment,
  // Key = IP + bearer token so each authenticated user gets their own bucket
  keyGenerator: (req: any): string => {
    const ip = (req.ip || '127.0.0.1').replace(/:\d+$/, '');
    const auth = (req.headers?.authorization || '').slice(-16); // last 16 chars of token
    return `${ip}:${auth}`;
  },
  validate,
});
