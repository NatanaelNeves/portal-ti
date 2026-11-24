import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { AuthUser, UserRole } from '../types/enums';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * MATRIZ DE PERMISSÕES
 * Define quem pode fazer o quê no sistema
 */
export const PERMISSIONS = {
  // Chamados
  'tickets:view:all': [UserRole.IT_STAFF, UserRole.ADMIN_STAFF, UserRole.MANAGER, UserRole.ADMIN],
  'tickets:update': [UserRole.IT_STAFF, UserRole.ADMIN_STAFF, UserRole.ADMIN],
  'tickets:delete': [UserRole.ADMIN],
  'tickets:assign': [UserRole.IT_STAFF, UserRole.ADMIN_STAFF, UserRole.ADMIN],
  
  // Estoque
  'inventory:view': [UserRole.IT_STAFF, UserRole.ADMIN],
  'inventory:create': [UserRole.IT_STAFF, UserRole.ADMIN],
  'inventory:update': [UserRole.IT_STAFF, UserRole.ADMIN],
  'inventory:delete': [UserRole.ADMIN],
  
  // Compras
  'purchases:create': [UserRole.IT_STAFF, UserRole.ADMIN],
  'purchases:approve': [UserRole.MANAGER, UserRole.ADMIN],
  'purchases:view': [UserRole.IT_STAFF, UserRole.MANAGER, UserRole.ADMIN],
  
  // Relatórios
  'reports:view': [UserRole.MANAGER, UserRole.ADMIN],
  
  // Usuários
  'users:create': [UserRole.ADMIN],
  'users:update': [UserRole.ADMIN],
  'users:delete': [UserRole.ADMIN],
  'users:view:all': [UserRole.ADMIN],
  
  // Dashboard
  'dashboard:admin': [UserRole.ADMIN],
  'dashboard:ti': [UserRole.IT_STAFF, UserRole.ADMIN],
  'dashboard:administrativo': [UserRole.ADMIN_STAFF, UserRole.ADMIN],
  'dashboard:coordenador': [UserRole.MANAGER, UserRole.ADMIN],

} as Record<string, UserRole[]>;

/**
 * Middleware de autenticação
 * Valida o token JWT e extrai o usuário
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, config.jwt.secret as string) as any;
    
    // Adicionar usuário na requisição
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role as UserRole,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

/**
 * Middleware de autorização
 * Verifica se o usuário tem permissão para a ação
 */
export function authorize(...permissions: (keyof typeof PERMISSIONS)[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    // Verificar permissões
    const hasPermission = permissions.some(permission => {
      const allowedRoles = PERMISSIONS[permission];
      return allowedRoles.includes(req.user!.role);
    });

    if (!hasPermission) {
      res.status(403).json({ 
        error: 'Acesso negado',
        message: 'Você não tem permissão para executar esta ação'
      });
      return;
    }

    next();
  };
}
