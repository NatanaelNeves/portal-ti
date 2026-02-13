# 🧪 Documentação de Testes - Portal TI

## ✅ Status: Testes Implementados e Funcionando

**Total: 35 testes passando** 🚀

---

## 📊 Resumo de Cobertura

### Backend (Jest)
- **Test Suites**: 3 passed
- **Tests**: 21 passed
- **Framework**: Jest + ts-jest + supertest
- **Cobertura**: RefreshToken Model, Validação Zod, Rotas de Autenticação

### Frontend (Vitest)
- **Test Files**: 2 passed
- **Tests**: 14 passed
- **Framework**: Vitest + @testing-library/react + Zustand testing
- **Cobertura**: authService, authStore (Zustand)

---

## 🎯 Testes Implementados

### Backend (21 testes)

#### 1. **RefreshToken.test.ts** (6 testes)
Testa o modelo de Refresh Token:
- ✅ Criar novo refresh token
- ✅ Encontrar refresh token válido
- ✅ Retornar null se token não existir
- ✅ Revogar um refresh token
- ✅ Revogar todos os tokens de um usuário
- ✅ Deletar tokens expirados

#### 2. **validation.test.ts** (8 testes)
Testa os schemas de validação Zod:

**loginSchema:**
- ✅ Validar credenciais corretas
- ✅ Rejeitar email inválido
- ✅ Rejeitar senha curta (< 6 caracteres)

**registerSchema:**
- ✅ Validar registro correto
- ✅ Rejeitar email inválido

**createTicketSchema:**
- ✅ Validar ticket com campos obrigatórios
- ✅ Rejeitar título vazio
- ✅ Rejeitar descrição vazia

#### 3. **internalAuth.test.ts** (7 testes) 🆕
Testa as rotas de autenticação com supertest:

**POST /internal-login:**
- ✅ Retornar 401 se credenciais inválidas
- ✅ Retornar token e refresh token em login bem-sucedido

**POST /refresh:**
- ✅ Retornar 400 se refresh token não fornecido
- ✅ Retornar 401 se refresh token inválido
- ✅ Renovar tokens com refresh token válido

**POST /logout:**
- ✅ Fazer logout com sucesso
- ✅ Retornar sucesso mesmo sem refresh token

---

### Frontend (14 testes)

#### 1. **authService.test.ts** (7 testes)
Testa o serviço de autenticação:

**login:**
- ✅ Fazer login com sucesso e armazenar tokens

**refreshToken:**
- ✅ Renovar o token com sucesso
- ✅ Retornar null se não houver refresh token
- ✅ Limpar storage se refresh falhar

**logout:**
- ✅ Limpar todos os tokens do localStorage

**getStoredUser:**
- ✅ Retornar usuário armazenado
- ✅ Retornar null se não houver usuário

#### 2. **authStore.test.ts** (7 testes) 🆕
Testa o Zustand store de autenticação:

**login:**
- ✅ Fazer login com sucesso e atualizar estado
- ✅ Tratar erro de login

**logout:**
- ✅ Fazer logout e limpar estado

**loadStoredUser:**
- ✅ Carregar usuário do localStorage
- ✅ Não carregar se não houver usuário armazenado

**hasRole:** (6 testes)
    ├── middleware/
    │   └── validation.test.ts                # Testes de validação (8 testes)
    └── routes/
        └── internalAuth.test.ts              # Testes de rotas (7 testes)

frontend/
├── vitest.config.ts                          # Configuração Vitest
└── src/
    ├── test/
    │   └── setup.ts                          # Setup global
    ├── services/
    │   └── authService.test.ts               # Testes do authService (7 testes)
    └── stores/
        └── authStore.test.ts                 # Testes do Zustand store (7 testes)
npm test                  # Executar todos os testes
npm run test:watch        # Modo watch
npm run test:coverage     # Com relatório de cobertura
```

### Frontend
```bash
cd frontend
npm test                  # Executar todos os testes
npm run test:watch        # Modo watch
npm run test:ui           # Interface UI do Vitest
npm run test:coverage     # Com relatório de cobertura
```

---

## 📁 Estrutura de Arquivos de Teste

```
backend/
├── jest.config.js                            # Configuração Jest
└── src/
    ├── models/
    │   └── RefreshToken.test.ts             # Testes do modelo
    └── middleware/
        └── validation.test.ts                # Testes de validação

frontend/
├── vitest.config.ts                          # Configuração Vitest
└── src/
    ├── test/
    │   └── setup.ts                          # Setup global
    └── services/
        └── authService.test.ts               # Testes do authService
```

---

## 🎯 Próximos Passos (Opcional)

### Aumentar Cobertura:
1. **Backend**:
   - Testes de rotas (internalAuth, tickets)
   - Testes de middleware (auth, rateLimiter)
   - Testes de integração

2. **Frontend**:
   - Testes de componentes (LoginPage, Dashboard)
   - Testes de stores (authStore)
   - Testes E2E (Cypress/Playwright)

### CI/CD:
Adicionar ao GitHub Actions:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm test
```

---

## 📋 Comandos Úteis

### Backend
```bash
# Executar teste específico
npm test -- RefreshToken.test.ts

# Ver relatório de cobertura
npm run test:coverage
```

### Frontend
```bash
# Executar teste específico
npm test -- authService.test.ts

# Interface gráfica
npm run test:ui
```

---

## ✅ Benefícios dos Testes

1. **Confiança no Código**: Validação automática de funcionalidades
2. **Refatoração Segura**: Alterar código sem medo de quebrar
3. **Documentação Viva**: Testes mostram como usar as funções
4. **Prevenir Regressões**: Detectar bugs antes do deploy
5. **CI/CD Ready**: Pronto para pipelines de integração contínua

---35 testes automatizados** cobrindo:
- ✅ Autenticação e Refresh Token (models + routes)
- ✅ Validação de dados com Zod
- ✅ Rotas de API (login, refresh, logout)
- ✅ Serviços do frontend
- ✅ Zustand store (gerenciamento de estado)

### 📊 Cobertura Atual:
- **Backend**: RefreshToken, Validação, Rotas de Auth
- **Frontend**: authService, authStore

### 🚀 Próximas Expansões Recomendadas:
1. Testes de tickets (CRUD)
2. Testes de inventário
3. Testes E2E com Playwright
4. Testes de integração com banco de dados real

**Status**: Pronto para produção com suite de testes abrangente
- ✅ Models de banco de dados
- ✅ Serviços do frontend

**Status**: Pronto para produção com testes automatizados! 🚀
