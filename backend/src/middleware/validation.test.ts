import { loginSchema, registerSchema, createTicketSchema } from './validation';

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('deve validar credenciais corretas', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar email inválido', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar senha curta', () => {
      const invalidData = {
        email: 'user@example.com',
        password: '12345', // menos de 6 caracteres
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('deve validar registro correto', () => {
      const validData = {
        email: 'newuser@example.com',
        name: 'João Silva',
        password: 'password123',
        role: 'it_staff',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar email inválido', () => {
      const invalidData = {
        email: 'invalid-email',
        name: 'João Silva',
        password: 'password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createTicketSchema', () => {
    it('deve validar ticket com campos obrigatórios', () => {
      const validData = {
        title: 'Problema no computador',
        description: 'O computador não liga e preciso de ajuda urgente',
        type: 'incident',
        priority: 'high',
      };

      const result = createTicketSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar título vazio', () => {
      const invalidData = {
        title: '',
        description: 'Descrição válida do problema aqui',
        type: 'incident',
        priority: 'medium',
      };

      const result = createTicketSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar descrição vazia', () => {
      const invalidData = {
        title: 'Título válido',
        description: '',
        type: 'request',
        priority: 'low',
      };

      const result = createTicketSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
