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

describe('createTicketSchema: notebooks para aula', () => {
  const base = {
    title: 'Notebooks para aula: 15 em 26/11',
    description: 'Pedido de 15 notebooks para aula na Sala 3.',
    type: 'request',
    priority: 'medium',
    department: 'ti',
    category: 'notebook_aula',
  };
  const details = {
    quantity: 15,
    location: 'Sala 3, turma de informática',
    sessions: [{ date: '2026-11-26', start: '14:00', end: '17:00' }],
  };

  it('aceita quantidade, local e um dia com horário', () => {
    expect(createTicketSchema.safeParse({ ...base, requestDetails: details }).success).toBe(true);
  });

  it('aceita vários dias e término em branco', () => {
    const result = createTicketSchema.safeParse({
      ...base,
      requestDetails: { ...details, sessions: [...details.sessions, { date: '2026-11-28', start: '08:00', end: '' }] },
    });
    expect(result.success).toBe(true);
  });

  it('exige quantidade, local e dia', () => {
    const result = createTicketSchema.safeParse({ ...base, requestDetails: {} });
    expect(result.success).toBe(false);
    const fields = result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
    expect(fields).toEqual(expect.arrayContaining([
      'requestDetails.quantity',
      'requestDetails.location',
      'requestDetails.sessions',
    ]));
  });

  it('recusa término antes do início', () => {
    const result = createTicketSchema.safeParse({
      ...base,
      requestDetails: { ...details, sessions: [{ date: '2026-11-26', start: '14:00', end: '13:00' }] },
    });
    expect(result.success).toBe(false);
  });
});
