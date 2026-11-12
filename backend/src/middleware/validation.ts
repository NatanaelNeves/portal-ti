import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { RH_CATEGORY_SCHEMAS } from '../config/ticketCategories';

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

const MAX_METADATA_BYTES = 10 * 1024;

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

  department: z.enum(['ti', 'administrativo', 'rh'], {
    message: 'Departamento inválido'
  }).default('ti'),

  category: z.string().max(100, 'Categoria muito longa').optional(),
  requestDetails: z.record(z.string(), z.any()).optional(),
}).superRefine((data, ctx) => {
  if (data.requestDetails) {
    const raw = JSON.stringify(data.requestDetails ?? {});
    if (Buffer.byteLength(raw, 'utf8') > MAX_METADATA_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requestDetails'],
        message: 'Detalhes excedem o limite de 10KB',
      });
    }
  }

  if (data.category && RH_CATEGORY_SCHEMAS[data.category]) {
    const schema = RH_CATEGORY_SCHEMAS[data.category];
    const details = data.requestDetails ?? {};

    schema.required.forEach((field) => {
      const value = (details as Record<string, unknown>)[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['requestDetails', field],
          message: 'Campo obrigatório',
        });
      }
    });

    if (data.category === 'RH_PONTO') {
      const adjustments = (details as Record<string, unknown>).adjustments;

      if (Array.isArray(adjustments) && adjustments.length > 0) {
        adjustments.forEach((adjustment, index) => {
          const adjustmentObject = adjustment as Record<string, unknown>;
          const date = typeof adjustmentObject.date === 'string' ? adjustmentObject.date.trim() : '';
          const correctedTime = typeof adjustmentObject.correctedTime === 'string' ? adjustmentObject.correctedTime.trim() : '';

          if (!date) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['requestDetails', 'adjustments', index, 'date'],
              message: 'Campo obrigatório',
            });
          }

          if (!correctedTime) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['requestDetails', 'adjustments', index, 'correctedTime'],
              message: 'Campo obrigatório',
            });
          }
        });
      }
    }
  }
});

export const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_user', 'aguardando_confirmacao', 'aguardando_aquisicao', 'aguardando_terceiros', 'resolved', 'closed']).optional(),
  // Motivo da espera — só faz sentido nos dois estados pausados.
  pause_reason: z.string().trim().max(280).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assigned_to_id: z.string().uuid().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido',
});

export const confirmResolutionSchema = z.object({
  resolved: z.boolean(),
  reopen_reason: z.string().max(2000, 'Justificativa deve ter no máximo 2000 caracteres').optional(),
}).superRefine((data, ctx) => {
  if (data.resolved === false && (!data.reopen_reason || data.reopen_reason.trim().length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reopen_reason'],
      message: 'Informe uma justificativa com pelo menos 10 caracteres',
    });
  }
});

export const closeByRequesterSchema = z.object({
  reason: z.enum(['self_resolved', 'not_needed']),
  note: z.string().trim().max(500, 'Comentário deve ter no máximo 500 caracteres').optional(),
});

// Encaminhar um chamado aberto para a equipe errada.
export const forwardTicketSchema = z.object({
  department: z.enum(['ti', 'administrativo', 'rh'], { message: 'Equipe inválida' }),
  category: z.string().trim().max(100, 'Assunto muito longo').optional(),
  note: z.string().trim().max(500, 'Observação deve ter no máximo 500 caracteres').optional(),
});

export const ticketRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000, 'Comentário deve ter no máximo 2000 caracteres').optional(),
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
  
  role: z.enum(['admin', 'it_staff', 'admin_staff', 'rh_staff', 'manager', 'user']).optional(),
});

export const publicAccessSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  
  name: z.string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(255, 'Nome muito longo'),
});
