import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware genérico para validação de requisições com Zod
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

/**
 * Schemas de validação para Tickets
 */

export const createTicketSchema = z.object({
  title: z.string()
    .min(5, 'Título deve ter no mínimo 5 caracteres')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  
  description: z.string()
    .min(10, 'Descrição deve ter no mínimo 10 caracteres')
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres'),
  
  type: z.enum(['incident', 'request', 'change', 'problem'], {
    message: 'Tipo inválido'
  }),
  
  priority: z.enum(['low', 'medium', 'high'], {
    message: 'Prioridade inválida'
  }),
});

export const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_user', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assigned_to_id: z.string().uuid().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido',
});

export const addMessageSchema = z.object({
  message: z.string()
    .min(1, 'Mensagem não pode estar vazia')
    .max(2000, 'Mensagem deve ter no máximo 2000 caracteres'),
  
  is_internal: z.boolean().default(false),
});

/**
 * Schemas de validação para Autenticação
 */

export const loginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  
  password: z.string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha muito longa'),
});

export const registerSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  
  name: z.string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(255, 'Nome muito longo'),
  
  password: z.string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha muito longa'),
  
  role: z.enum(['admin', 'it_staff', 'manager', 'user']).optional(),
});

export const publicAccessSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  
  name: z.string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(255, 'Nome muito longo'),
});

/**
 * Schemas de validação para Inventário
 */

export const createEquipmentSchema = z.object({
  internal_code: z.string()
    .min(1, 'Código interno é obrigatório')
    .max(50, 'Código muito longo'),
  
  type: z.string()
    .min(1, 'Tipo é obrigatório')
    .max(100, 'Tipo muito longo'),
  
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  serial_number: z.string().max(100).optional(),
  physical_condition: z.string().max(50).optional(),
  current_status: z.enum(['in_stock', 'in_use', 'maintenance', 'retired']).optional(),
  current_location: z.string().max(255).optional(),
  acquisition_date: z.string().optional(), // ISO date string
  warranty_expiration: z.string().optional(), // ISO date string
});

export const createTermSchema = z.object({
  equipment_id: z.string().uuid('ID de equipamento inválido'),
  responsible_name: z.string().min(2, 'Nome do responsável é obrigatório'),
  responsible_cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
  responsible_position: z.string().optional(),
  responsible_department: z.string().optional(),
  equipment_details: z.object({
    code: z.string(),
    brand: z.string().optional(),
    model: z.string().optional(),
    serial_number: z.string().optional(),
  }),
  accessories: z.array(z.string()).optional(),
  lgpd_consent: z.boolean().refine((val) => val === true, {
    message: 'Consentimento LGPD é obrigatório',
  }),
});

/**
 * Schemas de validação para Compras
 */

export const createPurchaseSchema = z.object({
  description: z.string()
    .min(5, 'Descrição deve ter no mínimo 5 caracteres')
    .max(500, 'Descrição muito longa'),
  
  quantity: z.number()
    .int('Quantidade deve ser um número inteiro')
    .positive('Quantidade deve ser positiva'),
  
  estimated_value: z.number()
    .nonnegative('Valor não pode ser negativo')
    .optional(),
  
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

/**
 * Schemas de validação para Usuários
 */

export const createUserSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  
  name: z.string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(255, 'Nome muito longo'),
  
  password: z.string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha muito longa'),
  
  role: z.enum(['admin', 'it_staff', 'manager', 'user']),
});

export const updateUserSchema = z.object({
  email: z.string().email('Email inválido').max(255).optional(),
  name: z.string().min(2).max(255).optional(),
  role: z.enum(['admin', 'it_staff', 'manager', 'user']).optional(),
  password: z.string().min(6).max(100).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido',
});

// Tipos TypeScript derivados dos schemas
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type AddMessageInput = z.infer<typeof addMessageSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PublicAccessInput = z.infer<typeof publicAccessSchema>;
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type CreateTermInput = z.infer<typeof createTermSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
