import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

// Tipos de usuário
export enum Role {
  ADMIN = 'admin',
  TI = 'it_staff',
  COORDENADOR = 'manager',
  USER_INTERNAL = 'user_internal',
}

// Interface para o usuário autenticado
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  type: 'internal';
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * MATRIZ DE PERMISSÕES
 * Define quem pode fazer o quê no sistema
 */
export const PERMISSIONS = {
  // Chamados
  'tickets:view:all': [Role.TI, Role.COORDENADOR, Role.ADMIN],
  'tickets:update': [Role.TI, Role.ADMIN],
  'tickets:delete': [Role.ADMIN],
  'tickets:assign': [Role.TI, Role.ADMIN],
  
  // Estoque
  'inventory:view': [Role.TI, Role.ADMIN],
  'inventory:create': [Role.TI, Role.ADMIN],
  'inventory:update': [Role.TI, Role.ADMIN],
  'inventory:delete': [Role.ADMIN],
  
  // Compras
  'purchases:create': [Role.TI, Role.ADMIN],
  'purchases:approve': [Role.COORDENADOR, Role.ADMIN],
  'purchases:view': [Role.TI, Role.COORDENADOR, Role.ADMIN],
  
  // Relatórios
  'reports:view': [Role.COORDENADOR, Role.ADMIN],
  
  // Usuários
  'users:create': [Role.ADMIN],
  'users:update': [Role.ADMIN],
  'users:delete': [Role.ADMIN],
  'users:view:all': [Role.ADMIN],
  
  // Dashboard
  'dashboard:admin': [Role.ADMIN],
  'dashboard:ti': [Role.TI, Role.ADMIN],
  'dashboard:coordenador': [Role.COORDENADOR, Role.ADMIN],
} as Record<string, Role[]>;

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
    
    // Validar que é um token interno
    if (decoded.type !== 'internal') {
      res.status(401).json({ error: 'Tipo de token inválido' });
      return;
    }

    // Adicionar usuário na requisição
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role as Role,
      type: 'internal',
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

/**
 * Middleware para validar propriedade do recurso
 * Garante que usuário sem privilégios só acessa seus próprios dados
 */
export function requireOwnership(
  getOwnerId: (req: Request) => string | Promise<string>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Autenticação necessária' });
        return;
      }

      // Admin e TI podem acessar qualquer recurso
      if ([Role.ADMIN, Role.TI].includes(req.user.role)) {
        next();
        return;
      }

      const ownerId = await getOwnerId(req);
      
      if (ownerId !== req.user.id) {
        res.status(403).json({ 
          error: 'Acesso negado',
          message: 'Você só pode acessar seus próprios dados'
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao validar propriedade' });
    }
  };
}

/**
 * Helper para verificar se usuário tem papel específico
 */
export function hasRole(user: AuthenticatedUser | undefined, ...roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Helper para verificar permissão
 */
export function hasPermission(
  user: AuthenticatedUser | undefined, 
  permission: keyof typeof PERMISSIONS
): boolean {
  if (!user) return false;
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(user.role);
}
